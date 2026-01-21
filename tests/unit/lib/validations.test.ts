import { describe, expect, it } from "vitest";
import {
  generateRequestSchema,
  waitlistRequestSchema,
  hooksQuerySchema,
  fakeDoorClickSchema,
  ratingRequestSchema,
  favoriteRequestSchema,
  regenerateRequestSchema,
  hookCategorySchema,
  validate,
} from "@/lib/validations";
import { ZodError } from "zod";

describe("validations", () => {
  describe("generateRequestSchema", () => {
    const validData = {
      hookId: "hook-123",
      productDescription:
        "This is a valid product description that meets the minimum length requirement",
      turnstileToken: "token-123",
    };

    it("validates generate request", () => {
      const result = generateRequestSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it("rejects short product description", () => {
      const result = generateRequestSchema.safeParse({
        hookId: "hook_1",
        productDescription: "Too short",
        turnstileToken: "token-123",
      });

      expect(result.success).toBe(false);
    });

    it("should trim product description", () => {
      const data = {
        hookId: "hook-123",
        productDescription: "  description with spaces  ",
        turnstileToken: "token-123",
      };

      const result = generateRequestSchema.safeParse(data);

      if (result.success) {
        expect(result.data.productDescription).toBe("description with spaces");
      }
    });

    it("should enforce maximum length on productDescription", () => {
      const data = {
        hookId: "hook-123",
        productDescription: "x".repeat(1001),
        turnstileToken: "token-123",
      };

      const result = generateRequestSchema.safeParse(data);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          "not exceed 1000 characters",
        );
      }
    });

    it("should reject empty hookId", () => {
      const data = {
        hookId: "",
        productDescription: validData.productDescription,
        turnstileToken: "token-123",
      };

      const result = generateRequestSchema.safeParse(data);

      expect(result.success).toBe(false);
    });

    it("should accept hookId at max length", () => {
      const data = {
        hookId: "x".repeat(100),
        productDescription: validData.productDescription,
        turnstileToken: "token-123",
      };

      const result = generateRequestSchema.safeParse(data);

      expect(result.success).toBe(true);
    });

    it("should reject hookId over max length", () => {
      const data = {
        hookId: "x".repeat(101),
        productDescription: validData.productDescription,
        turnstileToken: "token-123",
      };

      const result = generateRequestSchema.safeParse(data);

      expect(result.success).toBe(false);
    });

    it("should require turnstile token", () => {
      const result = generateRequestSchema.safeParse({
        hookId: "hook-123",
        productDescription: validData.productDescription,
      });

      expect(result.success).toBe(false);
    });
  });

  describe("waitlistRequestSchema", () => {
    const validData = {
      email: "test@example.com",
    };

    it("validates waitlist request with optional fields", () => {
      const data = {
        email: "user@example.com",
        featureInterest: "spy",
        sourceUrl: "https://adocavo.net/hook/hook_1",
        userTier: "power",
      };

      const result = waitlistRequestSchema.safeParse(data);

      expect(result.success).toBe(true);
    });

    it("should validate correct email input", () => {
      const result = waitlistRequestSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it("should require email", () => {
      const data = {
        featureInterest: "unlimited",
      };

      const result = waitlistRequestSchema.safeParse(data);

      expect(result.success).toBe(false);
    });

    it("should validate email format", () => {
      const invalidEmails = [
        "invalid",
        "@example.com",
        "test@",
        "test @example.com",
      ];

      invalidEmails.forEach((email) => {
        const result = waitlistRequestSchema.safeParse({ email });
        expect(result.success).toBe(false);
      });
    });

    it("should accept valid featureInterest values", () => {
      const validInterests = ["unlimited", "team", "api", "spy"];

      validInterests.forEach((interest) => {
        const result = waitlistRequestSchema.safeParse({
          email: "test@example.com",
          featureInterest: interest,
        });
        expect(result.success).toBe(true);
      });
    });

    it("should reject invalid featureInterest", () => {
      const result = waitlistRequestSchema.safeParse({
        email: "test@example.com",
        featureInterest: "invalid",
      });

      expect(result.success).toBe(false);
    });

    it("should validate sourceUrl as URL", () => {
      const result = waitlistRequestSchema.safeParse({
        email: "test@example.com",
        sourceUrl: "not-a-url",
      });

      expect(result.success).toBe(false);
    });

    it("should accept valid sourceUrl", () => {
      const result = waitlistRequestSchema.safeParse({
        email: "test@example.com",
        sourceUrl: "https://example.com/path",
      });

      expect(result.success).toBe(true);
    });

    it("should enforce max length on userTier", () => {
      const result = waitlistRequestSchema.safeParse({
        email: "test@example.com",
        userTier: "x".repeat(51),
      });

      expect(result.success).toBe(false);
    });
  });

  describe("hooksQuerySchema", () => {
    it("should validate empty query", () => {
      const result = hooksQuerySchema.safeParse({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it("should apply default values", () => {
      const result = hooksQuerySchema.safeParse({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it("should validate category", () => {
      const result = hooksQuerySchema.safeParse({
        category: "beauty",
      });

      expect(result.success).toBe(true);
    });

    it("should reject invalid category", () => {
      const result = hooksQuerySchema.safeParse({
        category: "invalid",
      });

      expect(result.success).toBe(false);
    });

    it("should validate search string", () => {
      const result = hooksQuerySchema.safeParse({
        search: "test hook",
      });

      expect(result.success).toBe(true);
    });

    it("should enforce max length on search", () => {
      const result = hooksQuerySchema.safeParse({
        search: "x".repeat(101),
      });

      expect(result.success).toBe(false);
    });

    it("should coerce page to number", () => {
      const result = hooksQuerySchema.safeParse({
        page: "5",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.page).toBe("number");
        expect(result.data.page).toBe(5);
      }
    });

    it("should coerce limit to number", () => {
      const result = hooksQuerySchema.safeParse({
        limit: "10",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.limit).toBe("number");
        expect(result.data.limit).toBe(10);
      }
    });

    it("should enforce positive page", () => {
      const result = hooksQuerySchema.safeParse({
        page: 0,
      });

      expect(result.success).toBe(false);
    });

    it("should enforce positive limit", () => {
      const result = hooksQuerySchema.safeParse({
        limit: 0,
      });

      expect(result.success).toBe(false);
    });

    it("should enforce max limit of 50", () => {
      const result = hooksQuerySchema.safeParse({
        limit: 100,
      });

      expect(result.success).toBe(false);
    });

    it("should accept limit of 50", () => {
      const result = hooksQuerySchema.safeParse({
        limit: 50,
      });

      expect(result.success).toBe(true);
    });
  });

  describe("fakeDoorClickSchema", () => {
    it("should validate analyze_url feature", () => {
      const result = fakeDoorClickSchema.safeParse({
        feature: "analyze_url",
      });

      expect(result.success).toBe(true);
    });

    it("should require feature field", () => {
      const result = fakeDoorClickSchema.safeParse({});

      expect(result.success).toBe(false);
    });

    it("should reject invalid feature", () => {
      const result = fakeDoorClickSchema.safeParse({
        feature: "invalid_feature",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("ratingRequestSchema", () => {
    const validData = {
      scriptIndex: 1,
      rating: 5,
    };

    it("should validate correct rating input", () => {
      const result = ratingRequestSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it("should accept optional isHelpful", () => {
      const result = ratingRequestSchema.safeParse({
        ...validData,
        isHelpful: true,
      });

      expect(result.success).toBe(true);
    });

    it("should accept optional feedback", () => {
      const result = ratingRequestSchema.safeParse({
        ...validData,
        feedback: "Great script!",
      });

      expect(result.success).toBe(true);
    });

    it("should require scriptIndex", () => {
      const result = ratingRequestSchema.safeParse({
        rating: 5,
      });

      expect(result.success).toBe(false);
    });

    it("should require rating", () => {
      const result = ratingRequestSchema.safeParse({
        scriptIndex: 1,
      });

      expect(result.success).toBe(false);
    });

    it("should enforce scriptIndex min of 0", () => {
      const result = ratingRequestSchema.safeParse({
        scriptIndex: -1,
        rating: 5,
      });

      expect(result.success).toBe(false);
    });

    it("should enforce scriptIndex max of 2", () => {
      const result = ratingRequestSchema.safeParse({
        scriptIndex: 3,
        rating: 5,
      });

      expect(result.success).toBe(false);
    });

    it("should accept all valid scriptIndex values", () => {
      [0, 1, 2].forEach((index) => {
        const result = ratingRequestSchema.safeParse({
          scriptIndex: index,
          rating: 5,
        });
        expect(result.success).toBe(true);
      });
    });

    it("should enforce rating min of 1", () => {
      const result = ratingRequestSchema.safeParse({
        scriptIndex: 1,
        rating: 0,
      });

      expect(result.success).toBe(false);
    });

    it("should enforce rating max of 5", () => {
      const result = ratingRequestSchema.safeParse({
        scriptIndex: 1,
        rating: 6,
      });

      expect(result.success).toBe(false);
    });

    it("should accept all valid rating values", () => {
      [1, 2, 3, 4, 5].forEach((rating) => {
        const result = ratingRequestSchema.safeParse({
          scriptIndex: 1,
          rating,
        });
        expect(result.success).toBe(true);
      });
    });

    it("should enforce max feedback length", () => {
      const result = ratingRequestSchema.safeParse({
        scriptIndex: 1,
        rating: 5,
        feedback: "x".repeat(1001),
      });

      expect(result.success).toBe(false);
    });
  });

  describe("favoriteRequestSchema", () => {
    it("should validate correct favorite input", () => {
      const result = favoriteRequestSchema.safeParse({
        generatedScriptId: "script-123",
      });

      expect(result.success).toBe(true);
    });

    it("should require generatedScriptId", () => {
      const result = favoriteRequestSchema.safeParse({});

      expect(result.success).toBe(false);
    });

    it("should enforce min length on generatedScriptId", () => {
      const result = favoriteRequestSchema.safeParse({
        generatedScriptId: "",
      });

      expect(result.success).toBe(false);
    });

    it("should enforce max length on generatedScriptId", () => {
      const result = favoriteRequestSchema.safeParse({
        generatedScriptId: "x".repeat(101),
      });

      expect(result.success).toBe(false);
    });
  });

  describe("regenerateRequestSchema", () => {
    it("should validate Pain Point angle", () => {
      const result = regenerateRequestSchema.safeParse({
        angle: "Pain Point",
      });

      expect(result.success).toBe(true);
    });

    it("should validate Benefit angle", () => {
      const result = regenerateRequestSchema.safeParse({
        angle: "Benefit",
      });

      expect(result.success).toBe(true);
    });

    it("should validate Social Proof angle", () => {
      const result = regenerateRequestSchema.safeParse({
        angle: "Social Proof",
      });

      expect(result.success).toBe(true);
    });

    it("should require angle field", () => {
      const result = regenerateRequestSchema.safeParse({});

      expect(result.success).toBe(false);
    });

    it("should reject invalid angle", () => {
      const result = regenerateRequestSchema.safeParse({
        angle: "Invalid Angle",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("hookCategorySchema", () => {
    it("should accept all valid categories", () => {
      const categories = [
        "beauty",
        "tech",
        "finance",
        "pets",
        "fitness",
        "food",
      ];

      categories.forEach((category) => {
        const result = hookCategorySchema.safeParse(category);
        expect(result.success).toBe(true);
      });
    });

    it("should reject invalid category", () => {
      const result = hookCategorySchema.safeParse("invalid");

      expect(result.success).toBe(false);
    });
  });

  describe("validate helper function", () => {
    const schema = generateRequestSchema;

    it("should return success with data for valid input", () => {
      const result = validate(schema, {
        hookId: "hook-123",
        productDescription: "Valid product description",
        turnstileToken: "token-123",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeDefined();
      }
    });

    it("should return failure with errors for invalid input", () => {
      const result = validate(schema, {
        hookId: "hook-123",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toBeInstanceOf(ZodError);
      }
    });
  });
});
