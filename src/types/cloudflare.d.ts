interface D1Database {
  prepare: (query: string) => D1PreparedStatement;
}

interface D1PreparedStatement {
  bind: (...values: unknown[]) => D1PreparedStatement;
  all: <T = unknown>() => Promise<{ results: T[] }>;
  first: <T = unknown>() => Promise<T | null>;
  run: () => Promise<{ success: boolean; meta: unknown }>;
}

interface Ai {
  run: (
    model: string,
    input: Record<string, unknown>,
  ) => Promise<{
    response?: string;
    result?: unknown;
    [key: string]: unknown;
  }>;
}

interface KVNamespace {
  get(key: string): Promise<string | null>;
  get(key: string, type: "text"): Promise<string | null>;
  get(key: string, type: "json"): Promise<unknown | null>;
  get(key: string, type: "arrayBuffer"): Promise<ArrayBuffer | null>;
  get(key: string, type: "stream"): Promise<ReadableStream | null>;
  put(
    key: string,
    value: string | ReadableStream | ArrayBuffer,
    options?: {
      expiration?: number;
      expirationTtl?: number;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void>;
  delete(key: string | string[]): Promise<void>;
  list(options?: {
    cursor?: string;
    limit?: number;
    prefix?: string;
  }): Promise<{
    keys: Array<{ name: string }>;
    list_complete: boolean;
    cursor?: string;
  }>;
}

interface R2Bucket {
  put: (
    key: string,
    value: ArrayBuffer | Uint8Array | ReadableStream | string,
    options?: {
      httpMetadata?: { contentType?: string };
      customMetadata?: Record<string, string>;
    },
  ) => Promise<void>;
  get: (key: string) => Promise<unknown>;
  delete: (keys: string[] | string) => Promise<void>;
  list: (options?: {
    prefix?: string;
    cursor?: string;
    limit?: number;
  }) => Promise<{
    objects: Array<{ key: string; uploaded?: Date }>;
    truncated: boolean;
    cursor?: string;
  }>;
}

interface ScheduledEvent {
  scheduledTime: number;
  cron: string;
}

interface ExecutionContext {
  waitUntil: (promise: Promise<unknown>) => void;
}
