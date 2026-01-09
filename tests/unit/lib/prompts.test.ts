import { describe, expect, it } from "vitest";
import { buildUserPrompt, SYSTEM_PROMPT, AI_CONFIG } from "@/lib/prompts";

describe("prompts", () => {
  describe("SYSTEM_PROMPT", () => {
    it("enforces JSON format", () => {
      expect(SYSTEM_PROMPT).toContain("Return ONLY valid JSON");
    });

    it("includes critical rules for script writing", () => {
      expect(SYSTEM_PROMPT).toContain("casual language");
      expect(SYSTEM_PROMPT).toContain("NOT corporate marketing");
    });

    it("specifies the correct output format", () => {
      expect(SYSTEM_PROMPT).toContain('"scripts"');
      expect(SYSTEM_PROMPT).toContain('"angle"');
      expect(SYSTEM_PROMPT).toContain('"script"');
    });

    it("mentions all three required angles", () => {
      expect(SYSTEM_PROMPT).toContain("Pain Point");
      expect(SYSTEM_PROMPT).toContain("Benefit");
      expect(SYSTEM_PROMPT).toContain("Social Proof");
    });

    it("includes duration guidelines", () => {
      expect(SYSTEM_PROMPT).toContain("15-30 seconds");
    });

    it("specifies hook placement", () => {
      expect(SYSTEM_PROMPT).toContain("first line");
    });
  });

  describe("buildUserPrompt", () => {
    it("includes hook and product in user prompt", () => {
      const prompt = buildUserPrompt("Hook here", "Product details");
      expect(prompt).toContain("Hook here");
      expect(prompt).toContain("Product details");
    });

    it("includes examples in the prompt", () => {
      const prompt = buildUserPrompt("Test hook", "Test product");
      expect(prompt).toContain("EXAMPLE");
    });

    it("includes generation instruction", () => {
      const prompt = buildUserPrompt("Test hook", "Test product");
      expect(prompt).toContain("NOW GENERATE FOR");
    });

    it("includes formatting instructions", () => {
      const prompt = buildUserPrompt("Test hook", "Test product");
      expect(prompt).toContain("[Visual]");
      expect(prompt).toContain("(Audio)");
    });

    it("includes reminder about hook placement", () => {
      const prompt = buildUserPrompt("Test hook", "Test product");
      expect(prompt).toContain("Hook MUST be the first spoken line");
    });

    it("includes authenticity reminder", () => {
      const prompt = buildUserPrompt("Test hook", "Test product");
      expect(prompt).toContain("Sound like a real TikToker");
    });

    it("requests 3 scripts", () => {
      const prompt = buildUserPrompt("Test hook", "Test product");
      expect(prompt).toContain("Generate 3 scripts");
    });

    it("handles special characters in hook", () => {
      const prompt = buildUserPrompt(
        "Hook with \"quotes\" and 'apostrophes'",
        "Product",
      );
      expect(prompt).toContain("quotes");
      expect(prompt).toContain("apostrophes");
    });

    it("handles long product descriptions", () => {
      const longProduct = "x".repeat(500);
      const prompt = buildUserPrompt("Hook", longProduct);
      expect(prompt).toContain(longProduct);
    });

    it("handles hooks with newlines", () => {
      const prompt = buildUserPrompt("Hook\nwith\nnewlines", "Product");
      expect(prompt).toContain("Hook");
      expect(prompt).toContain("with");
      expect(prompt).toContain("newlines");
    });
  });

  describe("AI_CONFIG", () => {
    it("has a model defined", () => {
      expect(AI_CONFIG.model).toBeDefined();
      expect(typeof AI_CONFIG.model).toBe("string");
    });

    it("includes temperature setting", () => {
      expect(AI_CONFIG.temperature).toBeDefined();
      expect(typeof AI_CONFIG.temperature).toBe("number");
    });

    it("includes max_tokens setting", () => {
      expect(AI_CONFIG.max_tokens).toBeDefined();
      expect(typeof AI_CONFIG.max_tokens).toBe("number");
    });

    it("includes streaming setting", () => {
      expect(AI_CONFIG.streaming).toBeDefined();
      expect(typeof AI_CONFIG.streaming).toBe("boolean");
    });

    it("uses reasonable default values", () => {
      expect(AI_CONFIG.temperature).toBeGreaterThan(0);
      expect(AI_CONFIG.temperature).toBeLessThanOrEqual(1);
      expect(AI_CONFIG.max_tokens).toBeGreaterThan(0);
    });
  });
});
