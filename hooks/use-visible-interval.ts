"use client";

import { useEffect, useRef } from "react";

/**
 * 僅在分頁可見時輪詢；切到背景會暫停，降低手機發熱與耗電。
 */
export function useVisibleInterval(
  callback: () => void,
  delayMs: number | null
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (delayMs == null || delayMs <= 0) return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const tick = () => {
      if (document.visibilityState === "hidden") return;
      callbackRef.current();
    };

    const start = () => {
      if (timer != null) return;
      timer = setInterval(tick, delayMs);
    };

    const stop = () => {
      if (timer == null) return;
      clearInterval(timer);
      timer = null;
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        stop();
      } else {
        tick();
        start();
      }
    };

    if (document.visibilityState !== "hidden") {
      tick();
      start();
    }

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
    };
  }, [delayMs]);
}
