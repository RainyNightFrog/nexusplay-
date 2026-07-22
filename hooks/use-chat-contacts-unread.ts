"use client";

import { useCallback, useEffect, useState } from "react";
import type { PlayerDmContact } from "@/lib/player-dm";
import type { CreatorAdminContactSummary } from "@/lib/support-chat";

const POLL_MS = 20_000;

/** 背景輪詢通訊錄未讀（真實私訊＋管理員對話），供右下聊天按鈕紅點使用 */
export function useChatContactsUnread(enabled: boolean) {
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    if (!enabled) return;

    try {
      const [dmRes, supportRes] = await Promise.all([
        fetch("/api/chat/dms", {
          credentials: "same-origin",
          cache: "no-store",
        }),
        fetch("/api/chat/support", {
          credentials: "same-origin",
          cache: "no-store",
        }),
      ]);

      let count = 0;

      if (dmRes.ok) {
        const data = (await dmRes.json()) as {
          contacts?: PlayerDmContact[];
        };
        count += (data.contacts ?? []).filter((c) => c.unread).length;
      }

      if (supportRes.ok) {
        const data = (await supportRes.json()) as {
          contact?: CreatorAdminContactSummary | null;
        };
        if (data.contact?.unread) count += 1;
      }

      setUnreadCount(count);
    } catch {
      // 維持上次數字，避免短暫網路錯誤清掉提示
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setUnreadCount(0);
      return;
    }

    void load();
    const timer = window.setInterval(() => {
      void load();
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [enabled, load]);

  useEffect(() => {
    if (!enabled) return;

    function onVisible() {
      if (document.visibilityState === "visible") void load();
    }

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [enabled, load]);

  return { unreadCount, reload: load };
}
