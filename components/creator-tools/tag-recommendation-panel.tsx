"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Sparkles, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  evaluateTagCoverage,
  recommendTags,
  type TagRecommendation,
} from "@/lib/creator-tools/tag-recommendation";
import type { GameGenre } from "@/lib/game-metadata";
import { MAX_GAME_TAGS } from "@/lib/game-metadata";
import { useGameI18n } from "@/hooks/use-game-i18n";
import { ToolProgressRing } from "@/components/creator-tools/tool-section-card";
import { cn } from "@/lib/utils";

type TagRecommendationPanelProps = {
  title: string;
  description: string;
  genre: GameGenre | "";
  selectedTags: string[];
  onApplyTag: (tag: string) => void;
  onApplyAll?: (tags: string[]) => void;
  compact?: boolean;
};

function reasonLabel(
  t: ReturnType<typeof useTranslations<"creatorTools">>,
  reason: TagRecommendation["reason"]
) {
  if (reason === "keyword") return t("tagReasonKeyword");
  if (reason === "genre") return t("tagReasonGenre");
  return t("tagReasonPopular");
}

export function TagRecommendationPanel({
  title,
  description,
  genre,
  selectedTags,
  onApplyTag,
  onApplyAll,
  compact = false,
}: TagRecommendationPanelProps) {
  const t = useTranslations("creatorTools");
  const { localizedTag } = useGameI18n();

  const recommendations = useMemo(
    () =>
      recommendTags({
        title,
        description,
        genre,
        selectedTags,
      }),
    [title, description, genre, selectedTags]
  );

  const coverage = useMemo(
    () => evaluateTagCoverage(selectedTags),
    [selectedTags]
  );

  const applicable = recommendations.filter((item) => !selectedTags.includes(item.tag));
  const canAddMore = selectedTags.length < MAX_GAME_TAGS;

  return (
    <div
      className={cn(
        "rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/8 via-zinc-950/40 to-cyan-500/5",
        compact ? "p-4" : "p-5"
      )}
    >
      <div className="mb-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="text-center sm:text-left">
          <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium text-violet-300">
            <Sparkles className="size-3.5" />
            {t("tagAssistantBadge")}
          </div>
          <p className="text-sm font-medium text-white">{t("tagAssistantTitle")}</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400">
            {t("tagAssistantDesc", { min: coverage.recommendedMin })}
          </p>
        </div>
        <ToolProgressRing
          percent={coverage.coveragePercent}
          label={t("tagCoverageLabel")}
          size={72}
        />
      </div>

      {title.trim() || description.trim() ? (
        <div className="space-y-3">
          {applicable.length > 0 ? (
            <>
              <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                {applicable.slice(0, compact ? 6 : 10).map((item) => (
                  <button
                    key={item.tag}
                    type="button"
                    disabled={!canAddMore}
                    onClick={() => onApplyTag(item.tag)}
                    className={cn(
                      "group inline-flex items-center gap-1.5 rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1.5 text-xs text-violet-100 transition",
                      "hover:border-violet-300/50 hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    )}
                  >
                    <Plus className="size-3 opacity-70 group-hover:opacity-100" />
                    {localizedTag(item.tag)}
                    <span className="text-[10px] text-violet-300/70">
                      {reasonLabel(t, item.reason)}
                    </span>
                  </button>
                ))}
              </div>
              {onApplyAll && applicable.length > 1 && canAddMore && (
                <div className="flex justify-center sm:justify-start">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onApplyAll(
                        applicable
                          .slice(0, MAX_GAME_TAGS - selectedTags.length)
                          .map((item) => item.tag)
                      )
                    }
                    className="border-violet-400/30 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20"
                  >
                    {t("tagApplySuggested", {
                      count: Math.min(
                        applicable.length,
                        MAX_GAME_TAGS - selectedTags.length
                      ),
                    })}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <p className="text-center text-xs text-zinc-500 sm:text-left">
              {t("tagNoMoreSuggestions")}
            </p>
          )}
        </div>
      ) : (
        <p className="text-center text-xs text-zinc-500 sm:text-left">
          {t("tagNeedText")}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 border-t border-white/8 pt-3 sm:justify-start">
        <Badge variant="outline" className="border-white/15 text-zinc-300">
          {t("tagSelectedCount", { count: selectedTags.length, max: MAX_GAME_TAGS })}
        </Badge>
        {coverage.needsMore && (
          <Badge className="border-amber-400/30 bg-amber-500/15 text-amber-200">
            {t("tagNeedsMore", { min: coverage.recommendedMin })}
          </Badge>
        )}
        {coverage.level === "excellent" && (
          <Badge className="border-emerald-400/30 bg-emerald-500/15 text-emerald-200">
            {t("tagCoverageExcellent")}
          </Badge>
        )}
      </div>
    </div>
  );
}
