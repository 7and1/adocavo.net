import { afterAll, beforeAll, describe, expect } from "vitest";
import { migrate } from "drizzle-orm/d1/migrator";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "@/lib/schema";
import { eq, sql, desc } from "drizzle-orm";
import type { NextAuthConfig } from "next-auth";

// In-memory storage for all tables
interface DatabaseStore {
  users: any[];
  accounts: any[];
  sessions: any[];
  rateLimits: any[];
  hooks: any[];
  generatedScripts: any[];
  scriptRatings: any[];
  favorites: any[];
  waitlistEntries: any[];
  hookReviewQueue: any[];
}

// Global store for all tests
let globalStore: DatabaseStore = {
  users: [],
  accounts: [],
  sessions: [],
  rateLimits: [],
  hooks: [],
  generatedScripts: [],
  scriptRatings: [],
  favorites: [],
  waitlistEntries: [],
  hookReviewQueue: [],
};

// Mock prepared statement
class MockPreparedStatement {
  private statement: any;

  constructor(
    private query: string,
    statement: any,
  ) {
    this.statement = statement;
  }

  bind(params: Record<string, any>): this {
    this.statement = this.statement.bind(params);
    return this;
  }

  async first(): Promise<any> {
    const results = await this.statement.all();
    return results[0] || null;
  }

  async run(): Promise<any> {
    const results = await this.statement.all();
    return {
      success: true,
      result: results[0] || null,
      results,
      meta: {},
    };
  }

  async all(): Promise<any[]> {
    return this.statement.all();
  }

  async raw(): Promise<any[]> {
    return this.all();
  }
}

// Mock D1 database that implements the proper interface
class MockD1Database {
  private statements: Map<string, any> = new Map();

