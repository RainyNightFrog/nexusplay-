"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Clock3,
  Gamepad2,
  Heart,
  Loader2,
  Share2,
  Sparkles,
  Trash2,
  TrendingUp,
  Upload,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ALL_GAMES_SCOPE,
  getDashboardAnalytics,
  getDashboardHighlights,
  HIGHLIGHT_TIME_RANGES,
  type AnalyticsScope,
  type HighlightTimeRange,
} from "@/lib/dashboard-analytics";
import { getDashboardRevenue } from "@/lib/dashboard-revenue";
import { RevenuePanel } from "@/components/dashboard/revenue-panel";
import {
  fetchCreatorGames,
  type CreatorGameRecord,
} from "@/lib/creator-games";
import { deleteGame } from "@/lib/delete-game";
import { useFormatCount } from "@/hooks/use-format-count";
import { useApiError } from "@/hooks/use-api-error";
import { cn } from "@/lib/utils";

const TrendChart = dynamic(
  () =>
    import("@/components/dashboard/trend-chart").then((mod) => mod.TrendChart),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[320px] min-h-[320px] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-cyan-400" />
      </div>
    ),
  }
);

const STAT_ICONS = {
  statPlays: Gamepad2,
  statLikes: Heart,
  statPlayTime: Clock3,
  statShares: Share2,
} as const;

const HIGHLIGHT_TIME_LABEL_KEYS: Record<HighlightTimeRange, string> = {
  week: "highlightsTimeWeek",
  last7: "highlightsTimeLast7",
  last14: "highlightsTimeLast14",
  last30: "highlightsTimeLast30",
};

const STAT_ACCENTS: Record<
  keyof typeof STAT_ICONS,
  { accent: string; iconBg: string }
> = {
  statPlays: {
    accent:
      "from-cyan-500/20 to-cyan-500/5 text-cyan-300 ring-cyan-400/20",
    iconBg: "bg-cyan-500/15 text-cyan-400",
  },
  statLikes: {
    accent:
      "from-rose-500/20 to-rose-500/5 text-rose-300 ring-rose-400/20",
    iconBg: "bg-rose-500/15 text-rose-400",
  },
  statPlayTime: {
    accent:
      "from-violet-500/20 to-violet-500/5 text-violet-300 ring-violet-400/20",
    iconBg: "bg-violet-500/15 text-violet-400",
  },
  statShares: {
    accent:
      "from-fuchsia-500/20 to-fuchsia-500/5 text-fuchsia-300 ring-fuchsia-400/20",
    iconBg: "bg-fuchsia-500/15 text-fuchsia-400",
  },
};

function formatUploadDate(date: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(date));
  } catch {
    return date.slice(0, 10);
  }
}

