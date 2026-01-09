"use client";

import Link from "next/link";
import { Flame, TrendingUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Hook } from "@/lib/schema";

export interface HookCardProps {
  hook: Hook;
  onView?: (hookId: string) => void;
}

const heatStyles = {
  hot: "bg-red-50 text-red-700 border-red-200",
  warm: "bg-orange-50 text-orange-700 border-orange-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  cool: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cold: "bg-gray-100 text-gray-600 border-gray-200",
} as const;

const heatDescriptions = {
  hot: "Trending now",
  warm: "High engagement",
  medium: "Moderate engagement",
  cool: "Rising",
  cold: "New",
} as const;

export function HookCard({ hook, onView }: HookCardProps) {
  const { id, text, category, engagementScore } = hook;
  const heatLevel = getHeatLevel(engagementScore);

  return (
    <article
      className="group relative p-4 md:p-5 rounded-xl border border-gray-200 bg-white hover:shadow-lg hover:border-primary-300 transition-all duration-200 hover:-translate-y-0.5"
      role="listitem"
      aria-label={`Hook: ${text}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className={cn(
            "inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border",
            heatStyles[heatLevel],
          )}
        >
          <Flame className="h-3 w-3" aria-hidden="true" />
          <span>{heatLevel.toUpperCase()}</span>
          <span className="sr-only">- {heatDescriptions[heatLevel]}</span>
        </span>
        <span
          className="inline-flex items-center text-xs text-gray-500"
          aria-label={`Engagement score: ${engagementScore}`}
        >
          <TrendingUp className="h-3 w-3 mr-1" aria-hidden="true" />
          {engagementScore}
        </span>
      </div>

      <p className="text-gray-900 font-semibold text-base md:text-lg leading-snug mb-4 line-clamp-3">
        &quot;{text}&quot;
      </p>

      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/category/${category}`}
          className="text-xs uppercase tracking-wide text-gray-400 hover:text-primary-600 transition-colors"
          aria-label={`Browse ${category} hooks`}
        >
          {category}
        </Link>
        <Button
          size="sm"
          className="gap-1.5 shadow-sm hover:shadow transition-shadow"
          asChild
        >
          <Link
            href={`/remix/${id}`}
            onMouseEnter={() => onView?.(id)}
            aria-label={`Remix hook: ${text}`}
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Remix
          </Link>
        </Button>
      </div>
    </article>
  );
}

function getHeatLevel(score: number) {
  if (score >= 90) return "hot";
  if (score >= 75) return "warm";
  if (score >= 60) return "medium";
  if (score >= 40) return "cool";
  return "cold";
}
