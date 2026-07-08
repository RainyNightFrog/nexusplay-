"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import type { FeedPreviewResult } from "@/lib/feed-preview-service";
import { cn } from "@/lib/utils";

type FeedPreviewPanelProps = {
  feed: FeedPreviewResult["feed"];
  category?: string;
  gameId?: number;
  creatorId?: string;
  centered?: boolean;
};

export function FeedPreviewPanel({
  feed,
  category,
  gameId,
  creatorId,
  centered = false,
}: FeedPreviewPanelProps) {
  const t = useTranslations("feeds");
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<FeedPreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ feed, limit: "5" });
    if (category) params.set("category", category);
    if (gameId != null) params.set("id", String(gameId));
    if (creatorId) params.set("id", creatorId);

    try {
      const response = await fetch(`/api/feeds/preview?${params.toString()}`);
      const data = (await response.json()) as FeedPreviewResult & { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? t("previewFailed"));
      }
      setPreview(data);
    } catch (loadError) {
      setPreview(null);
      setError(loadError instanceof Error ? loadError.message : t("previewFailed"));
    } finally {
      setLoading(false);
    }
  }, [category, creatorId, feed, gameId, t]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 text-xs text-zinc-500",
          centered && "justify-center"
        )}
      >
        <Loader2 className="size-3 animate-spin" />
        {t("previewLoading")}
      </div>
    );
  }

  if (error) {
    return (
      <p className={cn("text-xs text-rose-400/90", centered && "text-center")}>
        {error}
      </p>
    );
  }

  if (!preview || preview.items.length === 0) {
    return (
      <p className={cn("text-xs text-zinc-500", centered && "text-center")}>
        {t("previewEmpty")}
      </p>
    );
  }

  return (
    <ul
      className={cn(
        "mt-2 space-y-1.5 border-t border-white/5 pt-2",
        centered && "text-center"
      )}
    >
      {preview.items.map((item) => (
        <li key={String(item.id)}>
          <a
            href={item.url}
            className="block text-xs text-zinc-400 hover:text-violet-300"
          >
            {item.title}
          </a>
        </li>
      ))}
    </ul>
  );
}
