"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { BarChart3, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GAME_GENRES, GAME_TAGS, type GameGenre } from "@/lib/game-metadata";
import { fetchPricingReference } from "@/lib/creator-tools/pricing-reference";
import { useGameI18n } from "@/hooks/use-game-i18n";
import { ToolMetric, ToolSectionCard } from "@/components/creator-tools/tool-section-card";
import { cn } from "@/lib/utils";

const inputClass = cn(
  "h-10 w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3 text-sm text-zinc-100",
  "outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-500/20"
);

type PricingReferencePanelProps = {
  initialGenre?: GameGenre | "";
  initialTag?: string;
};

export function PricingReferencePanel({
  initialGenre = "",
  initialTag = "",
}: PricingReferencePanelProps) {
  const t = useTranslations("creatorTools");
  const { localizedTag } = useGameI18n();
  const [genre, setGenre] = useState<GameGenre | "">(initialGenre);
  const [tag, setTag] = useState(initialTag);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof fetchPricingReference>> | null>(
    null
  );

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPricingReference({ genre, tag });
      setStats(data);
    } catch {
      setError(t("pricingLoadFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ToolSectionCard
      title={t("pricingTitle")}
      description={t("pricingDesc")}
      icon={<BarChart3 className="size-5" />}
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <label className="space-y-1.5 text-left">
            <span className="text-xs text-zinc-400">{t("pricingGenreFilter")}</span>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value as GameGenre | "")}
              className={inputClass}
            >
              <option value="">{t("pricingAllGenres")}</option>
              {GAME_GENRES.map((item) => (
                <option key={item} value={item}>
                  {localizedTag(item)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 text-left">
            <span className="text-xs text-zinc-400">{t("pricingTagFilter")}</span>
            <select value={tag} onChange={(e) => setTag(e.target.value)} className={inputClass}>
              <option value="">{t("pricingAllTags")}</option>
              {GAME_TAGS.slice(0, 40).map((item) => (
                <option key={item} value={item}>
                  {localizedTag(item)}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <Button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="h-10 w-full gap-2 border-0 bg-gradient-to-r from-cyan-500 to-violet-600 text-white sm:w-auto"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              {t("pricingRefresh")}
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-center text-sm text-rose-200">
            {error}
          </div>
        )}

        {stats && !error && (
          <>
            <p className="text-center text-xs text-zinc-500 sm:text-left">
              {t("pricingSampleSize", { count: stats.sampleSize })}
            </p>

            {stats.sampleSize === 0 ? (
              <p className="text-center text-sm text-zinc-500">{t("pricingNoData")}</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <ToolMetric
                    label={t("pricingFreePercent")}
                    value={`${stats.freePercent}%`}
                    accent="emerald"
                  />
                  <ToolMetric
                    label={t("pricingFixedPercent")}
                    value={`${stats.fixedPercent}%`}
                    accent="cyan"
                  />
                  <ToolMetric
                    label={t("pricingPwywPercent")}
                    value={`${stats.pwywPercent}%`}
                    accent="violet"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <ToolMetric
                    label={t("pricingAvgFixed")}
                    value={
                      stats.avgFixedPriceUsd != null
                        ? `$${stats.avgFixedPriceUsd.toFixed(2)}`
                        : "—"
                    }
                    accent="amber"
                  />
                  <ToolMetric
                    label={t("pricingMedianFixed")}
                    value={
                      stats.medianFixedPriceUsd != null
                        ? `$${stats.medianFixedPriceUsd.toFixed(2)}`
                        : "—"
                    }
                    accent="rose"
                  />
                  <ToolMetric
                    label={t("pricingP25")}
                    value={
                      stats.p25FixedPriceUsd != null
                        ? `$${stats.p25FixedPriceUsd.toFixed(2)}`
                        : "—"
                    }
                  />
                  <ToolMetric
                    label={t("pricingP75")}
                    value={
                      stats.p75FixedPriceUsd != null
                        ? `$${stats.p75FixedPriceUsd.toFixed(2)}`
                        : "—"
                    }
                  />
                </div>

                {stats.suggestedRangeUsd && (
                  <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-4 text-center">
                    <p className="text-sm font-medium text-emerald-200">
                      {t("pricingSuggestedRange")}
                    </p>
                    <p className="mt-1 text-2xl font-bold text-emerald-300 tabular-nums">
                      ${stats.suggestedRangeUsd.min.toFixed(2)} – $
                      {stats.suggestedRangeUsd.max.toFixed(2)}
                    </p>
                    <p className="mt-1 text-xs text-emerald-200/70">{t("pricingSuggestedHint")}</p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </ToolSectionCard>
  );
}
