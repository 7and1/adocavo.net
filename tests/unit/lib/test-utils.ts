import { vi } from "vitest";

export interface MockD1Database {
  prepare: ReturnType<typeof vi.fn>;
  batch: ReturnType<typeof vi.fn>;
  exec: ReturnType<typeof vi.fn>;
}

export interface MockAi {
  run: ReturnType<typeof vi.fn>;
}

export function createMockD1Database(): MockD1Database {
  return {
    prepare: vi.fn(),
    batch: vi.fn(),
    exec: vi.fn(),
  };
}

export function createMockAi(): MockAi {
  return {
    run: vi.fn(),
  };
}

export function createMockEnv(partial = {}): {
  DB: D1Database;
  AI: Ai;
  NEXTAUTH_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  NEXTAUTH_URL: string;
} {
  return {
    DB: partial.DB ?? (createMockD1Database() as unknown as D1Database),
    AI: partial.AI ?? (createMockAi() as unknown as Ai),
    NEXTAUTH_SECRET: "test-secret",
    GOOGLE_CLIENT_ID: "test-google-client-id",
    GOOGLE_CLIENT_SECRET: "test-google-secret",
    GITHUB_CLIENT_ID: "test-github-client-id",
    GITHUB_CLIENT_SECRET: "test-github-secret",
    NEXTAUTH_URL: "http://localhost:3000",
  };
}

export function createMockUser(overrides = {}) {
  return {
    id: "test-user-id",
    name: "Test User",
    email: "test@example.com",
    emailVerified: new Date(),
    image: "https://example.com/avatar.jpg",
    role: "user",
    credits: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockHook(overrides = {}) {
  return {
    id: "hook-1",
    text: "Stop scrolling if you have acne",
    category: "beauty",
    engagementScore: 9500,
    source: "tiktok",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockGeneratedScript(overrides = {}) {
  return {
    id: "gen-1",
    userId: "test-user-id",
    hookId: "hook-1",
    productDescription: "Salicylic acid cleanser for oily skin",
    scripts: [
      {
        angle: "Pain Point",
        script: "[Visual: Close-up of frustrated face]",
      },
      {
        angle: "Benefit",
        script: "[Visual: Glowing skin selfie]",
      },
      {
        angle: "Social Proof",
        script: "[Visual: TikTok comment screenshots]",
      },
    ],
    createdAt: new Date(),
    ...overrides,
  };
}

export function createMockSession(overrides = {}) {
  return {
    user: createMockUser(overrides),
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

export class MockDatabase {
  private data: Map<string, any[]> = new Map();
  private inserts: Map<string, any[]> = new Map();
  private updates: Map<string, any[]> = new Map();
  private deletes: Map<string, any[]> = new Map();

  constructor(initialData: Record<string, any[]> = {}) {
    for (const [table, rows] of Object.entries(initialData)) {
      this.data.set(table, rows);
    }
  }

  query(table: string) {
    return {
      findFirst: async (where?: any) => {
        const rows = this.data.get(table) ?? [];
        if (!where) return rows[0] ?? null;
        return rows[0] ?? null;
      },
      findMany: async () => {
        return this.data.get(table) ?? [];
      },
    };
  }

  insert(table: string) {
    return {
      values: (data: any) => {
        const rows = this.data.get(table) ?? [];
        rows.push(data);
        this.data.set(table, rows);
        const inserts = this.inserts.get(table) ?? [];
        inserts.push(data);
        this.inserts.set(table, inserts);
        return this;
      },
      onConflictDoUpdate: () => ({
        target: () => ({
          set: () => this,
        }),
      }),
    };
  }

  update(table: string) {
    return {
      set: (data: any) => ({
        where: () => ({
          returning: async () => {
            const rows = this.data.get(table) ?? [];
            const updates = this.updates.get(table) ?? [];
            updates.push(data);
            this.updates.set(table, updates);
            return rows;
          },
        }),
      }),
    };
  }

  delete(table: string) {
    return {
      where: async () => {
        const deletes = this.deletes.get(table) ?? [];
        deletes.push(true);
        this.deletes.set(table, deletes);
        return true;
      },
    };
  }

  select() {
    return {
      from: () => ({
        where: () => ({
          groupBy: () => ({
            orderBy: () => ({
              limit: () => this.createQueryResult(),
              get: async () => this.createQueryResult()[0],
            }),
          }),
        }),
      }),
    };
  }

  private createQueryResult() {
    return [];
  }

  getInserts(table: string) {
    return this.inserts.get(table) ?? [];
  }

  getUpdates(table: string) {
    return this.updates.get(table) ?? [];
  }

  getDeletes(table: string) {
    return this.deletes.get(table) ?? [];
  }

  setTable(table: string, rows: any[]) {
    this.data.set(table, rows);
  }

  getTable(table: string) {
    return this.data.get(table) ?? [];
  }
}
