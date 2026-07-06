"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  Coins,
  Loader2,
  Percent,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { TipsFeeDisclosure } from "@/components/dashboard/tips-fee-disclosure";
import {
  formatRevenueMoney,
  type DashboardRevenueAnalytics,
  type RevenueStatKey,
} from "@/lib/dashboard-revenue";
import { cn } from "@/lib/utils";

const RevenueChart = dynamic(
  () =>
    import("@/components/dashboard/revenue-chart").then(
      (mod) => mod.RevenueChart
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[280px] min-h-[280px] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-emerald-400" />
      </div>
    ),
  }
);

const REVENUE_ICONS: Record<RevenueStatKey, typeof Wallet> = {
  revenueTotal: Wallet,
  revenueTipsCount: Users,
  revenueAvgTip: Coins,
  revenueConversion: Percent,
};

const REVENUE_ACCENTS: Record<
  RevenueStatKey,
  { accent: string; iconBg: string }
> = {
  revenueTotal: {
    accent:
      "from-emerald-500/20 to-emerald-500/5 text-emerald-300 ring-emerald-400/20",
    iconBg: "bg-emerald-500/15 text-emerald-400",
  },
  revenueTipsCount: {
    accent:
      "from-fuchsia-500/20 to-fuchsia-500/5 text-fuchsia-300 ring-fuchsia-400/20",
    iconBg: "bg-fuchsia-500/15 text-fuchsia-400",
  },
  revenueAvgTip: {
    accent:
      "from-amber-500/20 to-amber-500/5 text-amber-300 ring-amber-400/20",
    iconBg: "bg-amber-500/15 text-amber-400",
  },
  revenueConversion: {
    accent:
      "from-cyan-500/20 to-cyan-500/5 text-cyan-300 ring-cyan-400/20",
    iconBg: "bg-cyan-500/15 text-cyan-400",
  },
};

type RevenuePanelProps = {
  data: DashboardRevenueAnalytics | null;
  loading?: boolean;
  error?: string | null;
  scopeKey: string;
  selectedGameId?: number;
  showBreakdown?: boolean;
  unreadTipCount?: number;
  onClearUnreadTips?: () => void;
};

