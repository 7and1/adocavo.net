"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { createHookFavoriteService } from "@/lib/services/hook-favorites";
import { getD1 } from "@/lib/cloudflare";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { toast } from "sonner";
import type { Hook } from "@/lib/schema";

interface HookDetailContentProps {
  hook: Hook;
}

export function HookDetailContent({ hook }: HookDetailContentProps) {
  const { data: session } = useSession();
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const checkFavoriteStatus = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const d1 = getD1();
      const favoriteService = await createHookFavoriteService(d1);
      const favorited = await favoriteService.isFavorite(
        session.user.id,
        hook.id,
      );
      setIsFavorited(favorited);
    } catch (error) {
      console.error("Failed to check favorite status:", error);
    }
  }, [session?.user?.id, hook.id]);

  const handleToggleFavorite = async () => {
    if (!session?.user?.id) {
      toast.error("Please sign in to add favorites");
      return;
    }

    if (isLoading) return;

    setIsLoading(true);
    try {
      const d1 = getD1();
      const favoriteService = await createHookFavoriteService(d1);

      if (isFavorited) {
        await favoriteService.removeFavorite(session.user.id, hook.id);
        toast.success("Removed from favorites");
      } else {
        await favoriteService.addFavorite({
          userId: session.user.id,
          hookId: hook.id,
        });
        toast.success("Added to favorites");
      }
      setIsFavorited(!isFavorited);
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
      toast.error("Failed to update favorites");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkFavoriteStatus();
  }, [checkFavoriteStatus]);

  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={handleToggleFavorite}
        variant="outline"
        size="sm"
        disabled={isLoading}
        className="gap-2"
      >
        {isLoading ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
        ) : isFavorited ? (
          <>
            <BookmarkCheck className="h-4 w-4 text-primary-600" />
            Favorited
          </>
        ) : (
          <>
            <Bookmark className="h-4 w-4" />
            Favorite
          </>
        )}
      </Button>
      <Button asChild>
        <Link href={`/remix/${hook.id}`}>Remix this Hook</Link>
      </Button>
      <Button variant="outline" asChild>
        <Link href={`/category/${hook.category}`}>
          Browse {hook.category} hooks
        </Link>
      </Button>
    </div>
  );
}
