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
  RAINYNIGHTFROG_API_PROXY_REQUEST,
  RAINYNIGHTFROG_API_PROXY_RESPONSE,
  RAINYNIGHTFROG_LEAVE_CONFIRM_REQUEST,
  RAINYNIGHTFROG_LEAVE_CONFIRM_RESPONSE,
  RAINYNIGHTFROG_LEAVE_MESSAGE,
  RAINYNIGHTFROG_READY_MESSAGE,
  RAINYNIGHTFROG_RESIZE_MESSAGE,
  RAINYNIGHTFROG_EXPAND_REQUEST,
  RAINYNIGHTFROG_PLAY_MODE_MESSAGE,
  LEGACY_NEXUSPLAY_EXPAND_REQUEST,
  LEGACY_NEXUSPLAY_PLAY_MODE_MESSAGE,
  RNF_SUBMIT_SCORE_MESSAGE,
  RNF_SAVE_DATA_MESSAGE,
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

  const isMessageFromIframe = useCallback(
    (event: MessageEvent) => {
      const iframeWindow = iframeRef.current?.contentWindow;
      return Boolean(iframeWindow && event.source === iframeWindow);
    },
    [iframeRef]
  );

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
      "*"
    );
  }, [iframeRef, profile, gameId, creatorId]);

  const postToIframe = useCallback(
    (payload: Record<string, unknown>) => {
      const iframe = iframeRef.current;
      const target = iframe?.contentWindow;
      if (!target) return;
      target.postMessage(payload, "*");
    },
    [iframeRef]
  );

  const respondApiProxy = useCallback(
    (
      requestId: string,
      result:
        | { ok: true; status: number; data: unknown }
        | { ok: false; status: number; error: string }
    ) => {
      const iframe = iframeRef.current;
      iframe?.contentWindow?.postMessage(
        {
          type: RAINYNIGHTFROG_API_PROXY_RESPONSE,
          requestId,
          ...result,
        },
        "*"
      );
    },
    [iframeRef]
  );

  const handleApiProxyRequest = useCallback(
    async (data: {
      requestId?: string;
      method?: string;
      path?: string;
      body?: unknown;
    }) => {
      const requestId = data.requestId;
      if (!requestId || !data.path || !data.method) return;

      const allowedPath = new RegExp(
        `^/api/games/${gameId}/(?:save(?:/import-legacy)?|leaderboard(?:\\?.*)?)$`
      );
      if (!allowedPath.test(data.path)) {
        respondApiProxy(requestId, {
          ok: false,
          status: 403,
          error: "不允許的 API 路徑",
        });
        return;
      }

      const method = data.method.toUpperCase();
      if (!["GET", "PUT", "POST"].includes(method)) {
        respondApiProxy(requestId, {
          ok: false,
          status: 405,
          error: "不支援的 HTTP 方法",
        });
        return;
      }

      try {
        const response = await fetch(data.path, {
          method,
          credentials: "include",
          headers:
            data.body != null ? { "Content-Type": "application/json" } : undefined,
          body: data.body != null ? JSON.stringify(data.body) : undefined,
        });
        const payload = await response.json().catch(() => ({}));
        if (response.ok) {
          respondApiProxy(requestId, {
            ok: true,
            status: response.status,
            data: payload,
          });
          return;
        }
        respondApiProxy(requestId, {
          ok: false,
          status: response.status,
          error: String((payload as { error?: string }).error ?? "請求失敗"),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "代理請求失敗";
        respondApiProxy(requestId, {
          ok: false,
          status: 500,
          error: message,
        });
      }
    },
    [gameId, respondApiProxy]
  );

  const handleRnfSubmitScore = useCallback(
    async (data: { score?: unknown; metadata?: unknown; timestamp?: unknown }) => {
      const score = Number(data.score);
      if (!Number.isFinite(score) || score < 0) return;

      const meta =
        data.metadata && typeof data.metadata === "object" && !Array.isArray(data.metadata)
          ? (data.metadata as Record<string, unknown>)
          : {};

      try {
        await fetch(`/api/games/${gameId}/leaderboard`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            score: Math.floor(score),
            meta: {
              ...meta,
              submittedAt: data.timestamp ?? Date.now(),
            },
          }),
        });
      } catch (error) {
        console.error("[RNF] submitScore failed:", error);
      }
    },
    [gameId]
  );

  const handleRnfSaveData = useCallback(
    async (data: { data?: unknown }) => {
      if (data.data == null || typeof data.data !== "object" || Array.isArray(data.data)) {
        return;
      }

      try {
        await fetch(`/api/games/${gameId}/save`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ save: data.data }),
        });
      } catch (error) {
        console.error("[RNF] saveData failed:", error);
      }
    },
    [gameId]
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
        "*"
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
      if (!isMessageFromIframe(event)) return;
      const data = event.data as {
        type?: string;
        gameId?: number;
        requestId?: string;
        method?: string;
        path?: string;
        body?: unknown;
      };

      if (data?.type === RAINYNIGHTFROG_API_PROXY_REQUEST) {
        void handleApiProxyRequest(data);
        return;
      }

      if (data?.type === RNF_SUBMIT_SCORE_MESSAGE) {
        void handleRnfSubmitScore(data as { score?: unknown; metadata?: unknown; timestamp?: unknown });
        return;
      }

      if (data?.type === RNF_SAVE_DATA_MESSAGE) {
        void handleRnfSaveData(data as { data?: unknown });
        return;
      }

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
  }, [gameId, postAuth, postResize, router, onExpandRequest, isMessageFromIframe, handleApiProxyRequest, handleRnfSubmitScore, handleRnfSaveData]);

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
