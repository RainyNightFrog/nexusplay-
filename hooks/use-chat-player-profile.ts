"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { ChatPlayerPreview } from "@/components/chat/chat-player-card";
import type { ChatPlayerPublicProfile } from "@/lib/chat-player-profile-service";

export function useChatPlayerProfile(
  player: ChatPlayerPreview | null,
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
      }
      if (player.userId && !player.isVirtual) {
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
