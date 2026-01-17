"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/lib/client-api";
import { trackEvent } from "@/lib/analytics";

export interface UseFavoritesReturn {
  favoriteIds: Set<string>;
  loading: boolean;
  error: string | null;
  isFavorite: (generationId: string) => boolean;
  toggleFavorite: (generationId: string) => Promise<void>;
  addFavorite: (generationId: string) => Promise<void>;
  removeFavorite: (generationId: string) => Promise<void>;
}

export function useFavorites(): UseFavoritesReturn {
  const { data: session } = useSession();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch favorites on mount
  useEffect(() => {
    if (!session) {
      setFavoriteIds(new Set());
      setLoading(false);
      return;
    }

    let isMounted = true;

    setLoading(true);
    setError(null);

    api
      .listFavorites()
      .then((result) => {
        if (!isMounted) return;
        const ids = new Set(
          result.favorites.map((favorite) => favorite.generatedScriptId),
        );
        setFavoriteIds(ids);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("Failed to fetch favorites:", err);
        setError("Unable to load favorites");
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [session]);

  const isFavorite = useCallback(
    (generationId: string): boolean => {
      return favoriteIds.has(generationId);
    },
    [favoriteIds],
  );

  const addFavorite = useCallback(async (generationId: string) => {
    try {
      await api.addFavorite(generationId);
      trackEvent("favorite_added", { generationId });

      setFavoriteIds((prev) => {
        const next = new Set(prev);
        next.add(generationId);
        return next;
      });
    } catch (err) {
      console.error("Failed to add favorite:", err);
      setError("Unable to add favorite");
      throw err;
    }
  }, []);

  const removeFavorite = useCallback(async (generationId: string) => {
    try {
      await api.removeFavorite(generationId);
      trackEvent("favorite_removed", { generationId });

      setFavoriteIds((prev) => {
        const next = new Set(prev);
        next.delete(generationId);
        return next;
      });
    } catch (err) {
      console.error("Failed to remove favorite:", err);
      setError("Unable to remove favorite");
      throw err;
    }
  }, []);

  const toggleFavorite = useCallback(
    async (generationId: string) => {
      const isFav = isFavorite(generationId);

      try {
        if (isFav) {
          await removeFavorite(generationId);
        } else {
          await addFavorite(generationId);
        }
      } catch (err) {
        console.error("Failed to toggle favorite:", err);
        setError("Unable to update favorites. Please try again.");
        throw err;
      }
    },
    [isFavorite, addFavorite, removeFavorite],
  );

  return {
    favoriteIds,
    loading,
    error,
    isFavorite,
    toggleFavorite,
    addFavorite,
    removeFavorite,
  };
}