  prepare(query: string): MockPreparedStatement {
    console.log("MockD1Database.prepare called with query:", query);

    // Determine table type from query
    let tableName = "unknown";
    let statement: any;

    // Handle CREATE TABLE separately as they don't fit the pattern
    if (query.includes("CREATE TABLE") || query.includes("CREATE INDEX")) {
      statement = new MockSelectStatement("unknown");
    } else {
      // Case-insensitive search and handle different quote styles
      const queryUpper = query.toUpperCase();

      if (queryUpper.includes("SELECT")) {
        const tableMatch = query.match(/FROM\s+["'`]?(\w+)["'`]?/i);
        tableName = tableMatch?.[1] || "unknown";
        statement = new MockSelectStatement(tableName);
      } else if (queryUpper.includes("INSERT")) {
        const tableMatch = query.match(/INTO\s+["'`]?(\w+)["'`]?/i);
        tableName = tableMatch?.[1] || "unknown";
        statement = new MockInsertStatement(tableName);
      } else if (queryUpper.includes("UPDATE")) {
        const tableMatch = query.match(/UPDATE\s+["'`]?(\w+)["'`]?/i);
        tableName = tableMatch?.[1] || "unknown";
        statement = new MockUpdateStatement(tableName);
      } else if (queryUpper.includes("DELETE")) {
        const tableMatch = query.match(/FROM\s+["'`]?(\w+)["'`]?/i);
        tableName = tableMatch?.[1] || "unknown";
        statement = new MockDeleteStatement(tableName);
      } else {
        statement = new MockSelectStatement("unknown"); // Default to select to avoid undefined errors
      }
    }

    this.statements.set(query, statement);
    return new MockPreparedStatement(query, statement);
  }

  batch(statements: any[]): Promise<any[]> {
    return Promise.all(statements.map((stmt) => stmt.run()));
  }

  async exec(queries: string | string[]): Promise<void> {
    // No-op for exec in mock
  }
}

// Mock statement classes
class MockSelectStatement {
  private conditions: any[] = [];
  private orderBy: any[] = [];
  private limitValue: number | null = null;
  private offsetValue: number | null = null;

  constructor(private tableName: string) {}

  bind(params: Record<string, any>): this {
    // Bind parameters to conditions if they exist
    for (let i = 0; i < this.conditions.length; i++) {
      if (
        this.conditions[i].value &&
        typeof this.conditions[i].value === "object" &&
        this.conditions[i].value.$bind
      ) {
        this.conditions[i].value = params[this.conditions[i].value.$bind];
      }
    }
    return this;
  }

  where(condition: any): this {
    this.conditions.push(condition);
    return this;
  }

  orderBy(field: any, direction?: "asc" | "desc"): this {
    this.orderBy.push({ field, direction: direction || "asc" });
    return this;
  }

  limit(limit: number): this {
    this.limitValue = limit;
    return this;
  }

  offset(offset: number): this {
    this.offsetValue = offset;
    return this;
  }

  async all(): Promise<any[]> {
    let data = globalStore[this.tableName as keyof DatabaseStore] || [];

    // Apply WHERE conditions
    if (this.conditions.length > 0) {
      data = data.filter((record: any) => {
        return this.conditions.every((condition: any) => {
          if (condition.table && condition.field) {
            // Drizzle ORM condition
            return record[condition.field] === condition.value;
          } else if (typeof condition === "function") {
            // Custom condition
            return condition(record);
          } else if (condition.left && condition.right) {
            // Binary operation
            return record[condition.left.field] === condition.right.value;
          }
          return true;
        });
      });
    }

    // Apply ORDER BY
    if (this.orderBy.length > 0) {
      data = [...data].sort((a: any, b: any) => {
        for (const order of this.orderBy) {
          const aValue = a[order.field];
          const bValue = b[order.field];

          if (aValue < bValue) return order.direction === "asc" ? -1 : 1;
          if (aValue > bValue) return order.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    // Apply LIMIT and OFFSET
    if (this.offsetValue) {
      data = data.slice(this.offsetValue);
    }
    if (this.limitValue) {
      data = data.slice(0, this.limitValue);
    }

    return data;
  }

  async first(): Promise<any> {
    const results = await this.all();
    return results[0] || null;
  }
}

class MockInsertStatement {
  private values: any[] = [];

  constructor(private tableName: string) {}

  bind(params: Record<string, any>): this {
    // Bind parameters to values
    for (let i = 0; i < this.values.length; i++) {
      for (const key in this.values[i]) {
        if (
          typeof this.values[i][key] === "object" &&
          this.values[i][key].$bind
        ) {
          this.values[i][key] = params[this.values[i][key].$bind];
        }
      }
    }
    return this;
  }

  values(values: any): this {
    if (Array.isArray(values)) {
      this.values = values;
    } else {
      this.values = [values];
    }
    return this;
  }

  async all(): Promise<any[]> {
    const tableData = globalStore[this.tableName as keyof DatabaseStore] || [];
    const results: any[] = [];

    for (const value of this.values) {
      // Apply defaults
      const record = {
        id: value.id || `${this.tableName}-${Date.now()}-${Math.random()}`,
        createdAt: value.createdAt || new Date(),
        updatedAt: value.updatedAt || new Date(),
        ...value,
      };

      // Add to table
      tableData.push(record);
      results.push(record);
    }

    globalStore[this.tableName as keyof DatabaseStore] = tableData;

    return results;
  }
}

class MockUpdateStatement {
  private setValues: any = {};
  private conditions: any[] = [];

  constructor(private tableName: string) {}

  bind(params: Record<string, any>): this {
    // Bind parameters to conditions and set values
    for (let i = 0; i < this.conditions.length; i++) {
      if (
        this.conditions[i].value &&
        typeof this.conditions[i].value === "object" &&
        this.conditions[i].value.$bind
      ) {
        this.conditions[i].value = params[this.conditions[i].value.$bind];
      }
    }
    for (const key in this.setValues) {
      if (
        typeof this.setValues[key] === "object" &&
        this.setValues[key].$bind
      ) {
        this.setValues[key] = params[this.setValues[key].$bind];
      }
    }
    return this;
  }

  set(values: any): this {
    this.setValues = values;
    return this;
  }

  where(condition: any): this {
    this.conditions.push(condition);
    return this;
  }

  async all(): Promise<any[]> {
    const tableData = globalStore[this.tableName as keyof DatabaseStore] || [];
    const updated: any[] = [];

    for (const record of tableData) {
      // Apply conditions
      let matches = true;
      if (this.conditions.length > 0) {
        matches = this.conditions.every((condition: any) => {
          if (condition.field) {
            return record[condition.field] === condition.value;
          }
          return true;
        });
      }

      if (matches) {
        // Create a new record instead of mutating
        const newRecord = {
          ...record,
          ...this.setValues,
          updatedAt: new Date(),
        };

        // Find and update in array
        const index = tableData.findIndex((r) => r.id === record.id);
        if (index !== -1) {
          tableData[index] = newRecord;
          updated.push(newRecord);
        }
      }
    }

    globalStore[this.tableName as keyof DatabaseStore] = tableData;

    return updated;
  }
}

class MockDeleteStatement {
  private conditions: any[] = [];

  constructor(private tableName: string) {}

  bind(params: Record<string, any>): this {
    // Bind parameters to conditions
    for (let i = 0; i < this.conditions.length; i++) {
      if (
        this.conditions[i].value &&
        typeof this.conditions[i].value === "object" &&
        this.conditions[i].value.$bind
      ) {
        this.conditions[i].value = params[this.conditions[i].value.$bind];
      }
    }
    return this;
  }

  where(condition: any): this {
    this.conditions.push(condition);
    return this;
  }

  async all(): Promise<any[]> {
    const tableData = globalStore[this.tableName as keyof DatabaseStore] || [];
    const deleted: any[] = [];

    // Filter records that match conditions
    const filteredData = tableData.filter((record: any) => {
      if (this.conditions.length === 0) return false;

      return this.conditions.every((condition: any) => {
        if (condition.field) {
          return record[condition.field] === condition.value;
        }
        return false;
      });
    });

    // Get deleted records
    deleted.push(...filteredData);

    // Update global store
    globalStore[this.tableName as keyof DatabaseStore] = tableData.filter(
      (record: any) => !filteredData.includes(record),
    );

    return deleted;
  }
}

// Drizzle ORM configuration for test environment
const createTestDb = () => {
  const mockDb = new MockD1Database();

  return drizzle(mockDb, { schema });
};

// Mock environment bindings
export interface MockEnvBindings {
  DB: MockD1Database;
  AI: any;
  NEXTAUTH_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  NEXTAUTH_URL: string;
}

export interface IntegrationTestEnv {
  env: MockEnvBindings;
  db: ReturnType<typeof drizzle>;
}

export async function createTestEnvironment(): Promise<IntegrationTestEnv> {
  // Create environment bindings
  const env: MockEnvBindings = {
    DB: new MockD1Database(),
    AI: {
      run: async () => ({
        result: JSON.stringify([
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
        ]),
      }),
    },
    NEXTAUTH_SECRET: "test-secret",
    GOOGLE_CLIENT_ID: "test-google-client-id",
    GOOGLE_CLIENT_SECRET: "test-google-secret",
    GITHUB_CLIENT_ID: "test-github-client-id",
    GITHUB_CLIENT_SECRET: "test-github-secret",
    NEXTAUTH_URL: "http://localhost:3000",
  };

  // Create fresh store for this test
  globalStore = {
    users: [],
    accounts: [],
    sessions: [],
    rateLimits: [],
    hooks: [],
    generatedScripts: [],
    scriptRatings: [],
    favorites: [],
    waitlistEntries: [],
    hookReviewQueue: [],
  };

  // Create drizzle instance
  const db = createTestDb();

  // Run migrations to ensure tables exist
  try {
    await migrate(db, { migrationsFolder: "./drizzle/migrations" });
    console.log("Migrations completed successfully");
  } catch (error) {
    console.log(
      "Migrations not found or failed, continuing with empty database",
    );
  }

  return { env, db };
}

export async function cleanupTestDatabase(db: ReturnType<typeof drizzle>) {
  // Clear global store
  globalStore = {
    users: [],
    accounts: [],
    sessions: [],
    rateLimits: [],
    hooks: [],
    generatedScripts: [],
    scriptRatings: [],
    favorites: [],
    waitlistEntries: [],
    hookReviewQueue: [],
  };
}

export function createTestUser(overrides: Partial<any> = {}) {
  return {
    id: `user-${Math.random().toString(36).substr(2, 9)}`,
    name: "Test User",
    email: `test-${Math.random().toString(36).substr(2, 9)}@example.com`,
    emailVerified: new Date(),
    image: null,
    role: "user",
    credits: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function createTestHook(overrides: Partial<any> = {}) {
  return {
    id: `hook-${Math.random().toString(36).substr(2, 9)}`,
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

export function createTestScript(overrides: Partial<any> = {}) {
  return {
    id: `script-${Math.random().toString(36).substr(2, 9)}`,
    userId: "test-user",
    hookId: "test-hook",
    productDescription: "Salicylic acid cleanser for oily skin",
    scripts: JSON.stringify([
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
    ]),
    createdAt: new Date(),
    ...overrides,
  };
}

export function createTestSession(overrides: Partial<any> = {}) {
  return {
    user: createTestUser(overrides),
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

export function createTestRequest(url: string, options: RequestInit = {}) {
  return new Request(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });
}

export async function waitForCondition(
  condition: () => Promise<boolean>,
  maxWait = 5000,
) {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWait) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Condition not met within timeout");
}

// Test data generators
export function generateRandomEmail() {
  return `user-${Math.random().toString(36).substr(2, 9)}@test.com`;
}

export function generateRandomPassword() {
  return `password-${Math.random().toString(36).substr(2, 12)}`;
}

export function generateTestHooks(count: number) {
  const categories = ["beauty", "fitness", "tech", "finance", "food"];
  return Array.from({ length: count }, (_, i) => ({
    id: `hook-${i + 1}`,
    text: `Test hook ${i + 1} - This is a catchy hook for ${categories[i % categories.length]}`,
    category: categories[i % categories.length],
    engagementScore: Math.floor(Math.random() * 10000) + 1000,
    source: "tiktok",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}

export function generateTestUsers(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `user-${i + 1}`,
    name: `Test User ${i + 1}`,
    email: `user${i + 1}@test.com`,
    emailVerified: new Date(),
    role: i % 5 === 0 ? "admin" : "user",
    credits: 50,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));
}

// Rate limiting helpers
export async function resetRateLimit(
  db: ReturnType<typeof drizzle>,
  userId: string,
) {
  const rateLimitData = globalStore.rateLimits || [];
  globalStore.rateLimits = rateLimitData.filter(
    (rl) => !rl.ip.includes(userId),
  );
}

export async function createRateLimitRecord(
  db: ReturnType<typeof drizzle>,
  userId: string,
  count: number = 10,
) {
  const record = {
    id: `rate-limit-${Date.now()}`,
    ip: `user:${userId}`,
    endpoint: "generate",
    count,
    resetAt: new Date(Date.now() + 60 * 1000),
    updatedAt: new Date(),
  };

  (globalStore.rateLimits || []).push(record);
  return record;
}
