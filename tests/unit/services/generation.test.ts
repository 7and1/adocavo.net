import { describe, it, expect, vi, beforeEach } from "vitest";
import { GenerationService } from "@/lib/services/generation";

const mockDb = {
  query: {
    hooks: {
      findFirst: vi.fn(),
    },
  },
  update: vi.fn(),
  insert: vi.fn(),
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

const mockAi = {
  run: vi.fn(),
};

function mockDeductCredits(result: Array<{ credits: number }>) {
  mockDb.update.mockReturnValueOnce({
    set: () => ({
      where: () => ({
        returning: () => Promise.resolve(result),
      }),
    }),
  });
}

function mockRefundCredits() {
  mockDb.update.mockReturnValue({
    set: () => ({
      where: () => Promise.resolve(),
    }),
  });
}

describe("GenerationService", () => {
  let service: GenerationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GenerationService(mockAi as any, mockDb as any);
  });

  it("returns INSUFFICIENT_CREDITS when user has no credits", async () => {
    mockDeductCredits([]);
    const result = await service.generate({
      userId: "user_1",
      hookId: "hook_1",
      productDescription: "A valid description of a product",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("INSUFFICIENT_CREDITS");
    }
  });

  it("returns HOOK_NOT_FOUND when hook missing", async () => {
    mockDeductCredits([{ credits: 9 }]);
    mockDb.query.hooks.findFirst.mockResolvedValueOnce(null);
    mockRefundCredits();

    const result = await service.generate({
      userId: "user_1",
      hookId: "hook_missing",
      productDescription: "A valid description of a product",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("HOOK_NOT_FOUND");
    }
  });

  it("successfully generates scripts", async () => {
    mockDeductCredits([{ credits: 9 }]);
    mockDb.query.hooks.findFirst.mockResolvedValueOnce({
      id: "hook_1",
      text: "Sample hook",
      isActive: true,
    });

    mockAi.run.mockResolvedValueOnce({
      response: JSON.stringify({
        scripts: [
          { angle: "Pain Point", script: "Script number one for testing" },
          { angle: "Benefit", script: "Script number two for testing" },
          { angle: "Social Proof", script: "Script number three for testing" },
        ],
      }),
    });

    mockDb.insert.mockReturnValueOnce({
      values: () => Promise.resolve(),
    });

    const result = await service.generate({
      userId: "user_1",
      hookId: "hook_1",
      productDescription: "A valid description of a product",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.scripts).toHaveLength(3);
    }
  });
});
