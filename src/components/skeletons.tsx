import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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

export function ScriptCardSkeleton() {
  return (
    <div
      className="rounded-xl border border-gray-200 bg-white overflow-hidden"
      role="status"
      aria-label="Loading script"
    >
      <div className="h-16 bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4 rounded" />
        <Skeleton className="h-4 w-1/2 rounded" />
        <Skeleton className="h-4 w-5/6 rounded" />
        <Skeleton className="h-4 w-2/3 rounded" />
        <Skeleton className="h-4 w-3/4 rounded" />
      </div>
      <div className="h-14 bg-gray-50 border-t border-gray-100 animate-pulse" />
    </div>
  );
}

export function PageHeaderSkeleton({
  hasSubtitle = false,
}: {
  hasSubtitle?: boolean;
}) {
  return (
    <div className="mb-8" role="status" aria-label="Loading header">
      <Skeleton className="h-9 w-3/4 mb-3 rounded" />
      {hasSubtitle && <Skeleton className="h-5 w-full mb-4 rounded" />}
      <div className="flex gap-2">
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-32 rounded-full" />
        <Skeleton className="h-8 w-28 rounded-full" />
      </div>
    </div>
  );
}

export function ContentSkeleton({
  lineCount = 6,
  className,
}: {
  lineCount?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("space-y-3", className)}
      role="status"
      aria-label="Loading content"
    >
      {Array.from({ length: lineCount }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4 rounded",
            i === lineCount - 1 ? "w-2/3" : "w-full",
          )}
        />
      ))}
    </div>
  );
}

export function ButtonSkeleton({
  width = "w-24",
  className,
}: {
  width?: string;
  className?: string;
}) {
  return (
    <div role="status" aria-label="Loading button">
      <Skeleton className={cn("h-11 rounded-lg", width, className)} />
    </div>
  );
}

export function CardGridSkeleton({
  count = 6,
  cardHeight = "h-48",
}: {
  count?: number;
  cardHeight?: string;
}) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
      role="status"
      aria-label="Loading cards"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-gray-200 bg-white p-5"
          aria-hidden="true"
        >
          <Skeleton className={cn("w-full rounded-lg mb-4", cardHeight)} />
          <Skeleton className="h-5 w-3/4 mb-2 rounded" />
          <Skeleton className="h-4 w-full mb-4 rounded" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({
  rowCount = 5,
  columnCount = 4,
}: {
  rowCount?: number;
  columnCount?: number;
}) {
  return (
    <div
      className="w-full border border-gray-200 rounded-lg overflow-hidden"
      role="status"
      aria-label="Loading table"
    >
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 p-4">
        <div className="flex gap-4">
          {Array.from({ length: columnCount }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-24 rounded" />
          ))}
        </div>
      </div>
      {/* Rows */}
      <div className="divide-y divide-gray-200">
        {Array.from({ length: rowCount }).map((_, i) => (
          <div key={i} className="p-4">
            <div className="flex gap-4">
              {Array.from({ length: columnCount }).map((_, j) => (
                <Skeleton key={j} className="h-4 w-full rounded" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ListSkeleton({ itemCount = 5 }: { itemCount?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading list">
      {Array.from({ length: itemCount }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 rounded-lg border border-gray-200"
          aria-hidden="true"
        >
          <Skeleton className="h-12 w-12 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4 rounded" />
            <Skeleton className="h-3 w-1/2 rounded" />
          </div>
          <Skeleton className="h-8 w-20 rounded shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div
      className="rounded-2xl bg-gradient-to-r from-gray-100 to-gray-200 p-8 md:p-12"
      role="status"
      aria-label="Loading hero"
    >
      <Skeleton className="h-12 w-2/3 mb-4 rounded" />
      <Skeleton className="h-6 w-full max-w-2xl mb-6 rounded" />
      <Skeleton className="h-6 w-3/4 mb-8 rounded" />
      <div className="flex gap-3">
        <Skeleton className="h-12 w-32 rounded-lg" />
        <Skeleton className="h-12 w-32 rounded-lg" />
      </div>
    </div>
  );
}
