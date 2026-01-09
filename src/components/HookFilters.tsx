"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HookCategory } from "@/lib/validations";

export interface HookFiltersProps {
  categories: { category: HookCategory; count: number }[];
  currentFilters: {
    category?: HookCategory;
    search?: string;
  };
  onFilterChange: (filters: {
    category?: HookCategory;
    search?: string;
  }) => void;
  isLoading?: boolean;
}

export function HookFilters({
  categories,
  currentFilters,
  onFilterChange,
  isLoading = false,
}: HookFiltersProps) {
  const [search, setSearch] = useState(currentFilters.search || "");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      onFilterChange({
        category: currentFilters.category,
        search: search || undefined,
      });
    }, 300);

    return () => clearTimeout(handler);
  }, [search, currentFilters.category, onFilterChange]);

  const clearSearch = () => {
    setSearch("");
    onFilterChange({ category: currentFilters.category });
    searchInputRef.current?.focus();
  };

  const activeCategory = currentFilters.category;
  const activeCount = activeCategory
    ? categories.find((c) => c.category === activeCategory)?.count
    : categories.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="space-y-4" role="search" aria-label="Filter hooks">
      {/* Search */}
      <div className="relative max-w-md">
        <Search
          className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors",
            isSearchFocused ? "text-primary-500" : "text-gray-400",
          )}
          aria-hidden="true"
        />
        <Input
          ref={searchInputRef}
          type="search"
          placeholder="Search hooks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          className="pl-10 pr-10"
          aria-label="Search hooks"
          aria-busy={isLoading}
        />
        {search && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-full p-0.5"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Category filters */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">
            {isLoading ? "Filtering..." : `${activeCount} hooks`}
          </span>
        </div>
        <nav
          className="flex flex-wrap items-center gap-2"
          role="tablist"
          aria-label="Filter by category"
        >
          <Button
            role="tab"
            aria-selected={!activeCategory}
            variant={!activeCategory ? "default" : "outline"}
            size="sm"
            onClick={() => onFilterChange({ search: search || undefined })}
            className="rounded-full transition-all"
          >
            All
          </Button>
          {categories.map((category) => (
            <Button
              key={category.category}
              role="tab"
              aria-selected={activeCategory === category.category}
              variant={
                activeCategory === category.category ? "default" : "outline"
              }
              size="sm"
              onClick={() =>
                onFilterChange({
                  category: category.category,
                  search: search || undefined,
                })
              }
              className="rounded-full transition-all"
            >
              {category.category}
              <span
                className="ml-1.5 opacity-70"
                aria-label={`${category.count} hooks`}
              >
                ({category.count})
              </span>
            </Button>
          ))}
        </nav>
      </div>
    </div>
  );
}
