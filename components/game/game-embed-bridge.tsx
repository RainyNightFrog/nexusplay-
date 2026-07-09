"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { GameLeaveConfirmDialog } from "@/components/game/game-leave-confirm-dialog";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "@/i18n/navigation";
import {
  LEGACY_NEXUSPLAY_LEAVE_CONFIRM_REQUEST,
  LEGACY_NEXUSPLAY_LEAVE_MESSAGE,
  LEGACY_NEXUSPLAY_READY_MESSAGE,
  RAINYNIGHTFROG_AUTH_MESSAGE,
  RAINYNIGHTFROG_LEAVE_CONFIRM_REQUEST,
  RAINYNIGHTFROG_LEAVE_CONFIRM_RESPONSE,
  RAINYNIGHTFROG_LEAVE_MESSAGE,
  RAINYNIGHTFROG_READY_MESSAGE,
  RAINYNIGHTFROG_RESIZE_MESSAGE,
  RAINYNIGHTFROG_EXPAND_REQUEST,
  RAINYNIGHTFROG_PLAY_MODE_MESSAGE,
  LEGACY_NEXUSPLAY_EXPAND_REQUEST,
  LEGACY_NEXUSPLAY_PLAY_MODE_MESSAGE,
  type RainyNightFrogAuthUser,
  type RainyNightFrogLeaveConfirmRequest,
} from "@/lib/rainynightfrog-embed-sdk";

type GameEmbedBridgeProps = {
  iframeRef: RefObject<HTMLIFrameElement | null>;
  gameId: string;
  creatorId?: string | null;
  expanded?: boolean;
  onExpandRequest?: () => void;
};

type PendingLeaveConfirm = {
  requestId: string;
};

function buildAuthPayload(
  profile: ReturnType<typeof useAuth>["profile"],
  gameId: string,
  creatorId?: string | null
): RainyNightFrogAuthUser | null {
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
  onExpandRequest,
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
        type: RAINYNIGHTFROG_AUTH_MESSAGE,
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

  const postToIframe = useCallback(
    (payload: Record<string, unknown>) => {
      const iframe = iframeRef.current;
      const target = iframe?.contentWindow;
      if (!target) return;
      target.postMessage(payload, window.location.origin);
    },
    [iframeRef]
  );

  const syncIframeLayout = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;

    const rect = iframe.getBoundingClientRect();
    const playMode = expanded ? "expanded" : "compact";
    const resizePayload = {
      type: RAINYNIGHTFROG_RESIZE_MESSAGE,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      expanded,
    };
    const playModePayload = {
      type: RAINYNIGHTFROG_PLAY_MODE_MESSAGE,
      mode: playMode,
    };
    const legacyPlayModePayload = {
      type: LEGACY_NEXUSPLAY_PLAY_MODE_MESSAGE,
      mode: playMode,
    };

    postToIframe(resizePayload);
    postToIframe(playModePayload);
    postToIframe(legacyPlayModePayload);
  }, [iframeRef, expanded, postToIframe]);

  const postResize = syncIframeLayout;

  const respondLeaveConfirm = useCallback(
    (confirmed: boolean) => {
      const pending = leaveConfirmRef.current;
      if (!pending) return;

      const iframe = iframeRef.current;
      iframe?.contentWindow?.postMessage(
        {
          type: RAINYNIGHTFROG_LEAVE_CONFIRM_RESPONSE,
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

      if (
        data?.type === RAINYNIGHTFROG_LEAVE_CONFIRM_REQUEST ||
        data?.type === LEGACY_NEXUSPLAY_LEAVE_CONFIRM_REQUEST
      ) {
        const request = data as RainyNightFrogLeaveConfirmRequest;
        if (!request.requestId) return;
        const pending = { requestId: request.requestId };
        leaveConfirmRef.current = pending;
        setLeaveConfirm(pending);
        return;
      }

      if (
        data?.type === RAINYNIGHTFROG_EXPAND_REQUEST ||
        data?.type === LEGACY_NEXUSPLAY_EXPAND_REQUEST
      ) {
        onExpandRequest?.();
        return;
      }

      if (
        data?.type === RAINYNIGHTFROG_LEAVE_MESSAGE ||
        data?.type === LEGACY_NEXUSPLAY_LEAVE_MESSAGE
      ) {
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push("/");
        }
        return;
      }

      if (
        data?.type !== RAINYNIGHTFROG_READY_MESSAGE &&
        data?.type !== LEGACY_NEXUSPLAY_READY_MESSAGE
      ) {
        return;
      }
      if (String(data.gameId ?? "") !== gameId) return;
      postAuth();
      postResize();
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [gameId, postAuth, postResize, router, onExpandRequest]);

  useEffect(() => {
    if (!loading) {
      postAuth();
    }
  }, [loading, postAuth]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    syncIframeLayout();
    const t1 = window.setTimeout(syncIframeLayout, 50);
    const t2 = window.setTimeout(syncIframeLayout, 250);
    const raf = window.requestAnimationFrame(syncIframeLayout);

    if (typeof ResizeObserver === "undefined") {
      return () => {
        window.clearTimeout(t1);
        window.clearTimeout(t2);
        window.cancelAnimationFrame(raf);
      };
    }

    const observer = new ResizeObserver(() => {
      syncIframeLayout();
    });
    observer.observe(iframe);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [iframeRef, syncIframeLayout, expanded]);

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
