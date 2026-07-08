"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { ChatPlayerPublicProfile } from "@/lib/chat-player-profile-service";

type PlayerProfileTarget = {
  userId: string;
  virtualPlayerId: string | null;
} | null;

export function useChatPlayerProfile(
  player: PlayerProfileTarget,
  open: boolean
) {
  const t = useTranslations("chat");
  const [profile, setProfile] = useState<ChatPlayerPublicProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!player) return;

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (player.virtualPlayerId) {
        params.set("virtualPlayerId", player.virtualPlayerId);
      } else {
        params.set("userId", player.userId);
      }

      const response = await fetch(
        `/api/chat/players/profile?${params.toString()}`,
        { credentials: "same-origin", cache: "no-store" }
      );
      const data = (await response.json()) as {
        profile?: ChatPlayerPublicProfile;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? t("playerCardLoadFailed"));
      }

      setProfile(data.profile ?? null);
    } catch (err) {
      setProfile(null);
      setError(err instanceof Error ? err.message : t("playerCardLoadFailed"));
    } finally {
      setLoading(false);
    }
  }, [player, t]);

  useEffect(() => {
    if (!open || !player) {
      setProfile(null);
      setError(null);
      return;
    }
    void loadProfile();
  }, [open, player, loadProfile]);

  return { profile, loading, error, reload: loadProfile };
}
