/**
 * Timeout utilities for external API calls and database operations.
 * Provides circuit breaker pattern for resilience.
 */

export class TimeoutError extends Error {
  constructor(
    message: string,
    public readonly timeout: number,
  ) {
    super(message);
    this.name = "TimeoutError";
  }
}

/**
 * Wraps a promise with a timeout.
 * Throws TimeoutError if the promise doesn't resolve within the specified time.
 *
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout in milliseconds (default: 5000ms)
 * @param operation - Name of the operation for error messages
 * @returns The promise result or throws TimeoutError
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 5000,
  operation: string = "operation",
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => {
      reject(
        new TimeoutError(
          `${operation} timed out after ${timeoutMs}ms`,
          timeoutMs,
        ),
      );
    }, timeoutMs);

    // Clear timer when promise completes
    promise.finally(() => clearTimeout(timer));
  });

  return Promise.race([promise, timeoutPromise]);
}

/**
 * Circuit breaker states for external service resilience.
 */
enum CircuitState {
  CLOSED = "closed", // Normal operation
  OPEN = "open", // Failing, reject requests immediately
  HALF_OPEN = "half_open", // Testing if service has recovered
}

interface CircuitBreakerOptions {
  failureThreshold: number; // Failures before opening circuit
  resetTimeoutMs: number; // Time to wait before trying again
  monitoringPeriodMs: number; // Time window to count failures
}

/**
 * Circuit breaker for external service calls.
 * Prevents cascading failures by stopping calls to failing services.
 */
export class CircuitBreaker {
  private state = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;

  constructor(private options: CircuitBreakerOptions) {}

  /**
   * Execute an operation through the circuit breaker.
   * Throws error immediately if circuit is open.
   */
  async execute<T>(
    operation: () => Promise<T>,
    timeoutMs: number = 5000,
  ): Promise<T> {
    // Check if circuit should reset
    if (this.state === CircuitState.OPEN) {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure > this.options.resetTimeoutMs) {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      } else {
        throw new Error(
          `Circuit breaker is OPEN. Last failure: ${new Date(this.lastFailureTime).toISOString()}`,
        );
      }
    }

    try {
      // Execute with timeout
      const result = await withTimeout(
        operation(),
        timeoutMs,
        "circuit-breaker-operation",
      );

      // Success: reset failure count if in half-open state
      if (this.state === CircuitState.HALF_OPEN) {
        this.successCount++;
        if (this.successCount >= 2) {
          // Need 2 consecutive successes to close circuit
          this.state = CircuitState.CLOSED;
          this.failureCount = 0;
        }
      } else if (this.state === CircuitState.CLOSED) {
        this.failureCount = 0; // Reset on success
      }

      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      // Check if we should open the circuit
      if (this.failureCount >= this.options.failureThreshold) {
        this.state = CircuitState.OPEN;
        console.error(
          `Circuit breaker OPEN after ${this.failureCount} failures`,
        );
      }

      throw error;
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getFailureCount(): number {
    return this.failureCount;
  }

  /** Manually reset the circuit breaker (useful for testing or recovery) */
  reset() {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.successCount = 0;
  }
}

/**
 * Default circuit breaker for database operations.
 * Opens after 3 failures, resets after 30 seconds.
 */
export const dbCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeoutMs: 30000,
  monitoringPeriodMs: 60000,
});

/**
 * Default circuit breaker for AI operations.
 * Opens after 2 failures, resets after 60 seconds.
 */
export const aiCircuitBreaker = new CircuitBreaker({
  failureThreshold: 2,
  resetTimeoutMs: 60000,
  monitoringPeriodMs: 120000,
});

/**
 * Wraps a database operation with timeout and circuit breaker.
 * Use for any database query that could hang or fail.
 */
export async function withDbProtection<T>(
  operation: () => Promise<T>,
  timeoutMs: number = 5000,
): Promise<T> {
  return dbCircuitBreaker.execute(operation, timeoutMs);
}

/**
 * Wraps an AI operation with timeout and circuit breaker.
 * Use for any AI API call that could hang or fail.
 */
export async function withAiProtection<T>(
  operation: () => Promise<T>,
  timeoutMs: number = 30000, // AI calls need more time
): Promise<T> {
  return aiCircuitBreaker.execute(operation, timeoutMs);
}
