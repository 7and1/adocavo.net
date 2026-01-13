"use client";

import { ScriptContent } from "@/components/ScriptContent";
import { ScriptActions } from "@/components/ScriptActions";
import { ScriptRating } from "@/components/ScriptRating";

export interface ScriptDisplayProps {
  script: { angle: string; script: string };
  index: number;
  generationId?: string;
  onRegenerate?: (angle: string) => Promise<void>;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onRate?: (rating: number) => void;
  rating?: number;
}

export function ScriptDisplay({
  script,
  index,
  generationId,
  onRegenerate,
  isFavorite = false,
  onToggleFavorite,
  onRate,
  rating,
}: ScriptDisplayProps) {
  return (
    <div
      data-testid="script-card"
      className="group relative flex flex-col rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
    >
      <ScriptContent
        angle={script.angle}
        script={script.script}
        index={index}
      />

      <ScriptActions
        script={script}
        index={index}
        generationId={generationId}
        isFavorite={isFavorite}
        onToggleFavorite={onToggleFavorite}
        onRegenerate={onRegenerate}
      />

      {onRate && (
        <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-0 border-t border-gray-100 bg-gray-50/50 flex justify-end">
          <ScriptRating value={rating} onChange={onRate} />
        </div>
      )}
    </div>
  );
}
