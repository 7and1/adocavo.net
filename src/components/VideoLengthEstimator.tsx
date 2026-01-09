import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoLengthEstimatorProps {
  script: string;
  className?: string;
}

const WORDS_PER_SECOND = 2.5;

export function getEstimatedDuration(script: string): number {
  const cleanScript = script
    .replace(/\[Visual:[^\]]+\]/g, "")
    .replace(/\(Audio:[^)]+\)/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const wordCount = cleanScript.split(/\s+/).filter((w) => w.length > 0).length;
  return Math.round(wordCount / WORDS_PER_SECOND);
}

export function getDurationCategory(
  seconds: number,
): "optimal" | "good" | "long" {
  if (seconds <= 30) return "optimal";
  if (seconds <= 45) return "good";
  return "long";
}

export function VideoLengthEstimator({
  script,
  className,
}: VideoLengthEstimatorProps) {
  const seconds = getEstimatedDuration(script);
  const category = getDurationCategory(seconds);

  const colors = {
    optimal: "text-green-600 bg-green-50 border-green-200",
    good: "text-amber-600 bg-amber-50 border-amber-200",
    long: "text-orange-600 bg-orange-50 border-orange-200",
  };

  const labels = {
    optimal: "Optimal",
    good: "Good",
    long: "Long",
  };

  const descriptions = {
    optimal: "Optimal length for TikTok",
    good: "Good length for TikTok",
    long: "May be long for TikTok",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
        colors[category],
        className,
      )}
      title={descriptions[category]}
    >
      <Clock className="h-3 w-3" aria-hidden="true" />
      <span aria-label={`${seconds} seconds`}>{seconds}s</span>
      <span className="opacity-70" aria-label={labels[category]}>
        {labels[category]}
      </span>
    </div>
  );
}
