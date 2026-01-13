import { describe, it, expect, vi, beforeEach } from "vitest";
import { analyzeTikTokUrl } from "@/lib/services/competitor-analysis";

vi.mock("@/lib/logger", () => ({
  logError: vi.fn(),
}));

const mockInsert = vi.fn().mockResolvedValue(undefined);
const mockDbInsert = vi.fn().mockReturnValue({
  values: vi.fn().mockReturnValue({
    onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
  }),
});

vi.mock("@/lib/db", () => ({
  createDb: vi.fn(() => ({
    insert: mockDbInsert,
  })),
}));

vi.mock("@/lib/analysis-prompts", () => ({
  ANALYSIS_SYSTEM_PROMPT: "You are a TikTok analysis expert.",
  buildAnalysisPrompt: vi.fn((data) => `Analyze: ${data.transcript}`),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("competitor-analysis", () => {
  let mockAi: Ai;
  let mockD1: D1Database;

  beforeEach(() => {
    vi.clearAllMocks();

    mockAi = {
      run: vi.fn(),
    } as unknown as Ai;

    mockD1 = {} as D1Database;
  });

  describe("analyzeTikTokUrl", () => {
    it("should successfully analyze TikTok URL with valid response", async () => {
      const mockHtml = `
        <html>
          <script id="SIGI_STATE" type="application/json">
          {
            "ItemModule": {
              "video123": {
                "desc": "Amazing product demo!",
                "authorNickname": "@creator",
                "video": {
                  "subtitleInfos": [
                    {"Language": "en", "Url": "https://subs.tiktok.com/en.vtt"}
                  ]
                }
              }
            }
          }
          </script>
        </html>
      `;

      const mockVtt = `WEBVTT
1
00:00:00.000 --> 00:00:02.500
Check out this amazing product

2
00:00:02.500 --> 00:00:05.000
It will change your life forever`;

      const mockAiResponse = {
        response: JSON.stringify({
          hook: "Stop scrolling! This product is a game changer",
          structure: [
            { label: "Hook", summary: "Attention grabber" },
            { label: "Problem", summary: "Pain point identification" },
            { label: "Solution", summary: "Product introduction" },
          ],
          template: [
            { label: "Hook", script: "Stop scrolling!" },
            { label: "Problem", script: "Tired of old solutions?" },
            { label: "Solution", script: "Try this instead" },
          ],
          cta: "Link in bio",
          notes: ["High energy delivery", "Quick cuts"],
        }),
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          url: "https://tiktok.com/@creator/video/123",
          text: async () => mockHtml,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          text: async () => mockVtt,
        } as Response);

      mockAi.run.mockResolvedValue(mockAiResponse);

      const result = await analyzeTikTokUrl(mockAi, mockD1, {
        userId: "user-123",
        url: "https://tiktok.com/@creator/video/123",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.result.hook).toBe(
          "Stop scrolling! This product is a game changer",
        );
        expect(result.result.structure).toHaveLength(3);
        expect(result.result.template).toHaveLength(3);
        expect(result.result.cta).toBe("Link in bio");
        expect(result.result.notes).toEqual([
          "High energy delivery",
          "Quick cuts",
        ]);
      }
    });

    it("should return TRANSCRIPT_NOT_FOUND when no transcript available", async () => {
      const mockHtml = `
        <html>
          <script id="SIGI_STATE" type="application/json">
          {
            "ItemModule": {
              "video123": {
                "desc": "",
                "authorNickname": "@creator"
              }
            }
          }
          </script>
        </html>
      `;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        url: "https://tiktok.com/@creator/video/123",
        text: async () => mockHtml,
      } as Response);

      const result = await analyzeTikTokUrl(mockAi, mockD1, {
        userId: "user-123",
        url: "https://tiktok.com/@creator/video/123",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("TRANSCRIPT_NOT_FOUND");
      }
    });

    it("should return INVALID_AI_RESPONSE when AI returns non-JSON", async () => {
      const mockHtml = `
        <html>
          <script id="SIGI_STATE" type="application/json">
          {
            "ItemModule": {
              "video123": {
                "desc": "Test caption",
                "video": {
                  "subtitleInfos": [{"Language": "en", "Url": "https://subs.vtt"}]
                }
              }
            }
          }
          </script>
        </html>
      `;

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          text: async () => mockHtml,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          text: async () => "WEBVTT\n1\n00:00:00 --> 00:00:01\nTest",
        } as Response);

      mockAi.run.mockResolvedValue({
        response: "This is plain text, not JSON",
      });

      const result = await analyzeTikTokUrl(mockAi, mockD1, {
        userId: "user-123",
        url: "https://tiktok.com/@creator/video/123",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("INVALID_AI_RESPONSE");
      }
    });

    it("should return INVALID_AI_RESPONSE when AI response fails validation", async () => {
      const mockHtml = `
        <html>
          <script id="SIGI_STATE" type="application/json">
          {
            "ItemModule": {
              "video123": {
                "desc": "Test",
                "video": {
                  "subtitleInfos": [{"Language": "en", "Url": "https://subs.vtt"}]
                }
              }
            }
          }
          </script>
        </html>
      `;

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          text: async () => mockHtml,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          text: async () => "WEBVTT\n1\n00:00:00 --> 00:00:01\nTest",
        } as Response);

      mockAi.run.mockResolvedValue({
        response: JSON.stringify({
          hook: "ab", // Too short
          structure: [{ label: "a", summary: "b" }], // Too few items
          template: [{ label: "a", script: "b" }], // Too few items
        }),
      });

      const result = await analyzeTikTokUrl(mockAi, mockD1, {
        userId: "user-123",
        url: "https://tiktok.com/@creator/video/123",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("INVALID_AI_RESPONSE");
      }
    });

    it("should return ANALYSIS_FAILED on fetch error", async () => {
      mockFetch.mockImplementation(async () => {
        throw new Error("Network error");
      });

      const result = await analyzeTikTokUrl(mockAi, mockD1, {
        userId: "user-123",
        url: "https://tiktok.com/@creator/video/123",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("ANALYSIS_FAILED");
      }
    });

    it("should handle AI response with JSON embedded in text", async () => {
      const mockHtml = `
        <html>
          <script id="SIGI_STATE" type="application/json">
          {
            "ItemModule": {
              "video123": {
                "desc": "Test caption",
                "video": {
                  "subtitleInfos": [{"Language": "en", "Url": "https://subs.vtt"}]
                }
              }
            }
          }
          </script>
        </html>
      `;

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          text: async () => mockHtml,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          text: async () =>
            "WEBVTT\n1\n00:00:00 --> 00:00:01\nTest transcript here",
        } as Response);

      mockAi.run.mockResolvedValue({
        response: `Here's my analysis:\n\n${JSON.stringify({
          hook: "Great hook for testing",
          structure: [
            { label: "Hook", summary: "Grab attention" },
            { label: "Body", summary: "Main content" },
            { label: "CTA", summary: "Call to action" },
          ],
          template: [
            { label: "Hook", script: "Stop scrolling" },
            { label: "Body", script: "Here's why" },
            { label: "CTA", script: "Buy now" },
          ],
        })}`,
      });

      const result = await analyzeTikTokUrl(mockAi, mockD1, {
        userId: "user-123",
        url: "https://tiktok.com/@creator/video/123",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.result.hook).toBe("Great hook for testing");
      }
    });

    it("should use caption as transcript when subtitles unavailable", async () => {
      const mockHtml = `
        <html>
          <script id="SIGI_STATE" type="application/json">
          {
            "ItemModule": {
              "video123": {
                "desc": "This is the caption that serves as transcript",
                "video": {}
              }
            }
          }
          </script>
        </html>
      `;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml,
      } as Response);

      mockAi.run.mockResolvedValue({
        response: JSON.stringify({
          hook: "Caption hook",
          structure: [
            { label: "Hook", summary: "Attention" },
            { label: "Body", summary: "Content" },
            { label: "CTA", summary: "Action" },
          ],
          template: [
            { label: "Hook", script: "Hook script" },
            { label: "Body", script: "Body script" },
            { label: "CTA", script: "CTA script" },
          ],
        }),
      });

      const result = await analyzeTikTokUrl(mockAi, mockD1, {
        userId: "user-123",
        url: "https://tiktok.com/@creator/video/123",
      });

      expect(result.success).toBe(true);
    });

    it("should extract metadata from SIGI_STATE", async () => {
      const mockHtml = `
        <html>
          <script id="SIGI_STATE" type="application/json">
          {
            "ItemModule": {
              "video456": {
                "desc": "Product review video",
                "authorInfo": {"nickname": "@reviewer"},
                "video": {
                  "subtitleInfos": [{"Language": "en", "Url": "https://subs.vtt"}]
                }
              }
            }
          }
          </script>
        </html>
      `;

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          url: "https://tiktok.com/@reviewer/video/456",
          text: async () => mockHtml,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          text: async () => "WEBVTT\n1\n00:00:00 --> 00:00:01\nTranscript text",
        } as Response);

      mockAi.run.mockResolvedValue({
        response: JSON.stringify({
          hook: "Test hook with enough length",
          structure: [
            { label: "Hook", summary: "Test" },
            { label: "Body", summary: "Test" },
            { label: "CTA", summary: "Test" },
          ],
          template: [
            { label: "Hook", script: "Test" },
            { label: "Body", script: "Test" },
            { label: "CTA", script: "Test" },
          ],
        }),
      });

      const result = await analyzeTikTokUrl(mockAi, mockD1, {
        userId: "user-123",
        url: "https://tiktok.com/@reviewer/video/456",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.result.title).toBe("Product review video");
        expect(result.result.author).toBe("@reviewer");
      }
    });

    it("should extract metadata from __DEFAULT_SCOPE__", async () => {
      const mockHtml = `
        <html>
          <script>
          __UNIVERSAL_DATA_FOR_REHYDRATION__ = {
            "__DEFAULT_SCOPE__": {
              "webapp": {
                "itemModule": {
                  "video789": {
                    "desc": "Universal data video with transcript",
                    "authorNickname": "@universal",
                    "video": {
                      "subtitleInfos": [{"Language": "en", "Url": "https://subs.vtt"}]
                    }
                  }
                }
              }
            }
          }
          </script>
        </html>
      `;

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          url: "https://tiktok.com/@universal/video/789",
          text: async () => mockHtml,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          text: async () => "WEBVTT\n1\n00:00:00 --> 00:00:01\nText",
        } as Response);

      mockAi.run.mockResolvedValue({
        response: JSON.stringify({
          hook: "Valid hook for universal data test with enough content",
          structure: [
            { label: "AB", summary: "Summary 1" },
            { label: "CD", summary: "Summary 2" },
            { label: "EF", summary: "Summary 3" },
          ],
          template: [
            { label: "AB", script: "Script 1" },
            { label: "CD", script: "Script 2" },
            { label: "EF", script: "Script 3" },
          ],
        }),
      });

      const result = await analyzeTikTokUrl(mockAi, mockD1, {
        userId: "user-123",
        url: "https://tiktok.com/@universal/video/789",
      });

      expect(result.success).toBe(true);
    });

    it("should handle missing optional cta and notes", async () => {
      const mockHtml = `
        <html>
          <script id="SIGI_STATE" type="application/json">
          {
            "ItemModule": {
              "video123": {
                "desc": "Test caption",
                "video": {
                  "subtitleInfos": [{"Language": "en", "Url": "https://subs.vtt"}]
                }
              }
            }
          }
          </script>
        </html>
      `;

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          text: async () => mockHtml,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          text: async () => "WEBVTT\n1\n00:00:00 --> 00:00:01\nText",
        } as Response);

      mockAi.run.mockResolvedValue({
        response: JSON.stringify({
          hook: "Valid hook without cta or notes",
          structure: [
            { label: "AB", summary: "Summary 1" },
            { label: "CD", summary: "Summary 2" },
            { label: "EF", summary: "Summary 3" },
          ],
          template: [
            { label: "AB", script: "Script 1" },
            { label: "CD", script: "Script 2" },
            { label: "EF", script: "Script 3" },
          ],
          // No cta or notes
        }),
      });

      const result = await analyzeTikTokUrl(mockAi, mockD1, {
        userId: "user-123",
        url: "https://tiktok.com/@creator/video/123",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.result.cta).toBeUndefined();
        expect(result.result.notes).toBeUndefined();
      }
    });

    it("should handle subtitle fetch error gracefully", async () => {
      const mockHtml = `
        <html>
          <script id="SIGI_STATE" type="application/json">
          {
            "ItemModule": {
              "video123": {
                "desc": "Fallback caption",
                "video": {
                  "subtitleInfos": [{"Language": "en", "Url": "https://subs.vtt"}]
                }
              }
            }
          }
          </script>
        </html>
      `;

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          text: async () => mockHtml,
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          text: async () => "",
        } as Response);

      mockAi.run.mockResolvedValue({
        response: JSON.stringify({
          hook: "Hook from caption fallback",
          structure: [
            { label: "AB", summary: "Summary 1" },
            { label: "CD", summary: "Summary 2" },
            { label: "EF", summary: "Summary 3" },
          ],
          template: [
            { label: "AB", script: "Script 1" },
            { label: "CD", script: "Script 2" },
            { label: "EF", script: "Script 3" },
          ],
        }),
      });

      const result = await analyzeTikTokUrl(mockAi, mockD1, {
        userId: "user-123",
        url: "https://tiktok.com/@creator/video/123",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.result.transcriptSource).toBe("caption");
      }
    });
  });
});
