import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  GenerationService,
  generateScripts,
  type Script,
  type GenerationResult,
} from "@/lib/services/generation";
import { createDb } from "@/lib/db";
import { users, generatedScripts, hooks } from "@/lib/schema";

vi.mock("@/lib/db", () => ({
  createDb: vi.fn(),
}));

vi.mock("@/lib/prompts", () => ({
  AI_CONFIG: {
    model: "@cf/meta/llama-3.1-8b-instruct",
    temperature: 0.75,
    max_tokens: 2048,
  },
  SYSTEM_PROMPT: "You are a test AI assistant",
  buildUserPrompt: vi.fn(
    (hook: string, product: string) => `Hook: ${hook}\nProduct: ${product}`,
  ),
  validateScriptOutput: vi.fn(() => ({ valid: true })),
}));

describe("GenerationService", () => {
  let mockDb: any;
  let mockAi: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDb = {
      query: {
        users: {
          findFirst: vi.fn(),
        },
        hooks: {
          findFirst: vi.fn(),
        },
      },
      insert: vi.fn(),
      update: vi.fn(),
      transaction: vi.fn(),
    };

    mockAi = {
      run: vi.fn(),
    };

    mockDb.update.mockImplementation((table: any) => ({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ credits: 4 }]),
        }),
      }),
    }));

    mockDb.insert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });

    // Mock transaction to call the callback with a transaction object
    mockDb.transaction.mockImplementation(
      async (callback: (tx: any) => Promise<void>) => {
        const mockTx = {
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockResolvedValue(undefined),
          }),
        };
        await callback(mockTx);
      },
    );
  });

  describe("generate - happy path", () => {
    it("should successfully generate scripts with valid inputs", async () => {
      const mockHook = { id: "hook-1", text: "Test hook", isActive: true };
      const mockScripts: Script[] = [
        { angle: "Pain Point", script: "Script number one for testing" },
        { angle: "Benefit", script: "Script number two for testing" },
        { angle: "Social Proof", script: "Script number three for testing" },
      ];

      mockDb.query.hooks.findFirst.mockResolvedValue(mockHook);
      mockAi.run = vi.fn().mockResolvedValue({
        response: JSON.stringify({ scripts: mockScripts }),
      });

      const service = new GenerationService(mockAi, mockDb);

      const result = await service.generate({
        userId: "user-1",
        hookId: "hook-1",
        productDescription: "Test product description that is long enough",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.scripts).toEqual(mockScripts);
        expect(result.creditsRemaining).toBe(4);
        expect(result.generationId).toBeDefined();
      }
    });
  });

  describe("generate - error cases", () => {
    it("should return INSUFFICIENT_CREDITS when user has no credits", async () => {
      mockDb.update.mockImplementation((table: any) => ({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      }));

      const service = new GenerationService(mockAi, mockDb);

      const result = await service.generate({
        userId: "user-1",
        hookId: "hook-1",
        productDescription: "This is a test product description",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("INSUFFICIENT_CREDITS");
      }
    });

    it("should return HOOK_NOT_FOUND when hook does not exist", async () => {
      mockDb.query.hooks.findFirst.mockResolvedValue(null);

      const service = new GenerationService(mockAi, mockDb);

      const result = await service.generate({
        userId: "user-1",
        hookId: "nonexistent-hook",
        productDescription: "This is a test product description",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("HOOK_NOT_FOUND");
      }
    });

    it("should return HOOK_NOT_FOUND when hook is inactive", async () => {
      mockDb.query.hooks.findFirst.mockResolvedValue({
        id: "hook-1",
        isActive: false,
      });

      const service = new GenerationService(mockAi, mockDb);

      const result = await service.generate({
        userId: "user-1",
        hookId: "hook-1",
        productDescription: "This is a test product description",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("HOOK_NOT_FOUND");
      }
    });

    it("should return AI_UNAVAILABLE when AI service fails", async () => {
      mockDb.query.hooks.findFirst.mockResolvedValue({
        id: "hook-1",
        isActive: true,
        text: "Test",
      });
      mockAi.run = vi.fn().mockImplementation(async () => {
        throw new Error("AI service down");
      });

      const service = new GenerationService(mockAi, mockDb);

      const result = await service.generate({
        userId: "user-1",
        hookId: "hook-1",
        productDescription: "This is a test product description",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("AI_UNAVAILABLE");
      }
    });

    it("should return INVALID_AI_RESPONSE when AI returns non-JSON", async () => {
      mockDb.query.hooks.findFirst.mockResolvedValue({
        id: "hook-1",
        isActive: true,
        text: "Test",
      });
      mockAi.run = vi.fn().mockResolvedValue({
        response: "This is plain text, not JSON",
      });

      const service = new GenerationService(mockAi, mockDb);

      const result = await service.generate({
        userId: "user-1",
        hookId: "hook-1",
        productDescription: "This is a test product description",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("INVALID_AI_RESPONSE");
      }
    });

    it("should return INVALID_AI_RESPONSE when AI returns missing scripts", async () => {
      mockDb.query.hooks.findFirst.mockResolvedValue({
        id: "hook-1",
        isActive: true,
        text: "Test",
      });
      mockAi.run = vi.fn().mockResolvedValue({
        response: JSON.stringify({ data: "no scripts field" }),
      });

      const service = new GenerationService(mockAi, mockDb);

      const result = await service.generate({
        userId: "user-1",
        hookId: "hook-1",
        productDescription: "This is a test product description",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("INVALID_AI_RESPONSE");
      }
    });

    it("should return INVALID_AI_RESPONSE when AI returns wrong number of scripts", async () => {
      mockDb.query.hooks.findFirst.mockResolvedValue({
        id: "hook-1",
        isActive: true,
        text: "Test",
      });
      mockAi.run = vi.fn().mockResolvedValue({
        response: JSON.stringify({
          scripts: [{ angle: "Pain Point", script: "Only one" }],
        }),
      });

      const service = new GenerationService(mockAi, mockDb);

      const result = await service.generate({
        userId: "user-1",
        hookId: "hook-1",
        productDescription: "This is a test product description",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("INVALID_AI_RESPONSE");
      }
    });

    it("should return DATABASE_ERROR when database insert fails", async () => {
      mockDb.query.hooks.findFirst.mockResolvedValue({
        id: "hook-1",
        isActive: true,
        text: "Test",
      });
      mockAi.run = vi.fn().mockResolvedValue({
        response: JSON.stringify({
          scripts: [
            { angle: "Pain Point", script: "Script number one for testing" },
            { angle: "Benefit", script: "Script number two for testing" },
            {
              angle: "Social Proof",
              script: "Script number three for testing",
            },
          ],
        }),
      });
      // Override transaction mock to reject
      mockDb.transaction.mockImplementation(
        async (callback: (tx: any) => Promise<void>) => {
          const mockTx = {
            insert: vi.fn().mockReturnValue({
              values: vi.fn().mockImplementation(async () => {
                throw new Error("DB connection lost");
              }),
            }),
          };
          await callback(mockTx);
        },
      );

      const service = new GenerationService(mockAi, mockDb);

      const result = await service.generate({
        userId: "user-1",
        hookId: "hook-1",
        productDescription: "This is a test product description",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("DATABASE_ERROR");
      }
    });
  });

  describe("generate - edge cases", () => {
    it("should handle malformed JSON response with embedded JSON", async () => {
      mockDb.query.hooks.findFirst.mockResolvedValue({
        id: "hook-1",
        isActive: true,
        text: "Test",
      });
      mockAi.run = vi.fn().mockResolvedValue({
        response:
          'Here is your response: {"scripts":[{"angle":"Pain Point","script":"Script number one for testing"},{"angle":"Benefit","script":"Script number two for testing"},{"angle":"Social Proof","script":"Script number three for testing"}]}',
      });

      const service = new GenerationService(mockAi, mockDb);

      const result = await service.generate({
        userId: "user-1",
        hookId: "hook-1",
        productDescription: "This is a test product description",
      });

      expect(result.success).toBe(true);
    });

    it("should handle last credit being used", async () => {
      mockDb.query.hooks.findFirst.mockResolvedValue({
        id: "hook-1",
        isActive: true,
        text: "Test",
      });
      mockDb.update.mockImplementation((table: any) => ({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ credits: 0 }]),
          }),
        }),
      }));
      mockAi.run = vi.fn().mockResolvedValue({
        response: JSON.stringify({
          scripts: [
            { angle: "Pain Point", script: "Script number one for testing" },
            { angle: "Benefit", script: "Script number two for testing" },
            {
              angle: "Social Proof",
              script: "Script number three for testing",
            },
          ],
        }),
      });

      const service = new GenerationService(mockAi, mockDb);

      const result = await service.generate({
        userId: "user-1",
        hookId: "hook-1",
        productDescription: "This is a test product description",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.creditsRemaining).toBe(0);
      }
    });
  });
});

