"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "@/i18n/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  ACTIVITY_PULSE_MS,
  ACTIVITY_PULSE_SECONDS,
} from "@/lib/platform-leaderboard";

function isGamePlayPath(pathname: string): boolean {
  return /^\/game\/[^/]+/.test(pathname);
}

export function ActivityPulseTracker() {
  const pathname = usePathname();
  const { profile, loading } = useAuth();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  useEffect(() => {
    if (loading || !profile) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const sendPulse = () => {
      if (document.visibilityState === "hidden") return;

      const playing = isGamePlayPath(pathnameRef.current);

      fetch("/api/activity/pulse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          onlineSeconds: ACTIVITY_PULSE_SECONDS,
          playSeconds: playing ? ACTIVITY_PULSE_SECONDS : 0,
        }),
      }).catch(() => undefined);
    };

    const start = () => {
      if (intervalRef.current) return;
      intervalRef.current = setInterval(sendPulse, ACTIVITY_PULSE_MS);
    };

    const stop = () => {
      if (!intervalRef.current) return;
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        stop();
      } else {
        sendPulse();
        start();
      }
    };

    if (document.visibilityState !== "hidden") {
      sendPulse();
      start();
    }

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
    };
  }, [loading, profile]);

  return null;
}
