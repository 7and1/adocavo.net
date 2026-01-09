export class APIClient {
  constructor(private readonly baseUrl = "") {}

  async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!data.success) {
      throw new ClientAPIError(
        data.error?.code ?? "UNKNOWN_ERROR",
        data.error?.message ?? "Request failed",
        response.status,
        data.error?.details,
      );
    }

    return data.data as T;
  }

  async generate(hookId: string, productDescription: string) {
    return this.fetch<{
      scripts: Array<{ angle: string; script: string }>;
      creditsRemaining: number;
    }>("/api/generate", {
      method: "POST",
      body: JSON.stringify({ hookId, productDescription }),
    });
  }
}

export class ClientAPIError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ClientAPIError";
  }

  get isCreditsError() {
    return this.code === "INSUFFICIENT_CREDITS";
  }

  get isAuthError() {
    return this.statusCode === 401 || this.statusCode === 403;
  }

  get isRateLimit() {
    return this.code === "RATE_LIMIT_EXCEEDED";
  }
}

export const api = new APIClient();
