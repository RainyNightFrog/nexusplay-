"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  CalendarCheck,
  Flame,
  Gift,
  Loader2,
  RefreshCw,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useApiError } from "@/hooks/use-api-error";
import type {
  QuestProgressItem,
  QuestsDashboard,
} from "@/lib/quests-service";
import { cn } from "@/lib/utils";

type DailyQuestsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function formatCountdown(targetIso: string, nowMs: number) {
  const target = new Date(targetIso).getTime();
  const diff = Math.max(0, target - nowMs);
  const totalSec = Math.floor(diff / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function QuestCard({
  quest,
  claiming,
  onClaim,
  t,
}: {
  quest: QuestProgressItem;
  claiming: string | null;
  onClaim: (id: string) => void;
  t: ReturnType<typeof useTranslations<"quests">>;
}) {
  const percent = Math.min(
    100,
    Math.round((quest.progress / quest.targetCount) * 100)
  );

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-white">{quest.title}</p>
          <p className="mt-1 text-xs text-zinc-400">{quest.description}</p>
        </div>
        <span className="rounded-md bg-cyan-500/15 px-2 py-0.5 text-[11px] font-semibold text-cyan-200">
          +{quest.rewardAp} AP
        </span>
      </div>
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-[11px] text-zinc-400">
          <span>
            {t("progress", {
              current: quest.progress,
              target: quest.targetCount,
            })}
          </span>
          <span>{percent}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <Button
          type="button"
          size="sm"
          disabled={!quest.claimable || claiming !== null}
          onClick={() => onClaim(quest.id)}
        >
          {claiming === quest.id ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : null}
          {quest.claimed
            ? t("claimed")
            : quest.claimable
              ? t("claim")
              : t("inProgress")}
        </Button>
      </div>
    </div>
  );
}

export function DailyQuestsModal({ open, onOpenChange }: DailyQuestsModalProps) {
  const t = useTranslations("quests");
  const { profile } = useAuth();
  const { translateApiError } = useApiError();
  const [data, setData] = useState<QuestsDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/quests", { credentials: "same-origin" });
      const payload = (await response.json()) as QuestsDashboard & {
        error?: string;
      };
      if (!response.ok) {
        setError(translateApiError(payload.error) ?? t("loadError"));
        return;
      }
      setData(payload);
    } catch {
      setError(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [profile, t, translateApiError]);

  useEffect(() => {
    if (open && profile) void load();
  }, [open, profile, load]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [open]);

  async function claim(body: Record<string, unknown>, key: string) {
    setClaiming(key);
    setError(null);
    try {
      const response = await fetch("/api/quests/claim", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as QuestsDashboard & {
        error?: string;
      };
      if (!response.ok) {
        setError(translateApiError(payload.error) ?? t("claimFailed"));
        return;
      }
      setData(payload);
    } catch {
      setError(t("claimFailed"));
    } finally {
      setClaiming(null);
    }
  }

  const dailyCountdown = useMemo(
    () => (data ? formatCountdown(data.resetsAtDaily, nowMs) : "--:--:--"),
    [data, nowMs]
  );
  const weeklyCountdown = useMemo(
    () => (data ? formatCountdown(data.resetsAtWeekly, nowMs) : "--:--:--"),
    [data, nowMs]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto border-white/10 bg-zinc-950 text-zinc-100 sm:max-w-xl">
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="flex items-center justify-center gap-2 text-xl">
            <Target className="size-5 text-cyan-400" />
            {t("title")}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {t("subtitle")}
          </DialogDescription>
        </DialogHeader>

        {!profile ? (
          <p className="py-8 text-center text-sm text-zinc-400">
            {t("loginRequired")}
          </p>
        ) : loading && !data ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-7 animate-spin text-cyan-400" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void load()}
                disabled={loading}
                className="gap-1.5 text-zinc-400"
              >
                <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
                {t("refresh")}
              </Button>
            </div>

            {error && (
              <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-center text-xs text-rose-300">
                {error}
              </p>
            )}

            {data && (
              <>
                <section className="rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/10 via-transparent to-cyan-500/10 p-4">
                  <div className="flex items-center gap-2">
                    <Flame className="size-5 text-amber-400" />
                    <div>
                      <p className="text-sm font-semibold text-amber-100">
                        {t("streakTitle")}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {t("streakDays", { count: data.streak.streakDays })}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-7 gap-2">
                    {data.streak.calendar.map((active, index) => (
                      <div
                        key={`streak-day-${index}`}
                        className="flex flex-col items-center gap-1"
                      >
                        <div
                          className={cn(
                            "flex size-9 items-center justify-center rounded-full border text-xs font-semibold",
                            active
                              ? "border-amber-400/60 bg-amber-500/20 text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.35)]"
                              : "border-white/10 bg-white/5 text-zinc-500"
                          )}
                        >
                          {index + 1}
                        </div>
                        {index === 6 && (
                          <CalendarCheck className="size-3 text-cyan-400" />
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-center text-[11px] text-zinc-500">
                    {t("streakCalendarHint")}
                  </p>
                </section>

                <Tabs defaultValue="daily">
                  <TabsList className="mb-3 flex h-auto w-full rounded-xl border border-white/10 bg-zinc-900/70 p-1">
                    <TabsTrigger value="daily" className="flex-1 rounded-lg">
                      {t("tabDaily")}
                    </TabsTrigger>
                    <TabsTrigger value="weekly" className="flex-1 rounded-lg">
                      {t("tabWeekly")}
                    </TabsTrigger>
                  </TabsList>

                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-zinc-500">
                      {t("resetHint")}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={data.claimableCount === 0 || claiming !== null}
                      onClick={() => void claim({ claim_all: true }, "all")}
                      className="gap-1.5 border-cyan-400/30 bg-cyan-500/10 text-cyan-100"
                    >
                      {claiming === "all" ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Gift className="size-3.5" />
                      )}
                      {t("claimAll")}
                    </Button>
                  </div>

                  <TabsContent value="daily" className="mt-0 space-y-3">
                    <p className="text-center text-xs text-zinc-400">
                      {t("dailyResetIn", { time: dailyCountdown })}
                    </p>
                    {data.daily.map((quest) => (
                      <QuestCard
                        key={quest.id}
                        quest={quest}
                        claiming={claiming}
                        onClaim={(id) => void claim({ questId: id }, id)}
                        t={t}
                      />
                    ))}
                  </TabsContent>

                  <TabsContent value="weekly" className="mt-0 space-y-3">
                    <p className="text-center text-xs text-zinc-400">
                      {t("weeklyResetIn", { time: weeklyCountdown })}
                    </p>
                    {data.weekly.map((quest) => (
                      <QuestCard
                        key={quest.id}
                        quest={quest}
                        claiming={claiming}
                        onClaim={(id) => void claim({ questId: id }, id)}
                        t={t}
                      />
                    ))}
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
