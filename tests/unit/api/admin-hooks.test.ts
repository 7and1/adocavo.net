import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/admin/hooks/route";
import { PATCH } from "@/app/api/admin/hooks/[id]/route";
import { requireAdmin } from "@/lib/admin";
import { auth } from "@/lib/auth";

vi.mock("@/lib/admin", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

describe("API: admin hooks", () => {
  const session = { user: { id: "admin-user", role: "admin" } } as any;
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      query: {
        hooks: {
          findMany: vi.fn(),
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

  it("GET returns hooks", async () => {
    const hooks = [
      {
        id: "hook_123",
        text: "Stop scrolling if you have acne",
        category: "beauty",
        engagementScore: 90,
        isActive: true,
      },
    ];

    mockDb.query.hooks.findMany.mockResolvedValue(hooks);

    const request = new Request("https://adocavo.net/api/admin/hooks");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual(hooks);
  });

  it("POST creates a new hook", async () => {
    const created = {
      id: "hook_456",
      text: "This is your sign to start that side hustle",
      category: "finance",
      engagementScore: 88,
      isActive: true,
    };

    mockDb.insert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });
    mockDb.query.hooks.findFirst.mockResolvedValue(created);

    const request = new Request("https://adocavo.net/api/admin/hooks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        text: created.text,
        category: created.category,
        engagementScore: created.engagementScore,
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data).toEqual(created);
  });

  it("PATCH updates an existing hook", async () => {
    const existing = {
      id: "hook_789",
      text: "Old hook",
      category: "tech",
      engagementScore: 70,
      isActive: true,
    };
    const updated = {
      ...existing,
      text: "Updated hook",
      engagementScore: 82,
    };

    mockDb.query.hooks.findFirst
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(updated);
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });

    const request = new Request(
      "https://adocavo.net/api/admin/hooks/hook_789",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ text: "Updated hook", engagementScore: 82 }),
      },
    );

    const response = await PATCH(request, {
      params: Promise.resolve({ id: "hook_789" }),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.text).toBe("Updated hook");
    expect(body.data.engagementScore).toBe(82);
  });
});
