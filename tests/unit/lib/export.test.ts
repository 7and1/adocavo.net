import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  exportScripts,
  exportAsTxt,
  exportAsJson,
  copyAllScripts,
  shareViaEmail,
  generateMailtoLink,
  copyJsonToClipboard,
  copyToNotionFormat,
  toNotionMarkdown,
  exportToPDF,
} from "@/lib/export";
import type { ExportData } from "@/lib/export/types";

describe("Export Library", () => {
  const mockExportData: ExportData = {
    title: "Test Scripts",
    description: "Test product description",
    generatedAt: new Date("2024-01-15T10:00:00Z"),
    scripts: [
      {
        angle: "Hook-driven",
        script: "[Visual: Product shot] (Audio: Upbeat music) Check this out!",
        index: 0,
      },
      {
        angle: "Problem-Solution",
        script:
          "Tired of boring content? [Visual: Transformation] This fixes it!",
        index: 1,
      },
    ],
  };

  describe("TXT Export", () => {
    it("should format text correctly", () => {
      const blobSpy = vi
        .spyOn(URL, "createObjectURL")
        .mockReturnValue("blob:https://test.com/abc");
      const linkSpy = vi.fn();
      const createElementSpy = vi
        .spyOn(document, "createElement")
        .mockReturnValue({
          href: "",
          download: "",
          click: linkSpy,
        } as any);
      const bodySpy = vi
        .spyOn(document.body, "appendChild")
        .mockReturnValue(null);
      const removeSpy = vi
        .spyOn(document.body, "removeChild")
        .mockReturnValue(null);

      exportAsTxt(mockExportData);

      expect(createElementSpy).toHaveBeenCalledWith("a");
      expect(linkSpy).toHaveBeenCalled();

      blobSpy.mockRestore();
      createElementSpy.mockRestore();
      bodySpy.mockRestore();
      removeSpy.mockRestore();
    });

    it("should copy all scripts to clipboard", async () => {
      const writeTextSpy = vi
        .spyOn(navigator.clipboard, "writeText")
        .mockResolvedValue();

      const result = await copyAllScripts(mockExportData);

      expect(result).toBe(true);
      expect(writeTextSpy).toHaveBeenCalled();
      const copiedText = writeTextSpy.mock.calls[0][0] as string;
      expect(copiedText).toContain("Test Scripts");
      expect(copiedText).toContain("Hook-driven");
      expect(copiedText).toContain("Problem-Solution");

      writeTextSpy.mockRestore();
    });
  });

  describe("JSON Export", () => {
    it("should export as JSON file", () => {
      const blobSpy = vi
        .spyOn(URL, "createObjectURL")
        .mockReturnValue("blob:https://test.com/abc");
      const linkSpy = vi.fn();
      const createElementSpy = vi
        .spyOn(document, "createElement")
        .mockReturnValue({
          href: "",
          download: "",
          click: linkSpy,
        } as any);
      const bodySpy = vi
        .spyOn(document.body, "appendChild")
        .mockReturnValue(null);
      const removeSpy = vi
        .spyOn(document.body, "removeChild")
        .mockReturnValue(null);

      exportAsJson(mockExportData);

      expect(createElementSpy).toHaveBeenCalledWith("a");
      expect(linkSpy).toHaveBeenCalled();

      blobSpy.mockRestore();
      createElementSpy.mockRestore();
      bodySpy.mockRestore();
      removeSpy.mockRestore();
    });

    it("should copy JSON to clipboard", async () => {
      const writeTextSpy = vi
        .spyOn(navigator.clipboard, "writeText")
        .mockResolvedValue();

      const result = await copyJsonToClipboard(mockExportData);

      expect(result).toBe(true);
      expect(writeTextSpy).toHaveBeenCalled();
      const copiedText = writeTextSpy.mock.calls[0][0] as string;
      const parsed = JSON.parse(copiedText);
      expect(parsed.title).toBe("Test Scripts");
      expect(parsed.scripts).toHaveLength(2);
      expect(parsed.generator).toBe("Adocavo.net");

      writeTextSpy.mockRestore();
    });
  });

  describe("Email Export", () => {
    it("should generate mailto link", () => {
      const link = generateMailtoLink(mockExportData);

      expect(link).toMatch(/^mailto:/);
      expect(link).toContain("subject=");
      expect(link).toContain("body=");
      expect(link).toContain("Test%20Scripts");
    });

    it("should open email client", () => {
      const openSpy = vi.spyOn(window, "open").mockReturnValue(null);

      shareViaEmail(mockExportData);

      expect(openSpy).toHaveBeenCalledWith(
        expect.stringContaining("mailto:"),
        "_blank",
      );

      openSpy.mockRestore();
    });
  });

  describe("Notion Export", () => {
    it("should format for Notion markdown", () => {
      const markdown = toNotionMarkdown(mockExportData);

      expect(markdown).toContain("# Test Scripts");
      expect(markdown).toContain("## Product Description");
      expect(markdown).toContain("### Hook-driven");
      expect(markdown).toContain("```text");
    });

    it("should copy to Notion format", async () => {
      const writeTextSpy = vi
        .spyOn(navigator.clipboard, "writeText")
        .mockResolvedValue();

      const result = await copyToNotionFormat(mockExportData);

      expect(result).toBe(true);
      expect(writeTextSpy).toHaveBeenCalled();
      const copiedText = writeTextSpy.mock.calls[0][0] as string;
      expect(copiedText).toContain("# Test Scripts");

      writeTextSpy.mockRestore();
    });
  });

  describe("Main Export Function", () => {
    it("should handle all export formats", async () => {
      const writeTextSpy = vi
        .spyOn(navigator.clipboard, "writeText")
        .mockResolvedValue();
      const blobSpy = vi
        .spyOn(URL, "createObjectURL")
        .mockReturnValue("blob:https://test.com/abc");
      const createElementSpy = vi
        .spyOn(document, "createElement")
        .mockReturnValue({
          href: "",
          download: "",
          click: vi.fn(),
        } as any);
      const bodySpy = vi
        .spyOn(document.body, "appendChild")
        .mockReturnValue(null);
      const removeSpy = vi
        .spyOn(document.body, "removeChild")
        .mockReturnValue(null);

      // Test copy-all
      let result = await exportScripts(mockExportData, "copy-all");
      expect(result).toBe(true);

      // Test notion
      result = await exportScripts(mockExportData, "notion");
      expect(result).toBe(true);

      // Test txt
      result = await exportScripts(mockExportData, "txt");
      expect(result).toBe(true);

      // Test json
      result = await exportScripts(mockExportData, "json");
      expect(result).toBe(true);

      writeTextSpy.mockRestore();
      blobSpy.mockRestore();
      createElementSpy.mockRestore();
      bodySpy.mockRestore();
      removeSpy.mockRestore();
    });
  });
});
