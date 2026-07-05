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

  useEffect(() => {
    if (loading || !profile) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const sendPulse = () => {
      const playing = isGamePlayPath(pathname);

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

    sendPulse();

    intervalRef.current = setInterval(sendPulse, ACTIVITY_PULSE_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [loading, pathname, profile]);

  return null;
}
