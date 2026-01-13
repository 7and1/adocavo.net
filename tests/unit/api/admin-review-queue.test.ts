import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/admin/review-queue/route";
import { PATCH } from "@/app/api/admin/review-queue/[id]/route";
import { requireAdmin } from "@/lib/admin";
import { auth } from "@/lib/auth";

vi.mock("@/lib/admin", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

describe("API: admin review queue", () => {
  const session = { user: { id: "admin-user", role: "admin" } } as any;
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      query: {
        hookReviewQueue: {
          findMany: vi.fn(),
          findFirst: vi.fn(),
        },
        hooks: {
          findFirst: vi.fn(),
        },
      },
      insert: vi.fn(),
      update: vi.fn(),
    };

    vi.mocked(auth).mockResolvedValue(session);
    vi.mocked(requireAdmin).mockResolvedValue({
      db: mockDb,
      user: session.user,
    });
  });

  it("GET returns review queue entries", async () => {
    const items = [
      {
        id: "queue_123",
        text: "Hook idea",
        category: "beauty",
        engagementScore: 80,
        status: "pending",
      },
    ];

    mockDb.query.hookReviewQueue.findMany.mockResolvedValue(items);

    const request = new Request("https://adocavo.net/api/admin/review-queue");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual(items);
  });

  it("POST inserts review queue entries", async () => {
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });

    const request = new Request("https://adocavo.net/api/admin/review-queue", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        text: "Queued hook",
        category: "tech",
        engagementScore: 92,
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data[0].text).toBe("Queued hook");
  });

  it("PATCH approves a review item and publishes it", async () => {
    const existing = {
      id: "queue_999",
      text: "Approve me",
      category: "finance",
      engagementScore: 88,
      status: "pending",
      source: "review_queue",
      createdAt: new Date(),
    };

    const updated = {
      ...existing,
      status: "approved",
    };

    mockDb.query.hookReviewQueue.findFirst
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(updated);

    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });

    const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({ onConflictDoUpdate }),
    });

    mockDb.query.hooks.findFirst.mockResolvedValue({
      id: existing.id,
      text: existing.text,
      category: existing.category,
      engagementScore: existing.engagementScore,
      isActive: true,
    });

    const request = new Request(
      "https://adocavo.net/api/admin/review-queue/queue_999",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ status: "approved", publish: true }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "queue_999" }),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.queueItem.status).toBe("approved");
    expect(body.data.hook.id).toBe(existing.id);
  });
});
