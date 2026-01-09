"use client";

import { useState, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Trash2,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Sparkles,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export interface GeneratedScript {
  id: string;
  hookText: string;
  productDescription: string;
  scripts: Array<{ angle: string; script: string }>;
  createdAt: Date;
}

export interface ScriptHistoryProps {
  scripts: GeneratedScript[];
  onDelete: (id: string) => Promise<void>;
}

export function ScriptHistory({
  scripts: initialScripts,
  onDelete,
}: ScriptHistoryProps) {
  const [scripts, setScripts] = useState(initialScripts);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<string | null>(null);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm("Are you sure you want to delete this script?")) {
        return;
      }

      setDeleting(id);
      try {
        await onDelete(id);
        setScripts((prev) => prev.filter((s) => s.id !== id));
      } finally {
        setDeleting(null);
      }
    },
    [onDelete],
  );

  if (scripts.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
          <FileText className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No scripts yet
        </h3>
        <p className="text-gray-500 max-w-md mx-auto mb-6">
          Start generating TikTok ad scripts by browsing our hook library and
          selecting a hook to remix.
        </p>
        <Button asChild size="lg" className="gap-2">
          <Link href="/">
            <Sparkles className="h-5 w-5" />
            Browse Hook Library
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {scripts.map((script) => (
        <Collapsible
          key={script.id}
          open={expandedIds.has(script.id)}
          onOpenChange={() => toggleExpanded(script.id)}
        >
          <div className="border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 p-4 hover:bg-gray-50/50 transition-colors">
              <CollapsibleTrigger
                className="flex-1 flex items-center gap-3 text-left focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-lg -ml-3 p-3"
                aria-label="Toggle script details"
              >
                {expandedIds.has(script.id) ? (
                  <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 line-clamp-1">
                    &quot;{script.hookText}&quot;
                  </p>
                  <p
                    className="text-sm text-gray-500"
                    aria-label="Created date"
                  >
                    {formatDistanceToNow(script.createdAt, { addSuffix: true })}
                    <span className="sr-only"> ago</span>
                  </p>
                </div>
              </CollapsibleTrigger>

              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(script.id);
                }}
                disabled={deleting === script.id}
                className="text-gray-400 hover:text-red-500 hover:bg-red-50 focus:text-red-500 focus:bg-red-50 shrink-0"
                aria-label={
                  deleting === script.id ? "Deleting..." : "Delete script"
                }
              >
                <Trash2
                  className={cn(
                    "h-4 w-4",
                    deleting === script.id && "animate-pulse",
                  )}
                />
              </Button>
            </div>

            <CollapsibleContent>
              <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50/50">
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    Product Description
                  </p>
                  <p className="text-sm text-gray-700 line-clamp-2">
                    {script.productDescription}
                  </p>
                </div>

                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                  Generated Scripts ({script.scripts.length})
                </p>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {script.scripts.map((s) => (
                    <ScriptPreview key={s.angle} script={s} />
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      ))}
    </div>
  );
}

function ScriptPreview({
  script,
}: {
  script: { angle: string; script: string };
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(script.script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-3 rounded-lg bg-white border border-gray-200 hover:border-gray-300 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500">
          {script.angle}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            "p-1.5 rounded-md transition-colors",
            copied
              ? "bg-green-100 text-green-600"
              : "hover:bg-gray-100 text-gray-400 hover:text-gray-600",
          )}
          aria-label={copied ? "Copied!" : "Copy script"}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
      <p className="text-sm text-gray-700 line-clamp-4 leading-relaxed">
        {script.script}
      </p>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}
