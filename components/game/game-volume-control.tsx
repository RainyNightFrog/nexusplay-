"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import { createPortal } from "react-dom";
import { Volume2, VolumeX } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  postSetGameVolume,
  RAINYNIGHTFROG_READY_MESSAGE,
  LEGACY_NEXUSPLAY_READY_MESSAGE,
} from "@/lib/rainynightfrog-embed-sdk";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "rnf:shell-game-volume";
const TRACK_H = 128;

function readStoredVolume(): number {
  if (typeof window === "undefined") return 0.75;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw == null) return 0.75;
    const n = Number(raw);
    if (Number.isNaN(n)) return 0.75;
    return Math.max(0, Math.min(1, n));
  } catch {
    return 0.75;
  }
}

function persistVolume(v: number) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(v));
  } catch {
    /* ignore */
  }
}

type GameVolumeControlProps = {
  iframeRef?: RefObject<HTMLIFrameElement | null>;
  /** 原生 React 遊戲（如 Poker）自訂音量回呼 */
  onVolumeChange?: (volume: number) => void;
  className?: string;
  compact?: boolean;
};

export function GameVolumeControl({
  iframeRef,
  onVolumeChange,
  className,
  compact = false,
}: GameVolumeControlProps) {
  const tc = useTranslations("common");
  const [volume, setVolume] = useState(0.75);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(
    null
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  const pushVolume = useCallback(
    (v: number) => {
      if (iframeRef?.current) {
        postSetGameVolume(iframeRef.current, v);
      }
      onVolumeChange?.(v);
    },
    [iframeRef, onVolumeChange]
  );

  const applyVolume = useCallback(
    (next: number) => {
      const v = Math.max(0, Math.min(1, next));
      setVolume(v);
      persistVolume(v);
      pushVolume(v);
    },
    [pushVolume]
  );

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    setMounted(true);
    const v = readStoredVolume();
    setVolume(v);
    pushVolume(v);
  }, [pushVolume]);

  useEffect(() => {
    function onReady(event: MessageEvent) {
      const type = event?.data?.type;
      if (
        type !== RAINYNIGHTFROG_READY_MESSAGE &&
        type !== LEGACY_NEXUSPLAY_READY_MESSAGE &&
        type !== "RNF_READY"
      ) {
        return;
      }
      pushVolume(readStoredVolume());
    }
    window.addEventListener("message", onReady);
    return () => window.removeEventListener("message", onReady);
  }, [pushVolume]);

  const updatePanelPos = useCallback(() => {
    const btn = rootRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const panelW = 64;
    const panelH = 220;
    let left = r.left + r.width / 2 - panelW / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - panelW - 8));
    const above = r.top - panelH - 8;
    const top =
      above >= 8 ? above : Math.min(r.bottom + 8, window.innerHeight - panelH - 8);
    setPanelPos({ top, left });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePanelPos();
    function onScrollOrResize() {
      updatePanelPos();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, updatePanelPos, close]);

  const volumeFromClientY = useCallback((clientY: number) => {
    const track = trackRef.current;
    if (!track) return volumeRef.current;
    const rect = track.getBoundingClientRect();
    if (rect.height <= 0) return volumeRef.current;
    const ratio = 1 - (clientY - rect.top) / rect.height;
    return Math.max(0, Math.min(1, ratio));
  }, []);

  const onTrackPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    applyVolume(volumeFromClientY(event.clientY));

    const onMove = (e: PointerEvent) => {
      applyVolume(volumeFromClientY(e.clientY));
    };
    const onUp = (e: PointerEvent) => {
      try {
        target.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", onUp);
      target.removeEventListener("pointercancel", onUp);
    };
    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp);
    target.addEventListener("pointercancel", onUp);
  };

  const muted = volume <= 0.001;
  const pct = Math.round(volume * 100);
  const thumbTop = (1 - volume) * TRACK_H;

  const overlay =
    open && mounted && panelPos
      ? createPortal(
          <>
            {/* 全螢幕透明層：點遊戲／其他位置即可收起（含 iframe） */}
            <button
              type="button"
              aria-label={tc("gameVolumeClose")}
              className="fixed inset-0 z-[119] cursor-default bg-transparent"
              onClick={close}
            />
            <div
              className="fixed z-[120] flex w-16 flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-zinc-950/95 px-2 py-3 shadow-2xl shadow-black/60 backdrop-blur-xl"
              style={{ top: panelPos.top, left: panelPos.left }}
              role="dialog"
              aria-label={tc("gameVolume")}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <span className="text-[10px] font-medium text-zinc-500">+</span>
              <span className="text-[11px] font-semibold tabular-nums text-cyan-300">
                {pct}%
              </span>
              <div
                ref={trackRef}
                className="relative w-11 touch-none select-none"
                style={{ height: TRACK_H }}
                onPointerDown={onTrackPointerDown}
                role="slider"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pct}
                aria-orientation="vertical"
                aria-label={tc("gameVolume")}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "ArrowUp" || e.key === "ArrowRight") {
                    e.preventDefault();
                    applyVolume(volume + 0.05);
                  } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
                    e.preventDefault();
                    applyVolume(volume - 0.05);
                  } else if (e.key === "Home") {
                    e.preventDefault();
                    applyVolume(1);
                  } else if (e.key === "End") {
                    e.preventDefault();
                    applyVolume(0);
                  }
                }}
              >
                <div className="absolute left-1/2 top-0 h-full w-2.5 -translate-x-1/2 rounded-full bg-zinc-800 ring-1 ring-white/10" />
                <div
                  className="absolute bottom-0 left-1/2 w-2.5 -translate-x-1/2 rounded-full bg-gradient-to-t from-cyan-600 to-cyan-300"
                  style={{ height: `${pct}%` }}
                />
                <div
                  className="absolute left-1/2 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cyan-200 bg-zinc-950 shadow-[0_0_12px_rgba(34,211,238,0.55)]"
                  style={{ top: thumbTop }}
                />
              </div>
              <span className="text-[10px] font-medium text-zinc-500">−</span>
              <button
                type="button"
                className="mt-0.5 text-[10px] text-zinc-400 hover:text-zinc-200"
                onClick={() => applyVolume(muted ? 0.75 : 0)}
              >
                {muted ? tc("gameVolumeUnmute") : tc("gameVolumeMute")}
              </button>
            </div>
          </>,
          document.body
        )
      : null;

  return (
    <div ref={rootRef} className={cn("relative shrink-0", className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-expanded={open}
        aria-label={tc("gameVolume")}
        title={tc("gameVolume")}
        onClick={() => {
          if (open) {
            close();
            return;
          }
          updatePanelPos();
          setOpen(true);
        }}
        className={cn(
          "gap-1.5 border-white/10 bg-white/5 text-zinc-300 touch-manipulation hover:border-cyan-400/30 hover:text-white",
          compact
            ? "size-9 p-0 sm:size-auto sm:min-h-0 sm:px-3"
            : "min-h-10 min-w-0 justify-center sm:min-h-0 sm:flex-none"
        )}
      >
        {muted ? (
          <VolumeX className="size-3.5 shrink-0" />
        ) : (
          <Volume2 className="size-3.5 shrink-0" />
        )}
        <span className={cn(compact ? "hidden sm:inline" : "truncate")}>
          {tc("gameVolume")}
        </span>
      </Button>
      {overlay}
    </div>
  );
}
