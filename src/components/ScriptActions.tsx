"use client";

import { useState, lazy, Suspense, useCallback } from "react";
import { Copy, Check, FileText, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";

// Lazy load jsPDF for PDF export
const loadJsPDF = () =>
  import("jspdf").then((mod) => ({ default: mod.default }));

// Dynamic imports for less frequently used icons
const DownloadIcon = lazy(() =>
  import("lucide-react").then((mod) => ({ default: mod.Download })),
);
const Share2Icon = lazy(() =>
  import("lucide-react").then((mod) => ({ default: mod.Share2 })),
);
const BookmarkIcon = lazy(() =>
  import("lucide-react").then((mod) => ({ default: mod.Bookmark })),
);
const RotateCcwIcon = lazy(() =>
  import("lucide-react").then((mod) => ({ default: mod.RotateCcw })),
);
const MoreHorizontalIcon = lazy(() =>
  import("lucide-react").then((mod) => ({ default: mod.MoreHorizontal })),
);

function IconLoader({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="h-4 w-4" />}>{children}</Suspense>;
}

export interface ScriptActionsProps {
  script: { angle: string; script: string };
  index: number;
  generationId?: string;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onRegenerate?: (angle: string) => Promise<void>;
}

export function ScriptActions({
  script,
  index,
  generationId,
  isFavorite = false,
  onToggleFavorite,
  onRegenerate,
}: ScriptActionsProps) {
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(script.script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setShowMoreActions(false);
    trackEvent("script_copy", { generationId, angle: script.angle });
  }, [script.script, script.angle, generationId]);

  const handleDownloadText = useCallback(() => {
    const blob = new Blob([script.script], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tiktok-script-${script.angle.toLowerCase().replace(" ", "-")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowMoreActions(false);
    trackEvent("script_download_text", { generationId, angle: script.angle });
  }, [script.script, script.angle, generationId]);

  const handleDownloadPDF = useCallback(async () => {
    setExporting(true);
    try {
      const { default: jsPDF } = await loadJsPDF();

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 20;
      const maxWidth = pageWidth - margin * 2;
      let yPosition = margin;

      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.text(script.angle, margin, yPosition);
      yPosition += 15;

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Variation ${index + 1}`, margin, yPosition);
      yPosition += 10;

      pdf.setFontSize(12);
      const lines = pdf.splitTextToSize(script.script, maxWidth);

      lines.forEach((line: string) => {
        if (yPosition > 280) {
          pdf.addPage();
          yPosition = margin;
        }
        pdf.text(line, margin, yPosition);
        yPosition += 7;
      });

      pdf.save(
        `tiktok-script-${script.angle.toLowerCase().replace(" ", "-")}.pdf`,
      );
      setShowMoreActions(false);
      trackEvent("script_download_pdf", { generationId, angle: script.angle });
    } catch (error) {
      console.error("PDF generation failed:", error);
    } finally {
      setExporting(false);
    }
  }, [script.angle, script.script, index, generationId]);

  const handleEmailScript = useCallback(() => {
    const subject = encodeURIComponent(`My TikTok Script - ${script.angle}`);
    const body = encodeURIComponent(
      `Here's my TikTok script:\n\n${script.script}\n\nGenerated with Adocavo`,
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
    setShowMoreActions(false);
    trackEvent("script_email", { generationId, angle: script.angle });
  }, [script.angle, script.script, generationId]);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${script.angle} TikTok Script`,
          text: script.script,
        });
        trackEvent("script_share", { generationId, angle: script.angle });
      } catch {
        console.log("Share cancelled");
      }
    } else {
      await handleCopy();
    }
    setShowMoreActions(false);
  }, [script.angle, script.script, generationId, handleCopy]);

  const handleToggleFavorite = useCallback(() => {
    onToggleFavorite?.();
    setShowMoreActions(false);
  }, [onToggleFavorite]);

  const handleRegenerate = useCallback(async () => {
    if (!onRegenerate || regenerating) return;
    setRegenerating(true);
    setShowMoreActions(false);
    try {
      await onRegenerate(script.angle);
    } finally {
      setRegenerating(false);
    }
  }, [onRegenerate, regenerating, script.angle]);

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 sm:p-4 border-t border-gray-100 bg-gray-50/50">
      <Button
        variant={copied ? "default" : "outline"}
        size="sm"
        onClick={handleCopy}
        data-testid="copy-button"
        className={cn(
          "flex-1 gap-2 transition-all",
          copied &&
            "bg-green-500 hover:bg-green-600 text-white border-green-500",
        )}
      >
        <Copy
          className={cn("h-4 w-4", copied && "hidden")}
          aria-hidden="true"
        />
        <Check
          className={cn("h-4 w-4", !copied && "hidden")}
          aria-hidden="true"
        />
        <span className="hidden sm:inline">{copied ? "Copied!" : "Copy"}</span>
        <span className="sm:hidden">{copied ? "Copied!" : "Copy"}</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleDownloadText}
        className="sm:hidden"
        aria-label="Download as text"
      >
        <IconLoader>
          <DownloadIcon className="h-4 w-4" />
        </IconLoader>
      </Button>

      {/* Secondary actions - collapsed on mobile */}
      <div className="hidden sm:flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="px-2 h-8 hover:bg-gray-100"
          aria-label="Download as text"
          onClick={handleDownloadText}
        >
          <IconLoader>
            <FileText className="h-4 w-4" />
          </IconLoader>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="px-2 h-8 hover:bg-gray-100"
          aria-label="Download as PDF"
          onClick={handleDownloadPDF}
          disabled={exporting}
        >
          <IconLoader>
            {exporting ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
            ) : (
              <DownloadIcon className="h-4 w-4" />
            )}
          </IconLoader>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="px-2 h-8 hover:bg-gray-100"
          aria-label="Email script"
          onClick={handleEmailScript}
        >
          <IconLoader>
            <Mail className="h-4 w-4" />
          </IconLoader>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="px-2 h-8 hover:bg-gray-100"
          aria-label="Share script"
          onClick={handleShare}
        >
          <IconLoader>
            <Share2Icon className="h-4 w-4" />
          </IconLoader>
        </Button>

        {onToggleFavorite && (
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "px-2 h-8 hover:bg-gray-100",
              isFavorite &&
                "text-yellow-500 hover:text-yellow-600 hover:bg-yellow-50",
            )}
            aria-label={
              isFavorite ? "Remove from favorites" : "Add to favorites"
            }
            onClick={handleToggleFavorite}
          >
            <IconLoader>
              <BookmarkIcon
                className={cn("h-4 w-4", isFavorite && "fill-current")}
              />
            </IconLoader>
          </Button>
        )}

        {onRegenerate && (
          <Button
            variant="ghost"
            size="sm"
            className="px-2 h-8 hover:bg-gray-100"
            aria-label="Regenerate this angle"
            onClick={handleRegenerate}
            disabled={regenerating}
          >
            <IconLoader>
              <RotateCcwIcon
                className={cn("h-4 w-4", regenerating && "animate-spin")}
              />
            </IconLoader>
          </Button>
        )}
      </div>

      {/* Mobile more actions dropdown */}
      <div className="sm:hidden relative">
        <Button
          variant="ghost"
          size="sm"
          className="px-2 h-8 hover:bg-gray-100"
          aria-label="More actions"
          aria-expanded={showMoreActions}
          aria-haspopup="menu"
          onClick={() => setShowMoreActions(!showMoreActions)}
        >
          <IconLoader>
            <MoreHorizontalIcon className="h-4 w-4" />
          </IconLoader>
        </Button>

        {showMoreActions && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowMoreActions(false)}
              aria-hidden="true"
            />
            <div
              className="absolute right-0 bottom-full mb-1 z-20 min-w-[180px] rounded-lg bg-white border border-gray-200 shadow-lg py-1"
              role="menu"
            >
              <button
                role="menuitem"
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                onClick={handleDownloadText}
              >
                <IconLoader>
                  <FileText className="h-4 w-4" aria-hidden="true" />
                </IconLoader>
                Download as TXT
              </button>

              <button
                role="menuitem"
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
                onClick={handleDownloadPDF}
                disabled={exporting}
              >
                <IconLoader>
                  {exporting ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                  ) : (
                    <DownloadIcon className="h-4 w-4" aria-hidden="true" />
                  )}
                </IconLoader>
                Download as PDF
              </button>

              <button
                role="menuitem"
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                onClick={handleEmailScript}
              >
                <IconLoader>
                  <Mail className="h-4 w-4" aria-hidden="true" />
                </IconLoader>
                Email Script
              </button>
              <button
                role="menuitem"
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                onClick={handleShare}
              >
                <IconLoader>
                  <Share2Icon className="h-4 w-4" aria-hidden="true" />
                </IconLoader>
                Share
              </button>
              {onToggleFavorite && (
                <button
                  role="menuitem"
                  className={cn(
                    "w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2",
                    isFavorite && "text-yellow-600",
                  )}
                  onClick={handleToggleFavorite}
                >
                  <IconLoader>
                    <BookmarkIcon
                      className={cn("h-4 w-4", isFavorite && "fill-current")}
                      aria-hidden="true"
                    />
                  </IconLoader>
                  {isFavorite ? "Unfavorite" : "Favorite"}
                </button>
              )}
              {onRegenerate && (
                <button
                  role="menuitem"
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
                  onClick={handleRegenerate}
                  disabled={regenerating}
                >
                  <IconLoader>
                    <RotateCcwIcon
                      className={cn("h-4 w-4", regenerating && "animate-spin")}
                      aria-hidden="true"
                    />
                  </IconLoader>
                  Regenerate
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {copied && (
        <div role="status" aria-live="polite" className="sr-only">
          Script copied to clipboard
        </div>
      )}
    </div>
  );
}