describe("generateScripts - standalone function", () => {
  it("should create database instance and call service", async () => {
    const mockD1 = {} as D1Database;
    const mockAi = {
      run: vi.fn().mockResolvedValue({
        response: JSON.stringify({
          scripts: [
            { angle: "Pain Point", script: "Script number one for testing" },
            { angle: "Benefit", script: "Script number two for testing" },
            {
              angle: "Social Proof",
              script: "Script number three for testing",
            },
          ],
        }),
      }),
    };

    const mockDbInstance = {
      query: {
        hooks: {
          findFirst: vi
            .fn()
            .mockResolvedValue({ id: "hook-1", isActive: true, text: "Test" }),
        },
      },
      update: vi.fn().mockImplementation((table: any) => ({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ credits: 4 }]),
          }),
        }),
      })),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      }),
      transaction: vi
        .fn()
        .mockImplementation(async (callback: (tx: any) => Promise<void>) => {
          const mockTx = {
            insert: vi.fn().mockReturnValue({
              values: vi.fn().mockResolvedValue(undefined),
            }),
          };
          await callback(mockTx);
        }),
    };

    const { createDb: actualCreateDb } = await import("@/lib/db");
    vi.mocked(actualCreateDb).mockReturnValue(mockDbInstance as any);

    const result = await generateScripts(mockAi as any, mockD1, {
      userId: "user-1",
      hookId: "hook-1",
      productDescription: "This is a test product description",
    });

    expect(actualCreateDb).toHaveBeenCalledWith(mockD1);
    expect(result.success).toBe(true);
  });
});
