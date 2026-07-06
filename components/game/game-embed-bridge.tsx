"use client";

import { useCallback, useEffect } from "react";
import type { RefObject } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  NEXUSPLAY_AUTH_MESSAGE,
  NEXUSPLAY_LEAVE_MESSAGE,
  NEXUSPLAY_READY_MESSAGE,
  NEXUSPLAY_RESIZE_MESSAGE,
  type NexusPlayAuthUser,
} from "@/lib/nexusplay-embed-sdk";
import { useRouter } from "@/i18n/navigation";

type GameEmbedBridgeProps = {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  gameId: string;
  expanded?: boolean;
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

export function GameEmbedBridge({
  iframeRef,
  gameId,
  expanded = false,
}: GameEmbedBridgeProps) {
  const { profile, loading } = useAuth();
  const router = useRouter();

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

  const postResize = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;

    const rect = iframe.getBoundingClientRect();
    iframe.contentWindow.postMessage(
      {
        type: NEXUSPLAY_RESIZE_MESSAGE,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        expanded,
      },
      window.location.origin
    );
  }, [iframeRef, expanded]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; gameId?: number };
      if (data?.type === NEXUSPLAY_LEAVE_MESSAGE) {
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push("/");
        }
        return;
      }
      if (data?.type !== NEXUSPLAY_READY_MESSAGE) return;
      if (String(data.gameId ?? "") !== gameId) return;
      postAuth();
      postResize();
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [gameId, postAuth, postResize, router]);

  useEffect(() => {
    if (!loading) {
      postAuth();
    }
  }, [loading, postAuth]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    postResize();

    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      postResize();
    });
    observer.observe(iframe);

    return () => observer.disconnect();
  }, [iframeRef, postResize, expanded]);

  return null;
}
