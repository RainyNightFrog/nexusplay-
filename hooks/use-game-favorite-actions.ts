"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/hooks/use-auth";
import type { Game } from "@/lib/games";

export function useGameFavoriteActions() {
  const tc = useTranslations("common");
  const { profile } = useAuth();
  const router = useRouter();
  const [favoriteCounts, setFavoriteCounts] = useState<Record<number, number>>({});
  const [favoritedIds, setFavoritedIds] = useState<Set<number>>(new Set());
  const [favoriteBusyId, setFavoriteBusyId] = useState<number | null>(null);

  useEffect(() => {
    if (!profile) {
      setFavoritedIds(new Set());
      return;
    }

    fetch("/api/auth/favorites")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { games?: Game[] } | null) => {
        setFavoritedIds(new Set((data?.games ?? []).map((game) => game.id)));
      })
      .catch(() => setFavoritedIds(new Set()));
  }, [profile?.id]);

  const loadFavoriteCounts = useCallback(async (gameIds: number[]) => {
    const uniqueIds = [...new Set(gameIds.filter((id) => id > 0))];
    if (uniqueIds.length === 0) {
      setFavoriteCounts({});
      return;
    }

    try {
      const response = await fetch(
        `/api/games/social-stats?ids=${uniqueIds.join(",")}`
      );
      if (!response.ok) return;

      const data = (await response.json()) as {
        favoriteCounts?: Record<number, number>;
      };
      if (data.favoriteCounts) {
        setFavoriteCounts(data.favoriteCounts);
      }
    } catch {
      setFavoriteCounts({});
    }
  }, []);

  const toggleGameFavorite = useCallback(
    async (gameId: number) => {
      if (!profile) {
        router.push(`/auth?redirect=${encodeURIComponent("/")}`);
        return { ok: false as const, message: null };
      }

      const wasFavorited = favoritedIds.has(gameId);
      setFavoriteBusyId(gameId);

      try {
        const response = await fetch(
          wasFavorited
            ? `/api/auth/favorites?gameId=${gameId}`
            : "/api/auth/favorites",
          {
            method: wasFavorited ? "DELETE" : "POST",
            headers: wasFavorited ? undefined : { "Content-Type": "application/json" },
            body: wasFavorited ? undefined : JSON.stringify({ gameId }),
          }
        );

        if (!response.ok) {
          const data = (await response.json()) as { error?: string };
          throw new Error(data.error ?? tc("favoriteFailed"));
        }

        setFavoritedIds((current) => {
          const next = new Set(current);
          if (wasFavorited) next.delete(gameId);
          else next.add(gameId);
          return next;
        });
        setFavoriteCounts((current) => ({
          ...current,
          [gameId]: Math.max(0, (current[gameId] ?? 0) + (wasFavorited ? -1 : 1)),
        }));

        return {
          ok: true as const,
          message: wasFavorited ? tc("favoriteRemoved") : tc("favoriteAdded"),
        };
      } catch (favoriteError) {
        return {
          ok: false as const,
          message:
            favoriteError instanceof Error
              ? favoriteError.message
              : tc("favoriteFailed"),
        };
      } finally {
        setFavoriteBusyId(null);
      }
    },
    [favoritedIds, profile, router, tc]
  );

  return {
    profile,
    favoriteCounts,
    favoritedIds,
    favoriteBusyId,
    loadFavoriteCounts,
    toggleGameFavorite,
  };
}