export function RevenuePanel({
  data,
  loading = false,
  error = null,
  scopeKey,
  selectedGameId,
  showBreakdown = true,
  unreadTipCount = 0,
  onClearUnreadTips,
}: RevenuePanelProps) {
  const t = useTranslations("dashboard");

  useEffect(() => {
    if (unreadTipCount <= 0) return;
    fetch("/api/auth/creator-notifications", { method: "POST" })
      .then(() => onClearUnreadTips?.())
      .catch(() => undefined);
  }, [unreadTipCount, onClearUnreadTips]);

  const formatRelativeTime = (tip: DashboardRevenueAnalytics["recentTips"][0]) => {
    if (tip.relativeTimeKey === "revenueTimeJustNow") {
      return t("revenueTimeJustNow");
    }
    if (tip.relativeTimeKey === "revenueTimeHours") {
      return t("revenueTimeHours", { count: tip.relativeTimeValue ?? 1 });
    }
    return t("revenueTimeDays", { count: tip.relativeTimeValue ?? 1 });
  };

  if (loading && !data) {
    return (
      <section className="mb-8 space-y-6">
        <div className="text-center">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
            <Coins className="size-3.5" />
            {t("revenueLiveBadge")}
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {t("revenueSectionTitle")}
          </h2>
          <p className="mt-1 text-sm text-zinc-400">{t("revenueSectionDesc")}</p>
        </div>
        <Card className="border-white/10 bg-zinc-900/60 py-0">
          <CardContent className="flex h-48 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-emerald-400" />
          </CardContent>
        </Card>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mb-8 space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {t("revenueSectionTitle")}
          </h2>
        </div>
        <Card className="border-red-400/20 bg-red-500/5 py-0">
          <CardContent className="px-6 py-8 text-center text-sm text-red-300">
            {error}
          </CardContent>
        </Card>
      </section>
    );
  }

  if (!data) return null;

  return (
    <section className="mb-8 space-y-6">
      <div className="text-center">
        <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
            <Coins className="size-3.5" />
            {t("revenueLiveBadge")}
          </div>
          {unreadTipCount > 0 && (
            <Badge className="border-0 bg-fuchsia-500/20 text-fuchsia-200">
              {t("unreadTipsBadge", { count: unreadTipCount })}
            </Badge>
          )}
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          {t("revenueSectionTitle")}
        </h2>
        <p className="mt-1 text-sm text-zinc-400">{t("revenueSectionDesc")}</p>
      </div>

      {!data.tipsEnabled ? (
        <Card className="border-dashed border-white/10 bg-zinc-900/40 py-0">
          <CardContent className="flex flex-col items-center px-6 py-14 text-center">
            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-500/10">
              <Coins className="size-7 text-amber-300" />
            </div>
            <h3 className="text-lg font-semibold text-white">
              {t("revenueEmptyTitle")}
            </h3>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-400">
              {t("revenueEmptyDesc")}
            </p>
            {selectedGameId && (
              <Link
                href={`/dashboard/edit/${selectedGameId}`}
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "mt-6 border-0 bg-gradient-to-r from-amber-500 to-emerald-600 text-white hover:from-amber-400 hover:to-emerald-500"
                )}
              >
                {t("revenueEmptyAction")}
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <TipsFeeDisclosure variant="compact" className="mb-2 text-center" />

          <p className="text-center text-xs leading-relaxed text-zinc-500">
            {t("revenueLiveDataNote")}
          </p>
          {data.previewTipCount > 0 && (
            <p className="text-center text-xs leading-relaxed text-amber-400/80">
              {t("revenuePreviewTipsNote", { count: data.previewTipCount })}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {data.stats.map((stat, index) => {
              const Icon = REVENUE_ICONS[stat.key];
              const { accent, iconBg } = REVENUE_ACCENTS[stat.key];
              return (
                <motion.div
                  key={stat.key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.06 }}
                >
                  <Card
                    className={cn(
                      "overflow-hidden border-white/10 bg-zinc-900/60 py-0 shadow-lg shadow-black/30 backdrop-blur-sm",
                      "bg-gradient-to-br ring-1 ring-inset",
                      accent
                    )}
                  >
                    <CardContent className="p-5 text-center">
                      <div
                        className={cn(
                          "mx-auto flex size-10 items-center justify-center rounded-xl",
                          iconBg
                        )}
                      >
                        <Icon className="size-5" />
                      </div>
                      <p className="mt-3 text-sm text-zinc-300">{t(stat.key)}</p>
                      <p className="mt-2 text-3xl font-bold tracking-tight text-white">
                        {stat.value}
                      </p>
                      <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
                        <TrendingUp className="size-3.5" />
                        {stat.change}
                      </span>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.55fr_0.85fr]">
            <Card className="overflow-hidden border-white/10 bg-zinc-900/60 py-0 shadow-xl shadow-black/40 backdrop-blur-sm">
              <CardHeader className="border-b border-white/5 px-6 pt-6 pb-4 text-center">
                <CardTitle className="flex items-center justify-center gap-2 text-xl text-white">
                  <Wallet className="size-5 text-emerald-400" />
                  {t("revenueChartTitle")}
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  {t("revenueChartDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-2 pb-4 pt-2 sm:px-6 sm:pb-6">
                <RevenueChart key={scopeKey} data={data.trend} />
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-zinc-900/60 py-0 shadow-xl shadow-black/40 backdrop-blur-sm">
              <CardHeader className="border-b border-white/5 px-6 pt-6 pb-4 text-center">
                <CardTitle className="text-lg text-white">
                  {t("revenueRecentTitle")}
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  {t("revenueRecentDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent className="max-h-[320px] space-y-3 overflow-y-auto p-4 sm:p-6">
                {data.recentTips.length === 0 ? (
                  <p className="py-8 text-center text-sm text-zinc-500">
                    {t("revenueRecentEmpty")}
                  </p>
                ) : (
                  data.recentTips.map((tip) => (
                    <div
                      key={tip.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 transition-colors hover:border-emerald-400/20 hover:bg-emerald-500/[0.04]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">
                          {tip.playerLabel}
                        </p>
                        <p className="truncate text-xs text-zinc-500">
                          {tip.gameTitle}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold text-emerald-300">
                          {formatRevenueMoney(tip.amount)}
                        </p>
                        <div className="flex items-center justify-end gap-1.5">
                          {tip.status === "preview" && (
                            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
                              {t("revenuePreviewTipBadge")}
                            </span>
                          )}
                          <p className="text-[11px] text-zinc-500">
                            {formatRelativeTime(tip)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {showBreakdown && data.breakdown.some((row) => row.totalAmount > 0) && (
            <Card className="overflow-hidden border-white/10 bg-zinc-900/60 py-0 shadow-xl shadow-black/40 backdrop-blur-sm">
              <CardHeader className="border-b border-white/5 px-6 pt-6 pb-4 text-center">
                <CardTitle className="text-lg text-white">
                  {t("revenueBreakdownTitle")}
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  {t("revenueBreakdownDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full min-w-[640px] text-center text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-xs uppercase tracking-wider text-zinc-500">
                      <th className="px-6 py-3 font-medium">
                        {t("revenueBreakdownGame")}
                      </th>
                      <th className="px-4 py-3 font-medium">
                        {t("revenueBreakdownTips")}
                      </th>
                      <th className="px-4 py-3 font-medium">
                        {t("revenueAvgTip")}
                      </th>
                      <th className="px-4 py-3 font-medium">
                        {t("revenueBreakdownShare")}
                      </th>
                      <th className="px-6 py-3 font-medium">
                        {t("revenueBreakdownAmount")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.breakdown
                      .filter((row) => row.tipsEnabled && row.totalAmount > 0)
                      .map((row) => (
                        <tr
                          key={row.gameId}
                          className="transition-colors hover:bg-white/[0.02]"
                        >
                          <td className="px-6 py-4 font-medium text-white">
                            {row.title}
                          </td>
                          <td className="px-4 py-4 text-zinc-300">
                            {row.tipCount.toLocaleString()}
                          </td>
                          <td className="px-4 py-4 text-amber-300">
                            {formatRevenueMoney(row.avgTip)}
                          </td>
                          <td className="px-4 py-4 text-zinc-400">
                            {row.sharePercent.toFixed(1)}%
                          </td>
                          <td className="px-6 py-4 font-semibold text-emerald-300">
                            {formatRevenueMoney(row.totalAmount)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </section>
  );
}
