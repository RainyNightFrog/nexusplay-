"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import type { ForumDigestDeliveryRecord } from "@/lib/forum-digest-delivery-log";

type ForumDigestHistoryPanelProps = {
  enabled: boolean;
};

export function ForumDigestHistoryPanel({ enabled }: ForumDigestHistoryPanelProps) {
  const t = useTranslations("settings");
  const locale = useLocale();
  const [loading, setLoading] = useState(false);
  const [deliveries, setDeliveries] = useState<ForumDigestDeliveryRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setDeliveries([]);
      setLoaded(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void fetch("/api/auth/forum-digest/history")
      .then(async (response) => {
        const data = (await response.json()) as {
          deliveries?: ForumDigestDeliveryRecord[];
        };
        if (!cancelled && response.ok) {
          setDeliveries(data.deliveries ?? []);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="space-y-2 text-center">
      <p className="text-xs font-medium text-zinc-500">{t("forumDigestHistoryTitle")}</p>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Loader2 className="size-3.5 animate-spin" />
          {t("forumDigestHistoryLoading")}
        </div>
      ) : null}

      {loaded && !loading && deliveries.length === 0 ? (
        <p className="text-xs text-zinc-600">{t("forumDigestHistoryEmpty")}</p>
      ) : null}

      {deliveries.length > 0 ? (
        <ul className="space-y-2">
          {deliveries.map((entry) => (
            <li key={entry.id} className="text-xs text-zinc-500">
              <span className="text-zinc-400">
                {new Date(entry.createdAt).toLocaleString(locale)}
              </span>
              <span className="mx-1.5 text-zinc-700">·</span>
              {entry.status === "sent"
                ? t("forumDigestHistorySent", { count: entry.postCount })
                : t("forumDigestHistoryFailed")}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
