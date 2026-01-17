"use client";

import { useState, useCallback, lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import {
  exportScripts,
  type ExportData,
  type ExportFormat,
} from "@/lib/export";

// Lazy load icons
const DownloadIcon = lazy(() =>
  import("lucide-react").then((mod) => ({ default: mod.Download })),
);
const FileTextIcon = lazy(() =>
  import("lucide-react").then((mod) => ({ default: mod.FileText })),
);
const CopyIcon = lazy(() =>
  import("lucide-react").then((mod) => ({ default: mod.Copy })),
);
const CheckIcon = lazy(() =>
  import("lucide-react").then((mod) => ({ default: mod.Check })),
);
const ChevronDownIcon = lazy(() =>
  import("lucide-react").then((mod) => ({ default: mod.ChevronDown })),
);
const LoaderIcon = lazy(() =>
  import("lucide-react").then((mod) => ({ default: mod.Loader2 })),
);
const MailIcon = lazy(() =>
  import("lucide-react").then((mod) => ({ default: mod.Mail })),
);
const FileJsonIcon = lazy(() =>
  import("lucide-react").then((mod) => ({ default: mod.FileJson })),
);

function IconLoader({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="h-4 w-4" />}>{children}</Suspense>;
}

export interface ExportButtonProps {
  data: ExportData;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
  trackingId?: string;
}

const exportFormats: Array<{
  format: ExportFormat;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    format: "copy-all",
    label: "Copy All",
    description: "Copy all scripts to clipboard",
    icon: (
      <IconLoader>
        <CopyIcon className="h-4 w-4" />
      </IconLoader>
    ),
  },
  {
    format: "notion",
    label: "Notion Format",
    description: "Copy formatted for Notion",
    icon: (
      <IconLoader>
        <FileTextIcon className="h-4 w-4" />
      </IconLoader>
    ),
  },
  {
    format: "txt",
    label: "Download TXT",
    description: "Download as text file",
    icon: (
      <IconLoader>
        <DownloadIcon className="h-4 w-4" />
      </IconLoader>
    ),
  },
  {
    format: "json",
    label: "Download JSON",
    description: "Download as JSON file",
    icon: (
      <IconLoader>
        <FileJsonIcon className="h-4 w-4" />
      </IconLoader>
    ),
  },
  {
    format: "pdf",
    label: "Download PDF",
    description: "Download as PDF file",
    icon: (
      <IconLoader>
        <FileTextIcon className="h-4 w-4" />
      </IconLoader>
    ),
  },
  {
    format: "email",
    label: "Share via Email",
    description: "Open email client",
    icon: (
      <IconLoader>
        <MailIcon className="h-4 w-4" />
      </IconLoader>
    ),
  },
];

export function ExportButton({
  data,
  variant = "outline",
  size = "sm",
  className,
  trackingId,
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [copiedFormat, setCopiedFormat] = useState<ExportFormat | null>(null);

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      setExporting(format);
      setIsOpen(false);

      try {
        const success = await exportScripts(data, format);

        if (success) {
          if (format === "copy-all" || format === "notion") {
            setCopiedFormat(format);
            setTimeout(() => setCopiedFormat(null), 2000);
          }
          trackEvent("script_export", {
            format,
            trackingId,
            scriptCount: data.scripts.length,
          });
        }
      } finally {
        setExporting(null);
      }
    },
    [data, trackingId],
  );

  return (
    <div className="relative">
      <Button
        variant={variant}
        size={size}
        className={cn("gap-2", className)}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <IconLoader>
          {exporting ? (
            <LoaderIcon className="h-4 w-4 animate-spin" />
          ) : (
            <DownloadIcon className="h-4 w-4" />
          )}
        </IconLoader>
        <span>Export</span>
        <IconLoader>
          <ChevronDownIcon
            className={cn(
              "h-4 w-4 transition-transform",
              isOpen && "rotate-180",
            )}
          />
        </IconLoader>
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div
            className="absolute right-0 top-full z-20 min-w-[200px] rounded-lg bg-white border border-gray-200 shadow-lg py-1 mt-1"
            role="menu"
          >
            {exportFormats.map(({ format, label, description, icon }) => {
              const isLoading = exporting === format;
              const isCopied = copiedFormat === format;

              return (
                <button
                  key={format}
                  role="menuitem"
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm hover:bg-gray-50",
                    "flex items-center gap-3 transition-colors",
                    isLoading && "opacity-70 cursor-wait",
                  )}
                  onClick={() => handleExport(format)}
                  disabled={isLoading}
                >
                  <span
                    className={cn(
                      "shrink-0 text-gray-500",
                      isCopied && "text-green-500",
                    )}
                  >
                    {isCopied ? (
                      <IconLoader>
                        <CheckIcon className="h-4 w-4" />
                      </IconLoader>
                    ) : isLoading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                    ) : (
                      icon
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900">{label}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
