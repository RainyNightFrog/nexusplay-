"use client";

import { useEffect } from "react";

/**
 * 提早註冊 Service Worker，滿足 Chromium PWA 可安裝條件，
 * 並與推播通知共用同一個 `/sw.js`。
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV === "development") {
      /* 本機開發仍註冊，方便驗證 A2HS；失敗則靜默忽略 */
    }

    let cancelled = false;

    void (async () => {
      try {
        const existing = await navigator.serviceWorker.getRegistration("/sw.js");
        if (cancelled) return;
        if (existing) return;
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch {
        /* HTTPS／瀏覽器限制時略過 */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
