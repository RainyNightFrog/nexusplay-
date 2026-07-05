"use client";

import { useCallback, useEffect } from "react";
import type { RefObject } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  NEXUSPLAY_AUTH_MESSAGE,
  NEXUSPLAY_READY_MESSAGE,
  type NexusPlayAuthUser,
} from "@/lib/nexusplay-embed-sdk";

type GameEmbedBridgeProps = {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  gameId: string;
};

function buildAuthPayload(
  profile: ReturnType<typeof useAuth>["profile"]
): NexusPlayAuthUser | null {
  if (!profile) return null;
  return {
    id: profile.id,
    displayName: profile.display_name,
  };
}

export function GameEmbedBridge({ iframeRef, gameId }: GameEmbedBridgeProps) {
  const { profile, loading } = useAuth();

  const postAuth = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;

    iframe.contentWindow.postMessage(
      {
        type: NEXUSPLAY_AUTH_MESSAGE,
        user: buildAuthPayload(profile),
      },
      window.location.origin
    );
  }, [iframeRef, profile]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; gameId?: number };
      if (data?.type !== NEXUSPLAY_READY_MESSAGE) return;
      if (String(data.gameId ?? "") !== gameId) return;
      postAuth();
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [gameId, postAuth]);

  useEffect(() => {
    if (!loading) {
      postAuth();
    }
  }, [loading, postAuth]);

  return null;
}
