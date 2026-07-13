"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Eye, Heart, Share2, Users } from "lucide-react";
import { TAG_COLORS } from "@/lib/games";
import { useGameI18n } from "@/hooks/use-game-i18n";
import { ToolSectionCard } from "@/components/creator-tools/tool-section-card";
import { cn } from "@/lib/utils";

type StorePreviewPanelProps = {
  title: string;
  description: string;
  genre: string;
  tags: string[];
  coverPreviewUrl?: string | null;
  pricingLabel?: string;
};

export function StorePreviewPanel({
  title,
  description,
  genre,
  tags,
  coverPreviewUrl,
  pricingLabel,
}: StorePreviewPanelProps) {
  const t = useTranslations("creatorTools");
  const tHome = useTranslations("home");
  const { localizedTag } = useGameI18n();

  const displayTitle = title.trim() || t("previewPlaceholderTitle");
  const displayDesc =
    description.trim().slice(0, 120) || t("previewPlaceholderDesc");
  const displayTags = tags.filter(Boolean).slice(0, 4);

  return (
    <ToolSectionCard
      title={t("previewTitle")}
      description={t("previewDesc")}
      icon={<Eye className="size-5" />}
    >
      <div className="grid gap-5 lg:grid-cols-2">
        {/* 首頁卡片預覽 */}
        <div className="space-y-2">
          <p className="text-center text-xs font-medium tracking-wide text-zinc-500 uppercase lg:text-left">
            {t("previewHomeCard")}
          </p>
          <div className="mx-auto max-w-xs">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60 shadow-lg shadow-black/40">
              <div className="relative aspect-[16/10] overflow-hidden bg-zinc-800">
                {coverPreviewUrl ? (
                  <Image
                    src={coverPreviewUrl}
                    alt={displayTitle}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-zinc-600">
                    {t("previewNoCover")}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
              </div>
              <div className="space-y-3 p-4 text-center">
                <h3 className="text-base font-semibold text-white">{displayTitle}</h3>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {(displayTags.length > 0 ? displayTags : genre ? [genre] : []).map(
                    (tag) => (
                      <span
                        key={tag}
                        className={cn(
                          "rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                          TAG_COLORS[tag] ?? "bg-zinc-700/50 text-zinc-300 ring-zinc-600/40"
                        )}
                      >
                        {localizedTag(tag)}
                      </span>
                    )
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <Users className="size-3.5 text-cyan-400/80" />
                    0 {tHome("statsPlaying")}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Heart className="size-3.5 text-rose-400/80" />
                    0 {tHome("statsFavorites")}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Share2 className="size-3.5 text-fuchsia-400/80" />
                    0 {tHome("statsShares")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 社群分享卡預覽 */}
        <div className="space-y-2">
          <p className="text-center text-xs font-medium tracking-wide text-zinc-500 uppercase lg:text-left">
            {t("previewShareCard")}
          </p>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black shadow-xl">
            <div className="relative aspect-[1.91/1] bg-zinc-800">
              {coverPreviewUrl ? (
                <Image
                  src={coverPreviewUrl}
                  alt={displayTitle}
                  fill
                  className="object-cover opacity-90"
                  unoptimized
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 text-left">
                <p className="text-[10px] font-semibold tracking-widest text-cyan-400 uppercase">
                  RainyNightFrog
                </p>
                <h3 className="mt-1 line-clamp-2 text-lg font-bold text-white">
                  {displayTitle}
                </h3>
                <p className="mt-1 line-clamp-2 text-xs text-zinc-300">{displayDesc}</p>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-white/8 px-4 py-3 text-xs">
              <span className="text-zinc-400">{genre ? localizedTag(genre) : "—"}</span>
              <span className="font-medium text-emerald-300">
                {pricingLabel ?? t("previewPricingFree")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </ToolSectionCard>
  );
}
