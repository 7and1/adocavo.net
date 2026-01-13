"use client";

import { VideoLengthEstimator } from "@/components/VideoLengthEstimator";
import { cn } from "@/lib/utils";

export interface ScriptContentProps {
  angle: string;
  script: string;
  index: number;
}

const ANGLE_COLORS = {
  "Pain Point": "from-red-500 to-orange-500",
  Benefit: "from-green-500 to-teal-500",
  "Social Proof": "from-blue-500 to-purple-500",
} as const;

export function ScriptContent({ angle, script, index }: ScriptContentProps) {
  const gradientClass =
    ANGLE_COLORS[angle as keyof typeof ANGLE_COLORS] ||
    "from-gray-500 to-gray-600";

  return (
    <>
      <div
        className={cn("px-4 py-3 bg-gradient-to-r text-white", gradientClass)}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold truncate">{angle}</h3>
            <p className="text-sm opacity-90">Variation {index + 1}</p>
          </div>
          <VideoLengthEstimator
            script={script}
            className="bg-white/20 text-white shrink-0"
          />
        </div>
      </div>

      <div className="flex-1 p-4 min-h-[200px]">
        <pre
          data-testid="script-content"
          className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed"
        >
          {formatScript(script)}
        </pre>
      </div>
    </>
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
