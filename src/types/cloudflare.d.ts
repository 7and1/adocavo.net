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
