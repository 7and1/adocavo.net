"use client";

import { useState, useCallback } from "react";
import { HookCard } from "@/components/HookCard";
import { HookFilters } from "@/components/HookFilters";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Hook } from "@/lib/schema";
import type { HookCategory } from "@/lib/validations";

export interface HookGridProps {
  initialHooks: Hook[];
  categories: { category: HookCategory; count: number }[];
}

export function HookGrid({ initialHooks, categories }: HookGridProps) {
  const [hooks, setHooks] = useState(initialHooks);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<{
    category?: HookCategory;
    search?: string;
  }>({});

  const handleFilterChange = useCallback(async (newFilters: typeof filters) => {
    setFilters(newFilters);
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (newFilters.category) params.set("category", newFilters.category);
      if (newFilters.search) params.set("search", newFilters.search);

      const response = await fetch(`/api/hooks?${params}`);
      if (!response.ok) throw new Error("Failed to load hooks");
      const data = await response.json();
      setHooks(data.data || []);
    } catch (err) {
      console.error("Failed to filter hooks:", err);
      setError("Failed to load hooks. Please try again.");
      setHooks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearFilters = () => {
    handleFilterChange({});
  };

  const hasActiveFilters = filters.category || filters.search;

  return (
    <div className="space-y-6">
      <HookFilters
        categories={categories}
        currentFilters={filters}
        onFilterChange={handleFilterChange}
        isLoading={loading}
      />

      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6"
        role="list"
        aria-busy={loading}
        aria-live="polite"
        aria-label="Hook library"
      >
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => <HookCardSkeleton key={i} />)
        ) : error ? (
          <div className="col-span-full py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-4">
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Something went wrong
            </h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <Button
              onClick={() => handleFilterChange(filters)}
              variant="outline"
            >
              Try again
            </Button>
          </div>
        ) : hooks.length === 0 ? (
          <div className="col-span-full py-12 text-center px-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No hooks found
            </h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              {hasActiveFilters
                ? "Try adjusting your filters or search terms to find what you're looking for."
                : "No hooks are available at the moment. Check back soon!"}
            </p>
            {hasActiveFilters && (
              <Button
                onClick={clearFilters}
                variant="outline"
                className="gap-2"
              >
                <XCircle className="h-4 w-4" />
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          hooks.map((hook) => <HookCard key={hook.id} hook={hook} />)
        )}
      </div>
    </div>
  );
}

function HookCardSkeleton() {
  return (
    <div
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
  );
}
