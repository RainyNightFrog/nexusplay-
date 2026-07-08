"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { GameLeaveConfirmDialog } from "@/components/game/game-leave-confirm-dialog";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "@/i18n/navigation";
import {
  NEXUSPLAY_AUTH_MESSAGE,
  NEXUSPLAY_LEAVE_CONFIRM_REQUEST,
  NEXUSPLAY_LEAVE_CONFIRM_RESPONSE,
  NEXUSPLAY_LEAVE_MESSAGE,
  NEXUSPLAY_READY_MESSAGE,
  NEXUSPLAY_RESIZE_MESSAGE,
  type NexusPlayAuthUser,
  type NexusPlayLeaveConfirmRequest,
} from "@/lib/nexusplay-embed-sdk";

type GameEmbedBridgeProps = {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  gameId: string;
  creatorId?: string | null;
  expanded?: boolean;
};

type PendingLeaveConfirm = {
  requestId: string;
};

function buildAuthPayload(
  profile: ReturnType<typeof useAuth>["profile"],
  gameId: string,
  creatorId?: string | null
): NexusPlayAuthUser | null {
  if (!profile) return null;
  const isOwner = Boolean(creatorId && profile.id === creatorId);
  return {
    id: profile.id,
    displayName: profile.display_name,
    isOwner,
    editUrl: isOwner ? `/dashboard/edit/${gameId}` : null,
  };
}

export function GameEmbedBridge({
  iframeRef,
  gameId,
  creatorId,
  expanded = false,
}: GameEmbedBridgeProps) {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const [leaveConfirm, setLeaveConfirm] = useState<PendingLeaveConfirm | null>(
    null
  );
  const leaveConfirmRef = useRef<PendingLeaveConfirm | null>(null);

  const postAuth = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;

    iframe.contentWindow.postMessage(
      {
        type: NEXUSPLAY_AUTH_MESSAGE,
        user: buildAuthPayload(profile, gameId, creatorId),
        isOwner: Boolean(creatorId && profile?.id === creatorId),
        editUrl:
          creatorId && profile?.id === creatorId
            ? `/dashboard/edit/${gameId}`
            : null,
      },
      window.location.origin
    );
  }, [iframeRef, profile, gameId, creatorId]);

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

  const respondLeaveConfirm = useCallback(
    (confirmed: boolean) => {
      const pending = leaveConfirmRef.current;
      if (!pending) return;

      const iframe = iframeRef.current;
      iframe?.contentWindow?.postMessage(
        {
          type: NEXUSPLAY_LEAVE_CONFIRM_RESPONSE,
          requestId: pending.requestId,
          confirmed,
        },
        window.location.origin
      );

      leaveConfirmRef.current = null;
      setLeaveConfirm(null);
    },
    [iframeRef]
  );

  const handleStay = useCallback(() => {
    respondLeaveConfirm(false);
  }, [respondLeaveConfirm]);

  const handleLeave = useCallback(() => {
    respondLeaveConfirm(true);
  }, [respondLeaveConfirm]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data as {
        type?: string;
        gameId?: number;
        requestId?: string;
      };

      if (data?.type === NEXUSPLAY_LEAVE_CONFIRM_REQUEST) {
        const request = data as NexusPlayLeaveConfirmRequest;
        if (!request.requestId) return;
        const pending = { requestId: request.requestId };
        leaveConfirmRef.current = pending;
        setLeaveConfirm(pending);
        return;
      }

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

  useEffect(() => {
    if (!leaveConfirm) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        respondLeaveConfirm(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [leaveConfirm, respondLeaveConfirm]);

  return (
    <GameLeaveConfirmDialog
      open={Boolean(leaveConfirm)}
      onStay={handleStay}
      onLeave={handleLeave}
    />
  );
}