export default function CreatorDashboardPage() {
  const t = useTranslations("dashboard");
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { formatCount } = useFormatCount();
  const { translateApiError } = useApiError();

  const [games, setGames] = useState<CreatorGameRecord[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [gamesError, setGamesError] = useState<string | null>(null);
  const [analyticsScope, setAnalyticsScope] =
    useState<AnalyticsScope>(ALL_GAMES_SCOPE);
  const [highlightTimeRange, setHighlightTimeRange] =
    useState<HighlightTimeRange>("week");
  const [deleteTarget, setDeleteTarget] = useState<CreatorGameRecord | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadGames = useCallback(async () => {
    setGamesLoading(true);
    setGamesError(null);

    try {
      const nextGames = await fetchCreatorGames();
      setGames(nextGames);
    } catch (error) {
      setGamesError(
        error instanceof Error ? error.message : t("readFailed")
      );
    } finally {
      setGamesLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadGames();
  }, [loadGames]);

  const selectedGame = useMemo(
    () =>
      analyticsScope === ALL_GAMES_SCOPE
        ? null
        : games.find((game) => game.id === analyticsScope) ?? null,
    [analyticsScope, games]
  );

  const analytics = useMemo(
    () => getDashboardAnalytics(analyticsScope, games),
    [analyticsScope, games]
  );

  const highlights = useMemo(
    () => getDashboardHighlights(analyticsScope, games, highlightTimeRange),
    [analyticsScope, games, highlightTimeRange]
  );

  const highlightPeriodLabel = t(
    HIGHLIGHT_TIME_LABEL_KEYS[highlightTimeRange]
  );

  const revenue = useMemo(
    () => getDashboardRevenue(analyticsScope, games),
    [analyticsScope, games]
  );

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      await deleteGame(deleteTarget.id);

      if (analyticsScope === deleteTarget.id) {
        setAnalyticsScope(ALL_GAMES_SCOPE);
      }

      setDeleteTarget(null);
      await loadGames();
    } catch (error) {
      const raw = error instanceof Error ? error.message : null;
      setDeleteError(
        translateApiError(raw) ?? raw ?? t("deleteGameFailed")
      );
    } finally {
      setDeleting(false);
    }
  };

  const STATUS_META = {
    public: {
      label: t("statusPublic"),
      className: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/25",
    },
    draft: {
      label: t("statusDraft"),
      className: "bg-amber-500/15 text-amber-300 ring-amber-400/25",
    },
  } as const;

  const scopeSelectValue =
    analyticsScope === ALL_GAMES_SCOPE
      ? ALL_GAMES_SCOPE
      : String(analyticsScope);

  return (
    <div className="dark relative min-h-full text-zinc-100">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-zinc-950/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "gap-1.5 text-zinc-400 hover:text-cyan-300"
            )}
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">{tNav("backHome")}</span>
          </Link>

          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-violet-600 shadow-md shadow-cyan-500/20">
              <BarChart3 className="size-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                {t("creatorDashboard")}
              </p>
              <p className="hidden text-xs text-zinc-500 sm:block">
                {t("creatorAnalytics")}
              </p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <LanguageSwitcher />
            <Link
              href="/dashboard/upload"
              className={cn(
                buttonVariants({ size: "sm" }),
                "gap-1.5 border-0 bg-gradient-to-r from-cyan-500 to-violet-600 text-white shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-violet-500"
              )}
            >
              <Upload className="size-4" />
              <span className="hidden sm:inline">{t("uploadNewGame")}</span>
              <span className="sm:hidden">{t("uploadShort")}</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-1.5 text-xs font-medium text-cyan-300">
            <Sparkles className="size-3.5" />
            {selectedGame ? t("overviewBadgeGame") : t("overviewBadge")}
          </div>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {selectedGame
                  ? t("analyticsForGame", { title: selectedGame.title })
                  : t("welcomeBack")}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
                {selectedGame ? t("welcomeDescGame") : t("welcomeDesc")}
              </p>
            </div>

            <div className="w-full max-w-sm shrink-0">
              <label className="mb-2 block text-xs font-medium text-zinc-500">
                {t("selectGame")}
              </label>
              <Select
                value={scopeSelectValue}
                onValueChange={(value) => {
                  if (!value) return;
                  setAnalyticsScope(
                    value === ALL_GAMES_SCOPE
                      ? ALL_GAMES_SCOPE
                      : Number.parseInt(value, 10)
                  );
                }}
                disabled={gamesLoading}
              >
                <SelectTrigger className="w-full border-white/10 bg-zinc-900/80 text-zinc-100">
                  <SelectValue placeholder={t("selectGame")} />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-zinc-900 text-zinc-100">
                  <SelectItem value={ALL_GAMES_SCOPE}>
                    {t("allGamesTotal")}
                  </SelectItem>
                  {games.map((game) => (
                    <SelectItem key={game.id} value={String(game.id)}>
                      {game.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </motion.div>

        <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {analytics.stats.map((stat, index) => {
            const Icon = STAT_ICONS[stat.key];
            const { accent, iconBg } = STAT_ACCENTS[stat.key];
            return (
              <motion.div
                key={stat.key}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
              >
                <Card
                  className={cn(
                    "overflow-hidden border-white/10 bg-zinc-900/60 py-0 shadow-lg shadow-black/30 backdrop-blur-sm",
                    "bg-gradient-to-br ring-1 ring-inset",
                    accent
                  )}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-zinc-300">{t(stat.key)}</p>
                      </div>
                      <div
                        className={cn(
                          "flex size-10 items-center justify-center rounded-xl",
                          iconBg
                        )}
                      >
                        <Icon className="size-5" />
                      </div>
                    </div>
                    <div className="mt-5 flex items-end justify-between gap-3">
                      <p className="text-3xl font-bold tracking-tight text-white">
                        {stat.value}
                      </p>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
                        <TrendingUp className="size-3.5" />
                        {stat.change}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </section>

        <section className="mb-8 grid gap-6 xl:grid-cols-[1.6fr_0.8fr]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="overflow-hidden border-white/10 bg-zinc-900/60 py-0 shadow-xl shadow-black/40 backdrop-blur-sm">
              <CardHeader className="border-b border-white/5 px-6 pt-6 pb-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl text-white">
                      <Activity className="size-5 text-cyan-400" />
                      {t("chartTitle")}
                    </CardTitle>
                    <CardDescription className="mt-1 text-zinc-400">
                      {selectedGame
                        ? t("chartDescSingle", { title: selectedGame.title })
                        : t("chartDesc")}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs">
                    <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-cyan-300">
                      <span className="size-2 rounded-full bg-cyan-400" />
                      {t("chartViews")}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-violet-300">
                      <span className="size-2 rounded-full bg-violet-400" />
                      {t("chartPlays")}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-2 pb-4 pt-2 sm:px-6 sm:pb-6">
                <TrendChart key={scopeSelectValue} data={analytics.trend} />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.28 }}
          >
            <Card className="h-full border-white/10 bg-zinc-900/60 py-0 shadow-xl shadow-black/40 backdrop-blur-sm">
              <CardHeader className="border-b border-white/5 px-6 pt-6 pb-4 text-center">
                <CardTitle className="text-lg text-white">
                  {t("highlightsTitle")}
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  {selectedGame
                    ? t("highlightsDescSingle", {
                        title: selectedGame.title,
                        period: highlightPeriodLabel,
                      })
                    : t("highlightsDesc", { period: highlightPeriodLabel })}
                </CardDescription>
                <div className="mt-4 flex justify-center">
                  <Select
                    value={highlightTimeRange}
                    onValueChange={(value) =>
                      setHighlightTimeRange(value as HighlightTimeRange)
                    }
                  >
                    <SelectTrigger
                      aria-label={t("highlightsTimeLabel")}
                      className="w-[180px] border-white/10 bg-white/5 text-white"
                    >
                      <SelectValue placeholder={t("highlightsTimeLabel")} />
                    </SelectTrigger>
                    <SelectContent>
                      {HIGHLIGHT_TIME_RANGES.map((range) => (
                        <SelectItem key={range} value={range}>
                          {t(HIGHLIGHT_TIME_LABEL_KEYS[range])}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                {highlights.map((item) => (
                  <div
                    key={item.labelKey}
                    className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 text-center"
                  >
                    <p className="text-xs text-zinc-500">{t(item.labelKey)}</p>
                    <p className="mt-1 text-2xl font-bold text-white">
                      {item.value}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {t(item.hintKey)}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </section>

        <RevenuePanel
          data={revenue}
          scopeKey={scopeSelectValue}
          selectedGameId={selectedGame?.id}
          showBreakdown={analyticsScope === ALL_GAMES_SCOPE}
        />

        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.34 }}
        >
          <Card className="overflow-hidden border-white/10 bg-zinc-900/60 py-0 shadow-xl shadow-black/40 backdrop-blur-sm">
            <CardHeader className="border-b border-white/5 px-6 pt-6 pb-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl text-white">
                    {t("gamesListTitle")}
                  </CardTitle>
                  <CardDescription className="mt-1 text-zinc-400">
                    {t("gamesListDesc")}
                  </CardDescription>
                </div>
                <Button
                  nativeButton={false}
                  render={<Link href="/dashboard/upload" />}
                  className="gap-2 border-0 bg-gradient-to-r from-cyan-500 to-violet-600 text-white hover:from-cyan-400 hover:to-violet-500"
                >
                  <Upload className="size-4" />
                  {t("uploadNewGame")}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {gamesLoading ? (
                <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-zinc-400">
                  <Loader2 className="size-4 animate-spin text-cyan-400" />
                  {t("loadingGames")}
                </div>
              ) : gamesError ? (
                <div className="space-y-4 px-6 py-16 text-center">
                  <p className="text-sm text-rose-300">{gamesError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void loadGames()}
                    className="border-white/10 bg-white/5 text-zinc-200"
                  >
                    {t("retryLoad")}
                  </Button>
                </div>
              ) : games.length === 0 ? (
                <div className="px-6 py-16 text-center text-sm text-zinc-400">
                  {t("noGamesYet")}
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {games.map((game) => {
                    const statusKey =
                      game.publish_status === "public" ? "public" : "draft";
                    const status = STATUS_META[statusKey];
                    const isSelected = analyticsScope === game.id;

                    return (
                      <div
                        key={game.id}
                        className={cn(
                          "flex flex-col gap-4 px-4 py-4 transition-colors sm:flex-row sm:items-center sm:px-6",
                          isSelected
                            ? "bg-cyan-500/[0.06]"
                            : "hover:bg-white/[0.02]"
                        )}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-4">
                          <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-zinc-800">
                            <Image
                              src={game.cover_url}
                              alt={game.title}
                              fill
                              sizes="64px"
                              className="object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate text-base font-semibold text-white">
                                {game.title}
                              </h3>
                              <span
                                className={cn(
                                  "rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                                  status.className
                                )}
                              >
                                {status.label}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-zinc-500">
                              {t("uploadedAt", {
                                date: formatUploadDate(
                                  game.created_at,
                                  locale
                                ),
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 sm:justify-end">
                          <div className="text-right">
                            <p className="text-xs text-zinc-500">
                              {t("totalPlays")}
                            </p>
                            <p className="mt-1 font-semibold text-cyan-300">
                              {formatCount(game.plays_count)}
                            </p>
                            <p className="mt-0.5 text-xs text-rose-300/80">
                              ★ {game.rating_avg.toFixed(1)}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setAnalyticsScope(game.id)}
                              className={cn(
                                "border-white/10 bg-white/5 text-zinc-300 hover:border-cyan-400/30 hover:text-white",
                                isSelected &&
                                  "border-cyan-400/40 bg-cyan-500/10 text-cyan-200"
                              )}
                            >
                              <BarChart3 className="size-3.5" />
                              {t("viewAnalytics")}
                            </Button>
                            <Link
                              href={`/game/${game.id}`}
                              className={cn(
                                buttonVariants({
                                  variant: "outline",
                                  size: "sm",
                                }),
                                "border-white/10 bg-white/5 text-zinc-300 hover:border-cyan-400/30 hover:text-white"
                              )}
                            >
                              {tCommon("view")}
                            </Link>
                            <Link
                              href={`/dashboard/edit/${game.id}`}
                              className={cn(
                                buttonVariants({
                                  variant: "outline",
                                  size: "sm",
                                }),
                                "border-white/10 bg-white/5 text-zinc-300 hover:border-violet-400/30 hover:text-white"
                              )}
                            >
                              {t("editGame")}
                            </Link>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setDeleteError(null);
                                setDeleteTarget(game);
                              }}
                              className="border-rose-400/20 bg-rose-500/5 text-rose-300 hover:border-rose-400/40 hover:bg-rose-500/15 hover:text-rose-200"
                            >
                              <Trash2 className="size-3.5" />
                              {t("deleteGame")}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.section>
      </main>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
      >
        <DialogContent
          showCloseButton={!deleting}
          className="border-rose-400/25 bg-zinc-950/95 text-zinc-100 shadow-2xl shadow-rose-500/15 backdrop-blur-xl sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg text-rose-200">
              <Trash2 className="size-5 text-rose-400" />
              {t("deleteGameTitle")}
            </DialogTitle>
            <DialogDescription className="text-left leading-relaxed text-zinc-400">
              {deleteTarget
                ? t("deleteGameDesc", { title: deleteTarget.title })
                : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200/90">
            {t("deleteGameWarning")}
          </div>

          {deleteError && (
            <p className="text-sm text-rose-300">{deleteError}</p>
          )}

          <DialogFooter className="border-t border-white/10 bg-transparent sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={deleting}
              onClick={() => {
                setDeleteTarget(null);
                setDeleteError(null);
              }}
              className="border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10"
            >
              {t("deleteGameCancel")}
            </Button>
            <Button
              type="button"
              disabled={deleting}
              onClick={() => void handleDeleteConfirm()}
              className="border-0 bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-lg shadow-rose-500/25 hover:from-rose-500 hover:to-red-500"
            >
              {deleting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t("deletingGame")}
                </>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  {t("deleteGameConfirm")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
