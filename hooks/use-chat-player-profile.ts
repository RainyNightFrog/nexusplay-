"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { ChatPlayerPreview } from "@/components/chat/chat-player-card";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { isVirtualLeaderboardUserId } from "@/lib/platform-leaderboard-virtual";
import type { ChatPlayerPublicProfile } from "@/lib/chat-player-profile-service";
import { API_FETCH_TIMEOUT_MS } from "@/lib/with-timeout";

const PROFILE_CACHE_TTL_MS = 45_000;

type CachedProfile = {
  expiresAt: number;
  profile: ChatPlayerPublicProfile;
};

const profileCache = new Map<string, CachedProfile>();

function profileCacheKey(player: ChatPlayerPreview) {
  if (player.virtualPlayerId) return `vp:${player.virtualPlayerId}`;
  if (player.userId && !isVirtualLeaderboardUserId(player.userId)) {
    return `u:${player.userId}`;
  }
  return null;
}

function readCachedProfile(player: ChatPlayerPreview) {
  const key = profileCacheKey(player);
  if (!key) return null;
  const hit = profileCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    profileCache.delete(key);
    return null;
  }
  return hit.profile;
}

function writeCachedProfile(
  player: ChatPlayerPreview,
  profile: ChatPlayerPublicProfile
) {
  const key = profileCacheKey(player);
  if (!key) return;
  profileCache.set(key, {
    profile,
    expiresAt: Date.now() + PROFILE_CACHE_TTL_MS,
  });
}

export function useChatPlayerProfile(
  player: ChatPlayerPreview | null,
  open: boolean
) {
  const t = useTranslations("chat");
  const [profile, setProfile] = useState<ChatPlayerPublicProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(
    async (target: ChatPlayerPreview, options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setLoading(true);
      }
      setError(null);
      try {
        const params = new URLSearchParams();
        if (target.virtualPlayerId) {
          params.set("virtualPlayerId", target.virtualPlayerId);
        }
        if (target.userId && !isVirtualLeaderboardUserId(target.userId)) {
          params.set("userId", target.userId);
        }

        const response = await fetchWithTimeout(
          `/api/chat/players/profile?${params.toString()}`,
          { credentials: "same-origin" },
          API_FETCH_TIMEOUT_MS
        );
        const data = (await response.json()) as {
          profile?: ChatPlayerPublicProfile;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? t("playerCardLoadFailed"));
        }

        const nextProfile = data.profile ?? null;
        setProfile(nextProfile);
        if (nextProfile) {
          writeCachedProfile(target, nextProfile);
        }
      } catch (err) {
        const cached = readCachedProfile(target);
        if (cached) {
          // 逾時／失敗時保留舊快取，不整卡空白
          setProfile(cached);
        } else if (!options?.silent) {
          setProfile(null);
        }
        const raw =
          err instanceof Error ? err.message : t("playerCardLoadFailed");
        const lower = raw.toLowerCase();
        const friendly =
          lower.includes("invalid jwt") ||
          lower.includes("jwt kid") ||
          lower.includes("unrecognized jwt") ||
          lower.includes("unable to parse or verify") ||
          lower.includes("aborted") ||
          lower.includes("timed out")
            ? t("playerCardLoadFailed")
            : raw;
        setError(friendly);
      } finally {
        setLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    if (!open || !player) {
      return;
    }

    const cached = readCachedProfile(player);
    if (cached) {
      setProfile(cached);
      setError(null);
      setLoading(false);
      void loadProfile(player, { silent: true });
      return;
    }

    setProfile(null);
    void loadProfile(player);
  }, [open, player, loadProfile]);

  return {
    profile,
    loading,
    error,
    reload: () => {
      if (player) void loadProfile(player);
    },
  };
}
