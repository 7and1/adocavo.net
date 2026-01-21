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

  async generate(
    hookId: string,
    productDescription: string,
    remixTone?: string,
    remixInstruction?: string,
    turnstileToken?: string,
  ) {
    return this.fetch<{
      scripts: Array<{ angle: string; script: string }>;
      creditsRemaining: number;
      generationId: string;
    }>("/api/generate", {
      method: "POST",
      body: JSON.stringify({
        hookId,
        productDescription,
        remixTone,
        remixInstruction,
        turnstileToken,
      }),
    });
  }

  async regenerate(generationId: string, angle: string) {
    return this.fetch<{
      script: { angle: string; script: string };
      creditsRemaining: number;
    }>(`/api/scripts/${generationId}/regenerate`, {
      method: "POST",
      body: JSON.stringify({ angle }),
    });
  }

  async rateScript(
    generationId: string,
    payload: {
      scriptIndex: number;
      rating: number;
      isHelpful?: boolean;
      feedback?: string;
    },
  ) {
    return this.fetch<{ id: string }>(`/api/scripts/${generationId}/rate`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async getScriptRating(generationId: string, scriptIndex: number) {
    return this.fetch<{
      averageRating: number;
      totalRatings: number;
      helpfulCount: number;
      scriptIndexStats: Array<{
        scriptIndex: number;
        averageRating: number;
        count: number;
      }>;
      userRating: { rating: number; isHelpful: boolean } | null;
    }>(`/api/scripts/${generationId}/rate?scriptIndex=${scriptIndex}`);
  }

  async listFavorites() {
    return this.fetch<{ favorites: Array<{ generatedScriptId: string }> }>(
      "/api/scripts/favorites",
    );
  }

  async addFavorite(generatedScriptId: string) {
    return this.fetch<{ id: string }>("/api/scripts/favorites", {
      method: "POST",
      body: JSON.stringify({ generatedScriptId }),
    });
  }

  async removeFavorite(generatedScriptId: string) {
    return this.fetch<{ success: boolean }>("/api/scripts/favorites", {
      method: "DELETE",
      body: JSON.stringify({ generatedScriptId }),
    });
  }

  async analyzeUrl(url: string, turnstileToken?: string) {
    return this.fetch<{
      id: string;
      tiktokUrl: string;
      title?: string | null;
      author?: string | null;
      transcript: string;
      transcriptSource: string;
      hook: string;
      structure: Array<{ label: string; summary: string }>;
      template: Array<{ label: string; script: string }>;
      cta?: string;
      notes?: string[];
      createdAt: string;
    }>("/api/analyze", {
      method: "POST",
      body: JSON.stringify({ url, turnstileToken }),
    });
  }

  async analyzeProductUrl(url: string) {
    return this.fetch<{
      title: string;
      description: string;
      price?: string;
      imageUrl?: string;
      source: string;
      formatted: string;
      aiAnalysis?: string;
    }>("/api/analyze-product", {
      method: "POST",
      body: JSON.stringify({ url }),
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
