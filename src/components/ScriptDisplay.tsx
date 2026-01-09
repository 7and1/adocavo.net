"use client";

import { useState, lazy, Suspense } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoLengthEstimator } from "@/components/VideoLengthEstimator";
import { cn } from "@/lib/utils";

// Dynamic imports for less frequently used icons to reduce bundle size
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

export interface ScriptDisplayProps {
  script: { angle: string; script: string };
  index: number;
  generationId?: string;
  onRegenerate?: (angle: string) => Promise<void>;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

const angleColors = {
  "Pain Point": "from-red-500 to-orange-500",
  Benefit: "from-green-500 to-teal-500",
  "Social Proof": "from-blue-500 to-purple-500",
} as const;

export function ScriptDisplay({
  script,
  index,
  onRegenerate,
  isFavorite = false,
  onToggleFavorite,
}: ScriptDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(script.script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setShowMoreActions(false);
  };

  const handleDownload = () => {
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
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${script.angle} TikTok Script`,
          text: script.script,
        });
      } catch {
        console.log("Share cancelled");
      }
    } else {
      await handleCopy();
    }
    setShowMoreActions(false);
  };

  const handleToggleFavorite = () => {
    onToggleFavorite?.();
    setShowMoreActions(false);
  };

  const handleRegenerate = async () => {
    if (!onRegenerate || regenerating) return;
    setRegenerating(true);
    setShowMoreActions(false);
    try {
      await onRegenerate(script.angle);
    } finally {
      setRegenerating(false);
    }
  };

  const gradientClass =
    angleColors[script.angle as keyof typeof angleColors] ||
    "from-gray-500 to-gray-600";

  return (
    <div
      data-testid="script-card"
      className="group relative flex flex-col rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
    >
      <div
        className={cn("px-4 py-3 bg-gradient-to-r text-white", gradientClass)}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold truncate">{script.angle}</h3>
            <p className="text-sm opacity-90">Variation {index + 1}</p>
          </div>
          <VideoLengthEstimator
            script={script.script}
            className="bg-white/20 text-white shrink-0"
          />
        </div>
      </div>

      <div className="flex-1 p-4 min-h-[200px]">
        <pre
          data-testid="script-content"
          className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed"
        >
          {formatScript(script.script)}
        </pre>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 p-3 sm:p-4 border-t border-gray-100 bg-gray-50/50">
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
          <span className="hidden xs:inline">
            {copied ? "Copied!" : "Copy"}
          </span>
          <span className="xs:hidden">{copied ? "Copied!" : "Copy"}</span>
        </Button>

        {/* Secondary actions - collapsed on mobile */}
        <div className="hidden sm:flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="px-2 h-8 hover:bg-gray-100"
            aria-label="Download script"
            onClick={handleDownload}
          >
            <IconLoader>
              <DownloadIcon className="h-4 w-4" />
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
                className="absolute right-0 bottom-full mb-1 z-20 min-w-[160px] rounded-lg bg-white border border-gray-200 shadow-lg py-1"
                role="menu"
              >
                <button
                  role="menuitem"
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                  onClick={handleDownload}
                >
                  <IconLoader>
                    <DownloadIcon className="h-4 w-4" aria-hidden="true" />
                  </IconLoader>
                  Download
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
                        className={cn(
                          "h-4 w-4",
                          regenerating && "animate-spin",
                        )}
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
      </div>

      {copied && (
        <div role="status" aria-live="polite" className="sr-only">
          Script copied to clipboard
        </div>
      )}
    </div>
  );
}

function formatScript(script: string): React.ReactNode {
  const parts = script.split(/(\[Visual:[^\]]+\]|\(Audio:[^)]+\))/g);

  return parts.map((part, index) => {
    if (part.startsWith("[Visual:")) {
      return (
        <span
          key={index}
          className="text-purple-600 font-medium"
          aria-label="Visual direction"
        >
          {part}
        </span>
      );
    }
    if (part.startsWith("(Audio:")) {
      return (
        <span
          key={index}
          className="text-blue-600 font-medium"
          aria-label="Audio direction"
        >
          {part}
        </span>
      );
    }
    return part;
  });
}
