"use client";

import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface GenerationProgressProps {
  step: number;
  steps: Array<{ label: string; detail: string }>;
}

export function GenerationProgress({ step, steps }: GenerationProgressProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-6 shadow-sm">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Sparkles className="h-4 w-4 text-primary-500" aria-hidden="true" />
        Crafting your scripts…
      </div>
      <ol className="space-y-3">
        {steps.map((item, index) => {
          const isActive = index === step;
          const isComplete = index < step;
          return (
            <li key={item.label} className="flex items-start gap-3">
              <span
                className={cn(
                  "mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border",
                  isComplete
                    ? "border-green-500 bg-green-50 text-green-600"
                    : isActive
                      ? "border-primary-500 bg-primary-50 text-primary-600"
                      : "border-gray-200 text-gray-400",
                )}
                aria-hidden="true"
              >
                {isComplete ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : isActive ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="text-xs font-semibold">{index + 1}</span>
                )}
              </span>
              <div>
                <p
                  className={cn(
                    "text-sm font-medium",
                    isActive || isComplete ? "text-gray-900" : "text-gray-500",
                  )}
                >
                  {item.label}
                </p>
                <p className="text-xs text-gray-500">{item.detail}</p>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 transition-all duration-700"
          style={{
            width: `${Math.min(100, ((step + 1) / steps.length) * 100)}%`,
          }}
        />
      </div>
    </div>
  );
}
