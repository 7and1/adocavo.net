"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Flame,
  TrendingUp,
  Sparkles,
  Bookmark,
  BookmarkCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Hook } from "@/lib/schema";

export interface HookCardProps {
  hook: Hook;
  onView?: (hookId: string) => void;
  isFavorited?: boolean;
  onToggleFavorite?: (hookId: string, isFavorited: boolean) => void;
  isLoading?: boolean;
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

export function HookCard({
  hook,
  onView,
  isFavorited = false,
  onToggleFavorite,
  isLoading = false,
}: HookCardProps) {
  const { id, text, category, engagementScore } = hook;
  const [localIsFavorited, setLocalIsFavorited] = useState(isFavorited);
  const [localIsLoading, setLocalIsLoading] = useState(isLoading);

  const heatLevel = getHeatLevel(engagementScore);

  const handleToggleFavorite = async () => {
    if (localIsLoading) return;

    const newFavoritedState = !localIsFavorited;
    setLocalIsFavorited(newFavoritedState);
    setLocalIsLoading(true);

    try {
      await onToggleFavorite?.(id, newFavoritedState);
    } catch (error) {
      // Revert on error
      setLocalIsFavorited(!newFavoritedState);
      throw error;
    } finally {
      setLocalIsLoading(false);
    }
  };

  return (
    <article
      className="group relative p-4 md:p-5 rounded-xl border border-gray-200 bg-white hover:shadow-lg hover:border-primary-300 transition-all duration-200 hover:-translate-y-0.5"
      role="listitem"
      aria-label={`Hook: ${text}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
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
        <Button
          size="icon"
          variant="ghost"
          className="h-11 min-w-[44px] w-11 hover:bg-gray-100 disabled:opacity-50"
          onClick={handleToggleFavorite}
          disabled={localIsLoading}
          aria-label={
            localIsFavorited ? "Remove from favorites" : "Add to favorites"
          }
          aria-pressed={localIsFavorited}
        >
          {localIsLoading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
          ) : localIsFavorited ? (
            <BookmarkCheck
              className="h-4 w-4 text-primary-600"
              aria-hidden="true"
            />
          ) : (
            <Bookmark
              className="h-4 w-4 text-gray-400 hover:text-primary-600"
              aria-hidden="true"
            />
          )}
        </Button>
      </div>

      <p className="text-gray-900 font-semibold text-base md:text-lg leading-snug mb-4 line-clamp-3">
        &quot;{text}&quot;
      </p>

      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/category/${category}`}
          prefetch
          className="px-3 py-2 text-xs uppercase tracking-wide text-gray-400 hover:text-primary-600 transition-colors rounded-lg hover:bg-gray-50 min-h-[44px] flex items-center"
          aria-label={`Browse ${category} hooks`}
        >
          {category}
        </Link>
        <Button
          size="default"
          className="gap-1.5 shadow-sm hover:shadow transition-shadow min-h-[44px] px-4"
          asChild
        >
          <Link
            href={`/remix/${id}`}
            prefetch
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
