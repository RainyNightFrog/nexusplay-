"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import type { FeedPreviewResult } from "@/lib/feed-preview-service";

type FeedPreviewPanelProps = {
  feed: FeedPreviewResult["feed"];
  category?: string;
};

export function FeedPreviewPanel({ feed, category }: FeedPreviewPanelProps) {
  const t = useTranslations("feeds");
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<FeedPreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ feed, limit: "5" });
    if (category) params.set("category", category);

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
  }, [category, feed, t]);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Loader2 className="size-3 animate-spin" />
        {t("previewLoading")}
      </div>
    );
  }

  if (error) {
    return <p className="text-xs text-rose-400/90">{error}</p>;
  }

  if (!preview || preview.items.length === 0) {
    return <p className="text-xs text-zinc-500">{t("previewEmpty")}</p>;
  }

  return (
    <ul className="mt-2 space-y-1.5 border-t border-white/5 pt-2">
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
