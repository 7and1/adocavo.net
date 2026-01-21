"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HookCard } from "@/components/HookCard";
import { Heart, Search, Grid, List, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { createHookFavoriteService } from "@/lib/services/hook-favorites";
import { getD1 } from "@/lib/cloudflare";
import type { HookFavoriteWithDetails } from "@/lib/services/hook-favorites";

export default function FavoritesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = searchParams.get("category");
  const { data: session } = useSession();

  const [favorites, setFavorites] = useState<HookFavoriteWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState<Record<string, boolean>>({});
  const [isRemoving, setIsRemoving] = useState<Record<string, boolean>>({});
  const [selectedCategory, setSelectedCategory] = useState(category || "all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>(
    {},
  );

  // Get all favorites
  useEffect(() => {
    const fetchFavorites = async () => {
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }

      try {
        const d1 = getD1();
        const favoriteService = await createHookFavoriteService(d1);
        const favoritesData = await favoriteService.getUserFavorites(
          session.user.id,
        );
        const categoryData = await favoriteService.getUserFavoritesByCategory(
          session.user.id,
        );

        setFavorites(favoritesData);
        setCategoryCounts(categoryData);
      } catch (error) {
        console.error("Failed to fetch favorites:", error);
        toast.error("Failed to load favorites");
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [session]);

  // Filter favorites by category and search
  const filteredFavorites = favorites.filter((favorite) => {
    const matchesCategory =
      selectedCategory === "all" || favorite.category === selectedCategory;
    const matchesSearch =
      searchQuery === "" ||
      favorite.hookText.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = [
    { value: "all", label: "All Categories" },
    ...Object.entries(categoryCounts).map(([value, count]) => ({
      value,
      label: `${value} (${count})`,
    })),
  ].sort((a, b) => {
    if (a.value === "all") return -1;
    if (b.value === "all") return 1;
    return a.value.localeCompare(b.value);
  });

  const handleToggleFavorite = async (hookId: string, isFavorited: boolean) => {
    if (!session?.user?.id) {
      toast.error("Favorites are unavailable in free mode.");
      return;
    }

    try {
      if (isFavorited) {
        setIsRemoving((prev) => ({ ...prev, [hookId]: true }));

        const d1 = getD1();
        const favoriteService = await createHookFavoriteService(d1);
        await favoriteService.removeFavorite(session.user.id, hookId);

        setFavorites((prev) => prev.filter((fav) => fav.hookId !== hookId));
        toast.success("Removed from favorites");
      } else {
        setIsAdding((prev) => ({ ...prev, [hookId]: true }));

        const d1 = getD1();
        const favoriteService = await createHookFavoriteService(d1);
        await favoriteService.addFavorite({
          userId: session.user.id,
          hookId,
        });

        toast.success("Added to favorites");
      }
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
      toast.error("Failed to update favorites");
      throw error;
    } finally {
      setIsAdding((prev) => ({ ...prev, [hookId]: false }));
      setIsRemoving((prev) => ({ ...prev, [hookId]: false }));
    }
  };

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="mb-6">
            <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              My Favorites
            </h1>
            <p className="text-gray-600">
              Favorites aren&apos;t available in free mode.
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/">Back to Hook Library</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg border p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Heart className="h-8 w-8 text-red-500" />
              My Favorites
            </h1>
            <p className="text-gray-600 mt-1">
              {favorites.length}{" "}
              {favorites.length === 1 ? "favorite" : "favorites"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search favorite hooks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md bg-white min-w-[200px]"
        >
          {categories.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Favorites Grid */}
      {filteredFavorites.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Heart className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {!session
                ? "Favorites are disabled in free mode"
                : favorites.length === 0
                  ? "No favorites yet"
                  : "No favorites found"}
            </h3>
            <p className="text-gray-500 text-center mb-4 max-w-md">
              {!session
                ? "Favorites require an account and are currently disabled."
                : favorites.length === 0
                  ? "Start adding hooks to your favorites by clicking the bookmark icon on any hook card."
                  : "Try adjusting your search or filter criteria."}
            </p>
            {!session ? (
              <Button asChild>
                <Link href="/">Browse hooks</Link>
              </Button>
            ) : favorites.length === 0 ? (
              <Button asChild>
                <Link href="/">Browse hooks</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              : "space-y-4"
          }
        >
          {filteredFavorites.map((favorite) => (
            <div
              key={favorite.id}
              className={viewMode === "list" ? "border rounded-lg p-4" : ""}
            >
              <HookCard
                hook={{
                  id: favorite.hookId,
                  text: favorite.hookText,
                  category: favorite.category,
                  engagementScore: favorite.engagementScore,
                  source: null,
                  isActive: true,
                  createdAt: favorite.createdAt,
                  updatedAt: favorite.createdAt,
                }}
                isFavorited={true}
                onToggleFavorite={handleToggleFavorite}
                isLoading={
                  isAdding[favorite.hookId] || isRemoving[favorite.hookId]
                }
                onView={() => router.push(`/remix/${favorite.hookId}`)}
              />
              {viewMode === "list" && (
                <div className="mt-3 flex items-center justify-between">
                  <Badge variant="outline">{favorite.category}</Badge>
                  <span className="text-sm text-gray-500">
                    Favorited{" "}
                    {new Date(favorite.createdAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
