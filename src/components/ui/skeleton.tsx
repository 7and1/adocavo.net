import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-gray-100",
        "after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_1.5s_infinite]",
        "after:bg-gradient-to-r after:from-transparent after:via-white/50 after:to-transparent",
        className,
      )}
    />
  );
}
