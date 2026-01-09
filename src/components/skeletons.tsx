import { Skeleton } from "@/components/ui/skeleton";

export function HookGridSkeleton() {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6"
      role="status"
      aria-live="polite"
      aria-label="Loading hooks"
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="p-4 md:p-5 rounded-xl border border-gray-200 bg-white"
          aria-hidden="true"
        >
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="h-20 w-full mb-4 rounded" />
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-16 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
