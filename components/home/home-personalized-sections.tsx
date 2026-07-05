"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { HomeGameRow } from "@/components/home/home-game-row";
import type { Game } from "@/lib/games";
import { useGameFavoriteActions } from "@/hooks/use-game-favorite-actions";

type HomePersonalizedSectionsProps = {
  profileId: string | undefined;
};

export function HomePersonalizedSections({ profileId }: HomePersonalizedSectionsProps) {
  const t = useTranslations("home");
  const tNotifications = useTranslations("notifications");
  const { loadFavoriteCounts, favoriteCounts } = useGameFavoriteActions();
  const [favorites, setFavorites] = useState<Game[]>([]);
  const [followingFeed, setFollowingFeed] = useState<Game[]>([]);
  const [newGameUnreadCount, setNewGameUnreadCount] = useState(0);

  useEffect(() => {
    if (!profileId) {
      setFavorites([]);
      setFollowingFeed([]);
      setNewGameUnreadCount(0);
      return;
    }

    fetch("/api/auth/favorites")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { games?: Game[] } | null) => {
        setFavorites(data?.games?.slice(0, 8) ?? []);
      })
      .catch(() => setFavorites([]));

    fetch("/api/auth/following/feed")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { games?: Game[] } | null) => {
        const nextGames = data?.games?.slice(0, 8) ?? [];
        setFollowingFeed(nextGames);
        if (nextGames.length > 0) {
          fetch("/api/auth/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ markKind: "followed_new_game" }),
          })
            .then((response) => (response.ok ? response.json() : null))
            .then(
              (payload: {
                unreadByKind?: { followed_new_game?: number };
              } | null) => {
                setNewGameUnreadCount(
                  payload?.unreadByKind?.followed_new_game ?? 0
                );
              }
            )
            .catch(() => undefined);
        }
      })
      .catch(() => setFollowingFeed([]));

    fetch("/api/auth/notifications")
      .then((response) => (response.ok ? response.json() : null))
      .then(
        (data: {
          unreadByKind?: { followed_new_game?: number };
        } | null) => {
          setNewGameUnreadCount(data?.unreadByKind?.followed_new_game ?? 0);
        }
      )
      .catch(() => setNewGameUnreadCount(0));
  }, [profileId]);

  useEffect(() => {
    const gameIds = [...favorites, ...followingFeed].map((game) => game.id);
    if (gameIds.length > 0) {
      void loadFavoriteCounts(gameIds);
    }
  }, [favorites, followingFeed, loadFavoriteCounts]);

  if (!profileId) return null;

  return (
    <>
      <HomeGameRow
        title={t("favoritesSectionTitle")}
        description={t("favoritesSectionDesc")}
        games={favorites}
        viewAllHref="/settings/favorites"
        viewAllLabel={t("favoritesViewAll")}
        accent="rose"
        favoriteCounts={favoriteCounts}
      />
      <HomeGameRow
        title={t("followingFeedTitle")}
        description={t("followingFeedDesc")}
        games={followingFeed}
        viewAllHref="/settings/following"
        viewAllLabel={t("followingViewAll")}
        accent="violet"
        badgeCount={newGameUnreadCount}
        badgeLabel={tNotifications("newGameBadge")}
        favoriteCounts={favoriteCounts}
      />
    </>
  );
}
