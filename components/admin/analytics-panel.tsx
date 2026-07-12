"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Loader2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  AdminAnalyticsData,
  AnalyticsRange,
} from "@/lib/analytics-service";
import {
  AdminPanelHeader,
  adminPanelCenteredCardsClass,
} from "@/components/admin/admin-panel-header";
import { cn } from "@/lib/utils";

type ChartTooltipProps = {
  active?: boolean;
  payload?: Array<{
    color?: string;
    name?: string;
    value?: number;
  }>;
  label?: string;
};

function AnalyticsTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/95 px-4 py-3 shadow-2xl shadow-black/40 backdrop-blur-xl">
      <p className="mb-2 text-xs font-medium text-zinc-400">{label}</p>
      <div className="space-y-1.5">
        {payload.map((entry) => (
          <div
            key={entry.name}
            className="flex items-center justify-between gap-6 text-sm"
          >
            <span className="flex items-center gap-2 text-zinc-300">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}
            </span>
            <span className="font-semibold text-white">
              {entry.value?.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatPeriodLabel(value: string, locale: string) {
  try {
    if (value.includes(":")) {
      const hour = Number.parseInt(value.split(" ")[1]?.split(":")[0] ?? "0", 10);
      return `${String(hour).padStart(2, "0")}:00`;
    }

    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
    }).format(new Date(`${value}T00:00:00+08:00`));
  } catch {
    return value;
  }
}

type AdminAnalyticsPanelProps = {
  onError?: (message: string | null) => void;
};

export function AdminAnalyticsPanel({ onError }: AdminAnalyticsPanelProps) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const [range, setRange] = useState<AnalyticsRange>("today");
  const [analytics, setAnalytics] = useState<AdminAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/analytics?range=${encodeURIComponent(range)}`,
        { credentials: "same-origin" }
      );
      const data = (await response.json()) as {
        analytics?: AdminAnalyticsData;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? t("actionFailed"));
      }

      setAnalytics(data.analytics ?? null);
      setLastUpdated(new Date());
      onError?.(null);
    } catch (error) {
      onError?.(error instanceof Error ? error.message : t("actionFailed"));
    } finally {
      setLoading(false);
    }
  }, [onError, range, t]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadAnalytics();
    }, 30000);

    return () => window.clearInterval(timer);
  }, [loadAnalytics]);

  const chartData =
    analytics?.trend.map((point) => ({
      label: formatPeriodLabel(point.label, locale),
      pageViews: point.pageViews,
      gamePlays: point.gamePlays,
    })) ?? [];

  return (
    <div className={cn("space-y-6", adminPanelCenteredCardsClass)}>
      <AdminPanelHeader
        title={t("tabAnalytics")}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadAnalytics()}
            disabled={loading}
            className="border-white/10 bg-white/5"
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            {t("refresh")}
          </Button>
        }
      />

      <div className="flex flex-col items-center gap-3">
        <Tabs
          value={range}
          onValueChange={(value) => setRange(value as AnalyticsRange)}
        >
          <TabsList className="border border-white/10 bg-zinc-900/80 p-1">
            <TabsTrigger value="today" className="px-4">
              {t("analyticsToday")}
            </TabsTrigger>
            <TabsTrigger value="week" className="px-4">
              {t("analyticsWeek")}
            </TabsTrigger>
            <TabsTrigger value="month" className="px-4">
              {t("analyticsMonth")}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {lastUpdated && (
          <p className="text-center text-xs text-zinc-500">
            {t("analyticsUpdated")} ·{" "}
            {new Intl.DateTimeFormat(locale, {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }).format(lastUpdated)}
          </p>
        )}
      </div>

      {loading && !analytics ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-emerald-400" />
        </div>
      ) : analytics ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="border-cyan-400/20 bg-zinc-900/60">
              <CardHeader className="items-center pb-2 text-center">
                <CardDescription>{t("analyticsPageViews")}</CardDescription>
                <CardTitle className="text-3xl text-cyan-200">
                  {analytics.pageViews.toLocaleString()}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-sky-400/20 bg-zinc-900/60">
              <CardHeader className="items-center pb-2 text-center">
                <CardDescription>{t("analyticsUniqueVisitors")}</CardDescription>
                <CardTitle className="text-3xl text-sky-200">
                  {analytics.uniqueVisitors.toLocaleString()}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-violet-400/20 bg-zinc-900/60">
              <CardHeader className="items-center pb-2 text-center">
                <CardDescription>{t("analyticsGamePlays")}</CardDescription>
                <CardTitle className="text-3xl text-violet-200">
                  {analytics.gamePlays.toLocaleString()}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-fuchsia-400/20 bg-zinc-900/60">
              <CardHeader className="items-center pb-2 text-center">
                <CardDescription>{t("analyticsUniquePlayers")}</CardDescription>
                <CardTitle className="text-3xl text-fuchsia-200">
                  {analytics.uniquePlayers.toLocaleString()}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card className="border-white/10 bg-zinc-900/60">
            <CardHeader className="text-center">
              <CardTitle className="text-base text-white">
                {t("analyticsTrendTitle")}
              </CardTitle>
              <CardDescription>{t("analyticsTrendDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px] w-full min-h-[280px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <AreaChart
                    data={chartData}
                    margin={{ top: 12, right: 8, left: -12, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="adminVisitorsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="adminPlaysGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.42} />
                        <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke="rgba(255,255,255,0.06)"
                      strokeDasharray="4 8"
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "#a1a1aa", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#a1a1aa", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<AnalyticsTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="pageViews"
                      name={t("analyticsPageViews")}
                      stroke="#22d3ee"
                      fill="url(#adminVisitorsGradient)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="gamePlays"
                      name={t("analyticsGamePlays")}
                      stroke="#a78bfa"
                      fill="url(#adminPlaysGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-zinc-900/60">
            <CardHeader className="text-center">
              <CardTitle className="text-base text-white">
                {t("analyticsGamesTitle")}
              </CardTitle>
              <CardDescription>{t("analyticsGamesDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.gamesPlayed.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-500">
                  {t("analyticsEmptyGames")}
                </p>
              ) : (
                <div className="space-y-3">
                  {analytics.gamesPlayed.map((game, index) => (
                    <div
                      key={game.gameId}
                      className="flex flex-col items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center sm:flex-row sm:justify-center"
                    >
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-sm font-semibold text-zinc-300">
                        {index + 1}
                      </div>
                      <div className="relative size-14 shrink-0 overflow-hidden rounded-lg">
                        <Image
                          src={game.coverUrl}
                          alt={game.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-white">{game.title}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          ID #{game.gameId}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap justify-center gap-2">
                        <Badge className="border-violet-400/30 bg-violet-500/10 text-violet-200">
                          {t("analyticsPlaysCount", { count: game.plays })}
                        </Badge>
                        <Badge className="border-cyan-400/30 bg-cyan-500/10 text-cyan-200">
                          {t("analyticsPlayersCount", {
                            count: game.uniquePlayers,
                          })}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
