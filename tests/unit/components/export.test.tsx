import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ScriptActions } from "@/components/ScriptActions";
import * as jsPDF from "jspdf";

// Mock jsPDF
vi.mock("jspdf", () => ({
  default: vi.fn().mockImplementation(() => ({
    internal: {
      pageSize: { getWidth: () => 210 },
    },
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    text: vi.fn(),
    splitTextToSize: vi.fn((text) => [text, text, text]),
    addPage: vi.fn(),
    save: vi.fn(),
  })),
}));

// Mock analytics
vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

// Mock navigator.share
const mockShare = vi.fn();
Object.defineProperty(navigator, "share", {
  writable: true,
  value: mockShare,
});

// Mock navigator.clipboard
const mockClipboard = {
  writeText: vi.fn().mockResolvedValue(undefined),
};
Object.defineProperty(navigator, "clipboard", {
  writable: true,
  value: mockClipboard,
});

// Mock URL and document methods for download
const mockCreateObjectURL = vi.fn(() => "blob:mock-url");
const mockRevokeObjectURL = vi.fn();
global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

describe("Unit: Export Functionality", () => {
  const mockScript = {
    angle: "Pain Point",
    script:
      "[Visual: Close-up of frustrated face with acne]\n\nStop scrolling if you're tired of products that don't work.\n\nI found a solution that changed everything.",
  };

  const defaultProps = {
    script: mockScript,
    index: 0,
    generationId: "gen-123",
    isFavorite: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock document methods
    document.body.appendChild = vi.fn();
    document.body.removeChild = vi.fn();
    // Create mock element
    global.document.createElement = vi.fn((tag) => ({
      tagName: tag.toUpperCase(),
      href: "",
      download: "",
      click: vi.fn(),
      style: {},
    })) as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Copy to Clipboard", () => {
    it("should copy script text to clipboard", async () => {
      render(<ScriptActions {...defaultProps} />);

      const copyButton = screen.getByRole("button", { name: /copy/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalledWith(mockScript.script);
      });
    });

    it("should show copied state after successful copy", async () => {
      render(<ScriptActions {...defaultProps} />);

      const copyButton = screen.getByRole("button", { name: /copy/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText(/copied!/i)).toBeInTheDocument();
      });
    });

    it("should reset copied state after timeout", async () => {
      vi.useFakeTimers();
      render(<ScriptActions {...defaultProps} />);

      const copyButton = screen.getByRole("button", { name: /copy/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText(/copied!/i)).toBeInTheDocument();
      });

      vi.advanceTimersByTime(2000);

      await waitFor(() => {
        expect(screen.queryByText(/copied!/i)).not.toBeInTheDocument();
      });

      vi.useRealTimers();
    });

    it("should track copy event", async () => {
      const { trackEvent } = await import("@/lib/analytics");
      render(<ScriptActions {...defaultProps} />);

      const copyButton = screen.getByRole("button", { name: /copy/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(trackEvent).toHaveBeenCalledWith("script_copy", {
          generationId: "gen-123",
          angle: "Pain Point",
        });
      });
    });

    it("should handle clipboard errors gracefully", async () => {
      mockClipboard.writeText.mockRejectedValueOnce(
        new Error("Clipboard denied"),
      );

      render(<ScriptActions {...defaultProps} />);

      const copyButton = screen.getByRole("button", { name: /copy/i });
      fireEvent.click(copyButton);

      // Should not throw, should handle error
      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalled();
      });
    });
  });

  describe("Download as Text", () => {
    it("should create text file with script content", async () => {
      render(<ScriptActions {...defaultProps} />);

      const downloadButton = screen.getByRole("button", {
        name: /download as text/i,
      });
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalled();
        const blobArg = mockCreateObjectURL.mock.calls[0][0];
        expect(blobArg).toBeInstanceOf(Blob);
        expect(blobArg.type).toBe("text/plain");
      });
    });

    it("should generate correct filename for text download", async () => {
      const mockElement = {
        tagName: "A",
        href: "",
        download: "",
        click: vi.fn(),
      };
      global.document.createElement = vi.fn(() => mockElement as any);

      render(<ScriptActions {...defaultProps} />);

      const downloadButton = screen.getByRole("button", {
        name: /download as text/i,
      });
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(mockElement.download).toBe("tiktok-script-pain-point.txt");
      });
    });

    it("should clean filename by replacing spaces with hyphens", async () => {
      const mockElement = {
        tagName: "A",
        href: "",
        download: "",
        click: vi.fn(),
      };
      global.document.createElement = vi.fn(() => mockElement as any);

      const props = {
        ...defaultProps,
        script: {
          ...mockScript,
          angle: "Social Proof With Emojis",
        },
      };

      render(<ScriptActions {...props} />);

      const downloadButton = screen.getByRole("button", {
        name: /download as text/i,
      });
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(mockElement.download).toBe(
          "tiktok-script-social-proof-with-emojis.txt",
        );
      });
    });

    it("should track download event", async () => {
      const { trackEvent } = await import("@/lib/analytics");
      render(<ScriptActions {...defaultProps} />);

      const downloadButton = screen.getByRole("button", {
        name: /download as text/i,
      });
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(trackEvent).toHaveBeenCalledWith("script_download_text", {
          generationId: "gen-123",
          angle: "Pain Point",
        });
      });
    });

    it("should revoke blob URL after download", async () => {
      render(<ScriptActions {...defaultProps} />);

      const downloadButton = screen.getByRole("button", {
        name: /download as text/i,
      });
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(mockRevokeObjectURL).toHaveBeenCalled();
      });
    });
  });

  describe("Download as PDF", () => {
    it("should initialize jsPDF with correct settings", async () => {
      render(<ScriptActions {...defaultProps} />);

      const pdfButton = screen.getByRole("button", {
        name: /download as pdf/i,
      });
      fireEvent.click(pdfButton);

      await waitFor(() => {
        expect(jsPDF.default).toHaveBeenCalledWith({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });
      });
    });

    it("should add title to PDF", async () => {
      const mockPdf = {
        internal: { pageSize: { getWidth: () => 210 } },
        setFontSize: vi.fn(),
        setFont: vi.fn(),
        text: vi.fn(),
        splitTextToSize: vi.fn((text) => [text, text, text]),
        addPage: vi.fn(),
        save: vi.fn(),
      };
      (jsPDF.default as any).mockImplementation(() => mockPdf);

      render(<ScriptActions {...defaultProps} />);

      const pdfButton = screen.getByRole("button", {
        name: /download as pdf/i,
      });
      fireEvent.click(pdfButton);

      await waitFor(() => {
        expect(mockPdf.setFont).toHaveBeenCalledWith("helvetica", "bold");
        expect(mockPdf.setFontSize).toHaveBeenCalledWith(20);
        expect(mockPdf.text).toHaveBeenCalledWith("Pain Point", 20, 20);
      });
    });

    it("should add script content to PDF", async () => {
      const mockPdf = {
        internal: { pageSize: { getWidth: () => 210 } },
        setFontSize: vi.fn(),
        setFont: vi.fn(),
        text: vi.fn(),
        splitTextToSize: vi.fn((text) => text.split("\n")),
        addPage: vi.fn(),
        save: vi.fn(),
      };
      (jsPDF.default as any).mockImplementation(() => mockPdf);

      render(<ScriptActions {...defaultProps} />);

      const pdfButton = screen.getByRole("button", {
        name: /download as pdf/i,
      });
      fireEvent.click(pdfButton);

      await waitFor(() => {
        expect(mockPdf.splitTextToSize).toHaveBeenCalledWith(
          mockScript.script,
          170,
        );
      });
    });

    it("should save PDF with correct filename", async () => {
      const mockPdf = {
        internal: { pageSize: { getWidth: () => 210 } },
        setFontSize: vi.fn(),
        setFont: vi.fn(),
        text: vi.fn(),
        splitTextToSize: vi.fn((text) => [text]),
        addPage: vi.fn(),
        save: vi.fn(),
      };
      (jsPDF.default as any).mockImplementation(() => mockPdf);

      render(<ScriptActions {...defaultProps} />);

      const pdfButton = screen.getByRole("button", {
        name: /download as pdf/i,
      });
      fireEvent.click(pdfButton);

      await waitFor(() => {
        expect(mockPdf.save).toHaveBeenCalledWith(
          "tiktok-script-pain-point.pdf",
        );
      });
    });

    it("should show loading state during PDF generation", async () => {
      const mockPdf = {
        internal: { pageSize: { getWidth: () => 210 } },
        setFontSize: vi.fn(),
        setFont: vi.fn(),
        text: vi.fn(),
        splitTextToSize: vi.fn((text) => [text]),
        addPage: vi.fn(),
        save: vi.fn(),
      };

      let resolveSave: () => void;
      const savePromise = new Promise<void>((resolve) => {
        resolveSave = resolve;
      });
      mockPdf.save = vi.fn(() => savePromise);

      (jsPDF.default as any).mockImplementation(() => mockPdf);

      render(<ScriptActions {...defaultProps} />);

      const pdfButton = screen.getByRole("button", {
        name: /download as pdf/i,
      });

      fireEvent.click(pdfButton);

      await waitFor(() => {
        expect(pdfButton).toBeDisabled();
      });

      resolveSave!();

      await waitFor(() => {
        expect(pdfButton).not.toBeDisabled();
      });
    });

    it("should handle PDF generation errors", async () => {
      (jsPDF.default as any).mockImplementation(() => {
        throw new Error("PDF generation failed");
      });

      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      render(<ScriptActions {...defaultProps} />);

      const pdfButton = screen.getByRole("button", {
        name: /download as pdf/i,
      });
      fireEvent.click(pdfButton);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          "PDF generation failed:",
          expect.any(Error),
        );
      });

      consoleError.mockRestore();
    });

    it("should track PDF download event", async () => {
      const { trackEvent } = await import("@/lib/analytics");
      const mockPdf = {
        internal: { pageSize: { getWidth: () => 210 } },
        setFontSize: vi.fn(),
        setFont: vi.fn(),
        text: vi.fn(),
        splitTextToSize: vi.fn((text) => [text]),
        addPage: vi.fn(),
        save: vi.fn(),
      };
      (jsPDF.default as any).mockImplementation(() => mockPdf);

      render(<ScriptActions {...defaultProps} />);

      const pdfButton = screen.getByRole("button", {
        name: /download as pdf/i,
      });
      fireEvent.click(pdfButton);

      await waitFor(() => {
        expect(trackEvent).toHaveBeenCalledWith("script_download_pdf", {
          generationId: "gen-123",
          angle: "Pain Point",
        });
      });
    });
  });

  describe("Email Script", () => {
    it("should open email client with correct subject and body", () => {
      const mockOpen = vi.fn();
      global.window.open = mockOpen;

      render(<ScriptActions {...defaultProps} />);

      const emailButton = screen.getByRole("button", {
        name: /email script/i,
      });
      fireEvent.click(emailButton);

      expect(mockOpen).toHaveBeenCalledWith(expect.stringContaining("mailto:"));

      const args = mockOpen.mock.calls[0][0] as string;
      expect(args).toContain("subject=");
      expect(args).toContain("Pain%20Point");
      expect(args).toContain("body=");
      expect(args).toContain(encodeURIComponent(mockScript.script));
    });

    it("should include proper email body formatting", () => {
      const mockOpen = vi.fn();
      global.window.open = mockOpen;

      render(<ScriptActions {...defaultProps} />);

      const emailButton = screen.getByRole("button", {
        name: /email script/i,
      });
      fireEvent.click(emailButton);

      const args = mockOpen.mock.calls[0][0] as string;
      expect(args).toContain("Here's%20my%20TikTok%20script");
      expect(args).toContain("Generated%20with%20Adocavo");
    });

    it("should track email event", async () => {
      const { trackEvent } = await import("@/lib/analytics");
      global.window.open = vi.fn();

      render(<ScriptActions {...defaultProps} />);

      const emailButton = screen.getByRole("button", {
        name: /email script/i,
      });
      fireEvent.click(emailButton);

      await waitFor(() => {
        expect(trackEvent).toHaveBeenCalledWith("script_email", {
          generationId: "gen-123",
          angle: "Pain Point",
        });
      });
    });
  });

  describe("Share Functionality", () => {
    it("should use native share when available", async () => {
      render(<ScriptActions {...defaultProps} />);

      const shareButton = screen.getByRole("button", {
        name: /share/i,
      });
      fireEvent.click(shareButton);

      await waitFor(() => {
        expect(mockShare).toHaveBeenCalledWith({
          title: "Pain Point TikTok Script",
          text: mockScript.script,
        });
      });
    });

    it("should track share event when successful", async () => {
      const { trackEvent } = await import("@/lib/analytics");
      mockShare.mockResolvedValueOnce(undefined);

      render(<ScriptActions {...defaultProps} />);

      const shareButton = screen.getByRole("button", {
        name: /share/i,
      });
      fireEvent.click(shareButton);

      await waitFor(() => {
        expect(trackEvent).toHaveBeenCalledWith("script_share", {
          generationId: "gen-123",
          angle: "Pain Point",
        });
      });
    });

    it("should fall back to copy when share is cancelled", async () => {
      mockShare.mockRejectedValueOnce(new Error("Share cancelled"));

      render(<ScriptActions {...defaultProps} />);

      const shareButton = screen.getByRole("button", {
        name: /share/i,
      });
      fireEvent.click(shareButton);

      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalled();
      });
    });

    it("should handle share when navigator.share is unavailable", () => {
      Object.defineProperty(navigator, "share", {
        writable: true,
        value: undefined,
      });

      render(<ScriptActions {...defaultProps} />);

      const shareButton = screen.getByRole("button", {
        name: /share/i,
      });
      fireEvent.click(shareButton);

      expect(mockClipboard.writeText).toHaveBeenCalled();
    });
  });

  describe("Favorite Toggle", () => {
    it("should call onToggleFavorite when favorite button clicked", async () => {
      const onToggleFavorite = vi.fn();
      render(
        <ScriptActions {...defaultProps} onToggleFavorite={onToggleFavorite} />,
      );

      const favoriteButton = screen.getByRole("button", {
        name: /add to favorites/i,
      });
      fireEvent.click(favoriteButton);

      expect(onToggleFavorite).toHaveBeenCalled();
    });

    it("should display correct state for favorited script", () => {
      render(<ScriptActions {...defaultProps} isFavorite={true} />);

      const favoriteButton = screen.getByRole("button", {
        name: /remove from favorites/i,
      });
      expect(favoriteButton).toBeInTheDocument();
    });
  });

  describe("Regenerate", () => {
    it("should call onRegenerate with correct angle when clicked", async () => {
      const onRegenerate = vi.fn().mockResolvedValue(undefined);
      render(<ScriptActions {...defaultProps} onRegenerate={onRegenerate} />);

      const regenerateButton = screen.getByRole("button", {
        name: /regenerate/i,
      });
      fireEvent.click(regenerateButton);

      await waitFor(() => {
        expect(onRegenerate).toHaveBeenCalledWith("Pain Point");
      });
    });

    it("should show loading state during regeneration", async () => {
      let resolveRegenerate: () => void;
      const regeneratePromise = new Promise<void>((resolve) => {
        resolveRegenerate = resolve;
      });
      const onRegenerate = vi.fn(() => regeneratePromise);

      render(<ScriptActions {...defaultProps} onRegenerate={onRegenerate} />);

      const regenerateButton = screen.getByRole("button", {
        name: /regenerate/i,
      });
      fireEvent.click(regenerateButton);

      await waitFor(() => {
        expect(regenerateButton).toBeDisabled();
      });

      resolveRegenerate!();

      await waitFor(() => {
        expect(regenerateButton).not.toBeDisabled();
      });
    });

    it("should not regenerate if already regenerating", async () => {
      const onRegenerate = vi.fn(
        () => new Promise(() => {}), // Never resolves
      );

      render(<ScriptActions {...defaultProps} onRegenerate={onRegenerate} />);

      const regenerateButton = screen.getByRole("button", {
        name: /regenerate/i,
      });

      fireEvent.click(regenerateButton);
      fireEvent.click(regenerateButton);
      fireEvent.click(regenerateButton);

      await waitFor(() => {
        expect(onRegenerate).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("Accessibility", () => {
    it("should have proper aria-labels on buttons", () => {
      render(<ScriptActions {...defaultProps} />);

      expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /download as text/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /download as pdf/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /email script/i }),
      ).toBeInTheDocument();
    });

    it("should have proper aria-disabled on disabled buttons", async () => {
      const onRegenerate = vi.fn(() => new Promise(() => {}));

      render(<ScriptActions {...defaultProps} onRegenerate={onRegenerate} />);

      const regenerateButton = screen.getByRole("button", {
        name: /regenerate/i,
      });
      fireEvent.click(regenerateButton);

      await waitFor(() => {
        expect(regenerateButton).toBeDisabled();
      });
    });

    it("should announce copy action to screen readers", async () => {
      render(<ScriptActions {...defaultProps} />);

      const copyButton = screen.getByRole("button", { name: /copy/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        const status = screen.getByRole("status");
        expect(status).toBeInTheDocument();
        expect(status).toHaveTextContent(/script copied/i);
      });
    });
  });
});
