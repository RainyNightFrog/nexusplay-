"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  CircleDashed,
} from "lucide-react";
import {
  evaluatePublishChecklist,
  summarizePublishChecklist,
  type PublishChecklistInput,
} from "@/lib/creator-tools/publish-checklist";
import { ToolProgressRing, ToolSectionCard } from "@/components/creator-tools/tool-section-card";
import { cn } from "@/lib/utils";

type PublishChecklistPanelProps = {
  input: PublishChecklistInput;
  compact?: boolean;
  showTitle?: boolean;
};

const STATUS_ICON = {
  done: CheckCircle2,
  warning: AlertCircle,
  missing: Circle,
  optional: CircleDashed,
} as const;

const STATUS_STYLE = {
  done: "text-emerald-400",
  warning: "text-amber-400",
  missing: "text-rose-400",
  optional: "text-zinc-600",
} as const;

export function PublishChecklistPanel({
  input,
  compact = false,
  showTitle = true,
}: PublishChecklistPanelProps) {
  const t = useTranslations("creatorTools");

  const items = useMemo(() => evaluatePublishChecklist(input), [input]);
  const summary = useMemo(() => summarizePublishChecklist(items), [items]);

  const content = (
    <div className={cn("space-y-5", compact && "space-y-4")}>
      <div
        className={cn(
          "flex flex-col items-center gap-4",
          !compact && "sm:flex-row sm:justify-between"
        )}
      >
        <ToolProgressRing percent={summary.score} label={t("checklistScoreLabel")} />
        <div
          className={cn(
            "grid w-full grid-cols-2 gap-2",
            !compact && "flex-1 sm:max-w-xs"
          )}
        >
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-center">
            <p className="text-lg font-bold text-emerald-300 tabular-nums">
              {summary.requiredDone}/{summary.requiredTotal}
            </p>
            <p className="text-[11px] text-emerald-200/80">{t("checklistRequiredDone")}</p>
          </div>
          <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-center">
            <p className="text-lg font-bold text-amber-300 tabular-nums">{summary.warnings}</p>
            <p className="text-[11px] text-amber-200/80">{t("checklistWarnings")}</p>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "grid gap-2",
          compact ? "grid-cols-1" : "sm:grid-cols-2"
        )}
      >
        {items.map((item) => {
          const Icon = STATUS_ICON[item.status];
          return (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left",
                item.status === "done" && "border-emerald-400/20 bg-emerald-500/5",
                item.status === "warning" && "border-amber-400/20 bg-amber-500/5",
                item.status === "missing" && "border-rose-400/20 bg-rose-500/5",
                item.status === "optional" && "border-white/8 bg-zinc-950/40"
              )}
            >
              <Icon className={cn("size-4 shrink-0", STATUS_STYLE[item.status])} />
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "leading-snug text-zinc-200",
                    compact ? "text-xs" : "text-sm"
                  )}
                >
                  {t(`checklistItem_${item.id}`)}
                </p>
                {item.id === "tags" && (
                  <p className="text-[11px] text-zinc-500">
                    {t("checklistTagsHint", {
                      count: input.tags.length,
                      recommended: summary.maxTags,
                    })}
                  </p>
                )}
              </div>
              {item.required && item.status === "missing" && (
                <span className="shrink-0 rounded-md bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-medium text-rose-300">
                  {t("checklistRequiredBadge")}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div
        className={cn(
          "rounded-xl border px-4 py-3 text-center text-sm",
          summary.readyToPublish
            ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
            : "border-amber-400/25 bg-amber-500/10 text-amber-200"
        )}
      >
        {summary.readyToPublish ? t("checklistReady") : t("checklistNotReady")}
      </div>
    </div>
  );

  if (!showTitle) return content;

  return (
    <ToolSectionCard
      title={t("checklistTitle")}
      description={t("checklistDesc")}
      icon={<CheckCircle2 className="size-5" />}
    >
      {content}
    </ToolSectionCard>
  );
}
