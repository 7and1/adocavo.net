"use client";

import { useEffect } from "react";
import { ScriptDisplay } from "@/components/ScriptDisplay";
import type { Script } from "@/hooks/useScriptGeneration";

export interface GeneratedResultsProps {
  scripts: Script[];
  generationId?: string | null;
  favoriteIds?: Set<string>;
  ratings?: Record<number, number>;
  onToggleFavorite?: () => void;
  onRegenerate?: (angle: string) => Promise<void>;
  onRate?: (scriptIndex: number, rating: number) => void;
  shouldScroll?: boolean;
}

export function GeneratedResults({
  scripts,
  generationId,
  favoriteIds,
  ratings,
  onToggleFavorite,
  onRegenerate,
  onRate,
  shouldScroll = false,
}: GeneratedResultsProps) {
  const safeFavorites = favoriteIds ?? new Set<string>();
  const safeRatings = ratings ?? {};
  // Scroll to scripts when generated
  useEffect(() => {
    if (shouldScroll) {
      const element = document.getElementById("generated-scripts");
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [shouldScroll]);

  return (
    <div
      id="generated-scripts"
      className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Your Scripts</h2>
        <span className="text-sm text-gray-500">
          {scripts.length} variation{scripts.length !== 1 ? "s" : ""} generated
        </span>
      </div>
      <div className="grid gap-4 md:gap-6 lg:grid-cols-3 xl:grid-cols-3">
        {scripts.map((script, index) => (
          <ScriptDisplay
            key={index}
            script={script}
            index={index}
            generationId={generationId ?? undefined}
            onRegenerate={onRegenerate}
            isFavorite={generationId ? safeFavorites.has(generationId) : false}
            onToggleFavorite={onToggleFavorite}
            onRate={onRate ? (rating) => onRate(index, rating) : undefined}
            rating={safeRatings[index]}
          />
        ))}
      </div>
    </div>
  );
}
