"use client";

import { useState, useCallback } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ScriptRatingProps {
  value?: number;
  onChange?: (rating: number) => void;
  disabled?: boolean;
}

export function ScriptRating({
  value = 0,
  onChange,
  disabled = false,
}: ScriptRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const handleRate = useCallback(
    (ratingValue: number) => {
      if (disabled || !onChange) return;
      onChange(ratingValue);
    },
    [disabled, onChange],
  );

  const handleMouseEnter = useCallback(
    (ratingValue: number) => {
      if (disabled) return;
      setHoverRating(ratingValue);
    },
    [disabled],
  );

  const handleMouseLeave = useCallback(() => {
    setHoverRating(null);
  }, []);

  if (!onChange) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 ml-auto" aria-label="Rate script">
      {[1, 2, 3, 4, 5].map((ratingValue) => {
        const isActive = (hoverRating ?? value ?? 0) >= ratingValue;
        return (
          <button
            key={ratingValue}
            type="button"
            onClick={() => handleRate(ratingValue)}
            onMouseEnter={() => handleMouseEnter(ratingValue)}
            onMouseLeave={handleMouseLeave}
            disabled={disabled}
            className={cn(
              "p-1 rounded-md transition-colors",
              isActive ? "text-yellow-500" : "text-gray-300",
              disabled && "cursor-not-allowed opacity-50",
            )}
            aria-label={`Rate ${ratingValue} out of 5`}
            aria-pressed={isActive}
          >
            <Star className={cn("h-4 w-4", isActive && "fill-current")} />
          </button>
        );
      })}
    </div>
  );
}
