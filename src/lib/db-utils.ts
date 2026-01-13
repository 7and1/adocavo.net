import { type Database } from "./db";

const QUERY_TIMEOUT_MS = 5000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 100;

export interface QueryOptions {
  timeout?: number;
  retries?: number;
}

export class DatabaseError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: unknown,
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}

export class QueryTimeoutError extends DatabaseError {
  constructor(operation: string, timeout: number) {
    super(
      `Database query timeout: ${operation} exceeded ${timeout}ms`,
      "QUERY_TIMEOUT",
    );
    this.name = "QueryTimeoutError";
  }
}

export class CircuitBreakerOpenError extends DatabaseError {
  constructor() {
    super(
      "Database circuit breaker is open. Too many recent failures.",
      "CIRCUIT_BREAKER_OPEN",
    );
    this.name = "CircuitBreakerOpenError";
  }
}

interface CircuitBreakerState {
  failureCount: number;
  lastFailureTime: number;
  isOpen: boolean;
}

const circuitBreaker: CircuitBreakerState = {
  failureCount: 0,
  lastFailureTime: 0,
  isOpen: false,
};

const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_RESET_MS = 60000; // 1 minute

function checkCircuitBreaker(): void {
  const now = Date.now();

  if (circuitBreaker.isOpen) {
    if (now - circuitBreaker.lastFailureTime > CIRCUIT_BREAKER_RESET_MS) {
      circuitBreaker.isOpen = false;
      circuitBreaker.failureCount = 0;
    } else {
      throw new CircuitBreakerOpenError();
    }
  }
}

function recordFailure(): void {
  circuitBreaker.failureCount++;
  circuitBreaker.lastFailureTime = Date.now();

  if (circuitBreaker.failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
    circuitBreaker.isOpen = true;
  }
}

function recordSuccess(): void {
  circuitBreaker.failureCount = Math.max(0, circuitBreaker.failureCount - 1);
}

/**
 * Wraps a database query with timeout, retry logic, and circuit breaker
 */
export async function withDbQuery<T>(
  operation: string,
  queryFn: () => Promise<T>,
  options: QueryOptions = {},
): Promise<T> {
  const timeout = options.timeout ?? QUERY_TIMEOUT_MS;
  const maxRetries = options.retries ?? MAX_RETRIES;
  let lastError: unknown;

  checkCircuitBreaker();

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await Promise.race([
        queryFn(),
        timeoutPromise<T>(timeout, operation, timeout),
      ]);

      recordSuccess();
      return result;
    } catch (error) {
      lastError = error;

      if (error instanceof CircuitBreakerOpenError) {
        throw error;
      }

      if (attempt < maxRetries) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
        continue;
      }

      recordFailure();

      if (error instanceof QueryTimeoutError) {
        throw error;
      }

      throw new DatabaseError(
        `Database query failed: ${operation}`,
        "QUERY_FAILED",
        error,
      );
    }
  }

  throw new DatabaseError(
    `Database query failed after ${maxRetries} retries: ${operation}`,
    "QUERY_RETRIES_EXCEEDED",
    lastError,
  );
}

function timeoutPromise<T>(
  ms: number,
  operation: string,
  timeout: number,
): Promise<T> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new QueryTimeoutError(operation, timeout));
    }, ms);
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Batch query executor for parallel operations with rate limit awareness
 */
export async function batchQuery<T>(
  items: T[],
  queryFn: (item: T) => Promise<unknown>,
  options: { batchSize?: number; delayMs?: number } = {},
): Promise<void> {
  const { batchSize = 10, delayMs = 50 } = options;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(queryFn));

    if (i + batchSize < items.length) {
      await sleep(delayMs);
    }
  }
}

/**
 * Paginated query helper to prevent large result sets
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export async function paginatedQuery<T>(
  queryFn: (limit: number, offset: number) => Promise<T[]>,
  countFn: () => Promise<number>,
  page: number,
  limit: number,
): Promise<PaginatedResult<T>> {
  const validatedLimit = Math.min(Math.max(1, limit), 100);
  const validatedPage = Math.max(1, page);
  const offset = (validatedPage - 1) * validatedLimit;

  const [items, totalResult] = await Promise.all([
    queryFn(validatedLimit, offset),
    countFn(),
  ]);

  const total =
    typeof totalResult === "number" ? totalResult : Number(totalResult);

  return {
    items,
    total,
    page: validatedPage,
    limit: validatedLimit,
    hasMore: offset + items.length < total,
  };
}

/**
 * Transaction wrapper with timeout
 */
export async function withTransaction<T>(
  db: Database,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callback: (tx: any) => Promise<T>,
  options: QueryOptions = {},
): Promise<T> {
  return withDbQuery("transaction", () => db.transaction(callback), options);
}
