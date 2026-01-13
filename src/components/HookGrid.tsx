"use client";

import { useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { HookCard } from "@/components/HookCard";
import { HookFilters } from "@/components/HookFilters";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import { createHookFavoriteService } from "@/lib/services/hook-favorites";
import { getD1 } from "@/lib/cloudflare";
import type { Hook } from "@/lib/schema";
import type { HookCategory } from "@/lib/validations";

export interface HookGridProps {
  initialHooks: Hook[];
  categories: { category: HookCategory; count: number }[];
}

export function HookGrid({ initialHooks, categories }: HookGridProps) {
  const { data: session } = useSession();
  const [hooks, setHooks] = useState(initialHooks);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<{
    category?: HookCategory;
    search?: string;
  }>({});

  const loadFavorites = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const d1 = getD1();
      const favoriteService = await createHookFavoriteService(d1);
      const userFavorites = await favoriteService.getUserFavorites(
        session.user.id,
      );

      const favoriteMap: Record<string, boolean> = {};
      userFavorites.forEach((fav) => {
        favoriteMap[fav.hookId] = true;
      });
      setFavorites(favoriteMap);
    } catch (error) {
      console.error("Failed to load favorites:", error);
    }
  }, [session]);

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
      trackEvent("hook_filter", {
        category: newFilters.category || "all",
        search: newFilters.search || "",
      });
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
    trackEvent("hook_filter_clear");
  };

  const handleToggleFavorite = async (hookId: string, isFavorited: boolean) => {
    if (!session?.user?.id) return;

    try {
      const d1 = getD1();
      const favoriteService = await createHookFavoriteService(d1);

      if (isFavorited) {
        await favoriteService.removeFavorite(session.user.id, hookId);
        setFavorites((prev) => ({ ...prev, [hookId]: false }));
      } else {
        await favoriteService.addFavorite({ userId: session.user.id, hookId });
        setFavorites((prev) => ({ ...prev, [hookId]: true }));
      }
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
      throw error;
    }
  };

  const hasActiveFilters = filters.category || filters.search;

  // Load favorites when session changes
  useEffect(() => {
    if (session?.user?.id) {
      loadFavorites();
    }
  }, [session, loadFavorites]);

  return (
    <div className="space-y-6 hook-grid-section">
      <div className="category-filters">
        <HookFilters
          categories={categories}
          currentFilters={filters}
          onFilterChange={handleFilterChange}
          isLoading={loading}
        />
      </div>

      {loading ? (
        <>
          <div
            className="sm:hidden -mx-4 px-4 overflow-x-auto pb-3"
            role="list"
            aria-busy="true"
            aria-live="polite"
            aria-label="Hook library loading"
          >
            <div className="flex gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="min-w-[260px] max-w-[80%]">
                  <HookCardSkeleton />
                </div>
              ))}
            </div>
          </div>
          <div
            className="hidden sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6"
            role="list"
            aria-busy="true"
            aria-live="polite"
            aria-label="Hook library loading"
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <HookCardSkeleton key={i} />
            ))}
          </div>
        </>
      ) : error ? (
        <div className="py-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-4">
            <XCircle className="h-8 w-8 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Something went wrong
          </h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <Button onClick={() => handleFilterChange(filters)} variant="outline">
            Try again
          </Button>
        </div>
      ) : hooks.length === 0 ? (
        <div className="py-12 text-center px-4">
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
            <Button onClick={clearFilters} variant="outline" className="gap-2">
              <XCircle className="h-4 w-4" />
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <>
          <div
            className="sm:hidden -mx-4 px-4 overflow-x-auto pb-4 scrollbar-hide"
            role="list"
            aria-live="polite"
            aria-label="Hook library"
          >
            <div className="flex gap-4 snap-x snap-mandatory">
              {hooks.map((hook) => (
                <div
                  key={hook.id}
                  className="min-w-[280px] max-w-[85vw] snap-start"
                >
                  <HookCard
                    hook={hook}
                    isFavorited={session?.user?.id ? favorites[hook.id] : false}
                    onToggleFavorite={
                      session?.user?.id ? handleToggleFavorite : undefined
                    }
                  />
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-gray-500 text-center">
              Swipe to explore more hooks
            </p>
          </div>
          <div
            className="hidden sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 hook-grid"
            role="list"
            aria-live="polite"
            aria-label="Hook library"
          >
            {hooks.map((hook) => (
              <div key={hook.id} className="hook-card">
                <HookCard
                  hook={hook}
                  isFavorited={session?.user?.id ? favorites[hook.id] : false}
                  onToggleFavorite={
                    session?.user?.id ? handleToggleFavorite : undefined
                  }
                />
              </div>
            ))}
          </div>
        </>
      )}
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
