"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
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
import { localeDateMap, type AppLocale } from "@/i18n/routing";
import { localizeQuestByCode } from "@/lib/quest-i18n";
import type {
  QuestProgressItem,
  QuestsDashboard,
} from "@/lib/quests-service";
import { requestRefreshApBalance } from "@/lib/refresh-ap-balance";
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

function addDaysIso(dateIso: string, delta: number): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  const utc = Date.UTC(y!, m! - 1, d! + delta);
  return new Date(utc).toISOString().slice(0, 10);
}

function resolveDateLocale(locale: string) {
  return localeDateMap[locale as AppLocale] ?? locale;
}

function formatStreakWeekday(dayIso: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(resolveDateLocale(locale), {
      weekday: "short",
      timeZone: "UTC",
    }).format(new Date(`${dayIso}T12:00:00Z`));
  } catch {
    return dayIso.slice(5);
  }
}

function QuestCard({
  quest,
  claiming,
  loading,
  onClaim,
  locale,
  t,
}: {
  quest: QuestProgressItem;
  claiming: string | null;
  loading: boolean;
  onClaim: (id: string) => void;
  locale: string;
  t: ReturnType<typeof useTranslations<"quests">>;
}) {
  const percent = Math.min(
    100,
    Math.round((quest.progress / quest.targetCount) * 100)
  );
  const localized = localizeQuestByCode(quest.code, locale, {
    title: quest.title,
    description: quest.description,
  });
  const isClaimingThis = claiming === quest.id;
  const busy = loading || claiming !== null;

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-white">{localized.title}</p>
          <p className="mt-1 text-xs text-zinc-400">{localized.description}</p>
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
          disabled={!quest.claimable || busy}
          onClick={() => onClaim(quest.id)}
          className="gap-1.5"
        >
          {isClaimingThis ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              {t("claiming")}
            </>
          ) : quest.claimed ? (
            t("claimed")
          ) : quest.claimable ? (
            t("claim")
          ) : (
            t("inProgress")
          )}
        </Button>
      </div>
    </div>
  );
}

export function DailyQuestsModal({ open, onOpenChange }: DailyQuestsModalProps) {
  const t = useTranslations("quests");
  const locale = useLocale();
  const { profile, refreshProfile } = useAuth();
  const { translateApiError } = useApiError();
  const [data, setData] = useState<QuestsDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const claimingRef = useRef<string | null>(null);
  const dataRef = useRef<QuestsDashboard | null>(null);
  const loadSeqRef = useRef(0);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!profile) return;
      const seq = ++loadSeqRef.current;
      const silent = Boolean(opts?.silent && dataRef.current);
      if (!silent) setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/quests", {
          credentials: "same-origin",
        });
        const payload = (await response.json()) as QuestsDashboard & {
          error?: string;
        };
        if (seq !== loadSeqRef.current) return;
        if (!response.ok) {
          setError(translateApiError(payload.error) ?? t("loadError"));
          return;
        }
        setData(payload);
      } catch {
        if (seq !== loadSeqRef.current) return;
        setError(t("loadError"));
      } finally {
        if (seq === loadSeqRef.current) setLoading(false);
      }
    },
    [profile, t, translateApiError]
  );

  useEffect(() => {
    if (!open || !profile) return;
    // 有快取時先顯示舊資料，背景靜默刷新，避免重複全頁 Spinner
    void load({ silent: true });
  }, [open, profile, load]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [open]);

  async function claim(body: Record<string, unknown>, key: string) {
    if (claimingRef.current || loading) return;
    claimingRef.current = key;
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
      await refreshProfile();
      requestRefreshApBalance();
    } catch {
      setError(t("claimFailed"));
    } finally {
      claimingRef.current = null;
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

  const streakDaysMeta = useMemo(() => {
    if (!data) return [];
    return data.streak.calendar.map((active, index) => {
      const dayIso = addDaysIso(data.questDate, index - 6);
      const dayOfMonth = Number(dayIso.slice(8, 10));
      const isToday = index === 6;
      return {
        active,
        dayIso,
        dayOfMonth,
        isToday,
        weekday: formatStreakWeekday(dayIso, locale),
      };
    });
  }, [data, locale]);

  const busy = loading || claiming !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90dvh,90vh)] max-w-lg overflow-y-auto border-white/10 bg-zinc-950 text-zinc-100 sm:max-w-xl">
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="flex items-center justify-center gap-2 text-xl">
            <Target className="size-5 text-cyan-400" />
            {t("title")}
          </DialogTitle>
          {t("subtitle") ? (
            <DialogDescription className="text-zinc-400">
              {t("subtitle")}
            </DialogDescription>
          ) : (
            <DialogDescription className="sr-only">{t("title")}</DialogDescription>
          )}
        </DialogHeader>

        {!profile ? (
          <p className="py-8 text-center text-sm text-zinc-400">
            {t("loginRequired")}
          </p>
        ) : loading && !data ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12">
            <Loader2 className="size-7 animate-spin text-cyan-400" />
            <p className="text-xs text-zinc-500">{t("loading")}</p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void load()}
                disabled={busy}
                className="gap-1.5 text-zinc-400"
              >
                <RefreshCw
                  className={cn("size-3.5", loading && "animate-spin")}
                />
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
                  <div className="mt-4 grid grid-cols-7 gap-1.5 sm:gap-2">
                    {streakDaysMeta.map((day) => (
                      <div
                        key={day.dayIso}
                        className="flex flex-col items-center gap-1"
                      >
                        <span
                          className={cn(
                            "text-[10px] font-medium",
                            day.isToday ? "text-cyan-300" : "text-zinc-500"
                          )}
                        >
                          {day.weekday}
                        </span>
                        <div
                          className={cn(
                            "relative flex size-9 items-center justify-center rounded-full border text-xs font-semibold tabular-nums",
                            day.active
                              ? "border-amber-400/60 bg-amber-500/20 text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.35)]"
                              : "border-white/10 bg-white/5 text-zinc-500",
                            day.isToday && "ring-2 ring-cyan-400/40"
                          )}
                          title={day.dayIso}
                        >
                          {day.dayOfMonth}
                          {day.isToday && (
                            <CalendarCheck className="absolute -bottom-1 -right-1 size-3 text-cyan-400" />
                          )}
                        </div>
                        <span
                          className={cn(
                            "text-[10px]",
                            day.isToday
                              ? "font-medium text-cyan-300"
                              : "text-transparent"
                          )}
                        >
                          {day.isToday ? t("streakToday") : "·"}
                        </span>
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
                    <p className="text-xs text-zinc-500">{t("resetHint")}</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={
                        data.claimableCount === 0 || busy
                      }
                      onClick={() => void claim({ claim_all: true }, "all")}
                      className="gap-1.5 border-cyan-400/30 bg-cyan-500/10 text-cyan-100"
                    >
                      {claiming === "all" ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Gift className="size-3.5" />
                      )}
                      {claiming === "all" ? t("claiming") : t("claimAll")}
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
                        loading={loading}
                        onClaim={(id) => void claim({ questId: id }, id)}
                        locale={locale}
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
                        loading={loading}
                        onClaim={(id) => void claim({ questId: id }, id)}
                        locale={locale}
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
