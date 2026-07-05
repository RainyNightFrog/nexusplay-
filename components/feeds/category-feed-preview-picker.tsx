"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { GAME_GENRES, type GameGenre } from "@/lib/game-metadata";
import { useGameI18n } from "@/hooks/use-game-i18n";
import { FeedPreviewPanel } from "@/components/feeds/feed-preview-panel";

export function CategoryFeedPreviewPicker() {
  const t = useTranslations("feeds");
  const { localizedTag } = useGameI18n();
  const [category, setCategory] = useState<GameGenre>(GAME_GENRES[0]!);

  return (
    <div className="mt-6 rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <label className="mb-2 block text-xs text-zinc-500">{t("categoryPreviewLabel")}</label>
      <select
        value={category}
        onChange={(event) => setCategory(event.target.value as GameGenre)}
        className="mb-3 w-full rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-200"
      >
        {GAME_GENRES.map((genre) => (
          <option key={genre} value={genre}>
            {localizedTag(genre)}
          </option>
        ))}
      </select>
      <FeedPreviewPanel feed="category" category={category} />
      <p className="mt-2 text-xs text-zinc-600">
        <a
          href={`/api/feeds/preview?feed=category&category=${encodeURIComponent(category)}&limit=10`}
          className="text-violet-400/90 hover:text-violet-300"
        >
          JSON
        </a>
      </p>
    </div>
  );
}
