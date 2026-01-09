import { describe, it, expect } from "vitest";
import { cn, formatDate } from "@/lib/utils";

describe("Utils", () => {
  describe("cn (className utility)", () => {
    it("should merge class names correctly", () => {
      expect(cn("foo", "bar")).toBe("foo bar");
    });

    it("should handle conditional classes", () => {
      expect(cn("base", true && "active", false && "inactive")).toBe(
        "base active",
      );
    });

    it("should handle Tailwind conflicts with Tailwind merge", () => {
      expect(cn("p-4", "p-2")).toBe("p-2");
    });

    it("should handle undefined and null values", () => {
      expect(cn("foo", undefined, null, "bar")).toBe("foo bar");
    });

    it("should handle empty strings", () => {
      expect(cn("foo", "", "bar")).toBe("foo bar");
    });

    it("should handle arrays", () => {
      expect(cn(["foo", "bar"])).toBe("foo bar");
    });

    it("should handle objects with boolean values", () => {
      expect(cn({ foo: true, bar: false, baz: true })).toBe("foo baz");
    });

    it("should handle complex nested inputs", () => {
      expect(cn("base", { active: true }, ["extra", null])).toBe(
        "base active extra",
      );
    });

    it("should handle conflicting Tailwind utilities", () => {
      expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
      expect(cn("bg-white", "bg-black")).toBe("bg-black");
    });

    it("should handle empty input", () => {
      expect(cn()).toBe("");
    });
  });

  describe("formatDate", () => {
    it("should format Date object", () => {
      const date = new Date("2024-01-15");
      const result = formatDate(date);

      expect(result).toContain("January");
      expect(result).toContain("15");
      expect(result).toContain("2024");
    });

    it("should format date string", () => {
      const result = formatDate("2024-01-15");

      expect(result).toContain("January");
      expect(result).toContain("15");
      expect(result).toContain("2024");
    });

    it("should format timestamp number", () => {
      const timestamp = new Date("2024-06-20").getTime();
      const result = formatDate(timestamp);

      expect(result).toContain("June");
      expect(result).toContain("20");
      expect(result).toContain("2024");
    });

    it("should handle leap year dates", () => {
      const result = formatDate("2024-02-29");

      expect(result).toContain("February");
      expect(result).toContain("29");
      expect(result).toContain("2024");
    });

    it("should handle end of year dates", () => {
      const result = formatDate("2024-12-31");

      expect(result).toContain("December");
      expect(result).toContain("31");
      expect(result).toContain("2024");
    });

    it("should handle beginning of year dates", () => {
      const result = formatDate("2024-01-01");

      expect(result).toContain("January");
      expect(result).toContain("1");
      expect(result).toContain("2024");
    });

    it("should format different months correctly", () => {
      const feb = formatDate("2024-02-15");
      expect(feb).toContain("February");

      const mar = formatDate("2024-03-15");
      expect(mar).toContain("March");

      const apr = formatDate("2024-04-15");
      expect(apr).toContain("April");

      const may = formatDate("2024-05-15");
      expect(may).toContain("May");

      const jun = formatDate("2024-06-15");
      expect(jun).toContain("June");

      const jul = formatDate("2024-07-15");
      expect(jul).toContain("July");

      const aug = formatDate("2024-08-15");
      expect(aug).toContain("August");

      const sep = formatDate("2024-09-15");
      expect(sep).toContain("September");

      const oct = formatDate("2024-10-15");
      expect(oct).toContain("October");

      const nov = formatDate("2024-11-15");
      expect(nov).toContain("November");

      const dec = formatDate("2024-12-15");
      expect(dec).toContain("December");
    });

    it("should use US locale format", () => {
      const date = new Date("2024-01-15");
      const result = formatDate(date);

      expect(result).toMatch(/January 15, 2024/);
    });

    it("should handle invalid date string gracefully", () => {
      const result = formatDate("invalid-date");

      expect(result).toContain("Invalid Date");
    });
  });
});
