"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Crown, ChevronLeft, ChevronRight, Loader2, Medal, RefreshCw, Trophy } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { getInitials } from "@/lib/auth";
import { UserBadge } from "@/components/UserBadge";
import {
  ChatPlayerCard,
  leaderboardEntryToPlayerPreview,
  type ChatPlayerPreview,
} from "@/components/chat/chat-player-card";
import {
  formatDonationAmount,
  formatDonationTierLabel,
  formatDurationSeconds,
  LEADERBOARD_PAGE_SIZE,
  LEADERBOARD_POLL_MS,
  type PlatformLeaderboardEntry,
  type PlatformLeaderboardsResponse,
} from "@/lib/platform-leaderboard";
import { cn } from "@/lib/utils";

type LeaderboardTab = "online" | "playTime" | "donated";

const TAB_TRIGGER_CLASS =
  "flex h-9 min-w-0 flex-1 basis-0 items-center justify-center rounded-lg border-0 px-1 text-center text-xs font-medium leading-tight after:hidden sm:px-1.5 sm:text-sm";

const TOP_RGB_BORDER =
  "relative overflow-hidden rounded-2xl p-[2px] bg-gradient-to-r from-cyan-500 via-violet-500 to-fuchsia-500 animate-pulse shadow-[0_0_28px_rgba(139,92,246,0.4)]";

const TOP_RGB_INNER =
  "rounded-[14px] border border-white/10 bg-zinc-950/90 backdrop-blur-xl";

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return <Crown className="size-6 text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />;
  }
  if (rank === 2) {
    return <Medal className="size-6 text-zinc-200" />;
  }
  if (rank === 3) {
    return <Medal className="size-6 text-amber-600" />;
  }
  return (
    <span className="flex size-8 items-center justify-center rounded-full bg-white/5 text-base font-bold text-zinc-400">
      {rank}
    </span>
  );
}

function OnlineIndicator({
  isOnline,
  titleOnline,
  titleOffline,
}: {
  isOnline: boolean;
  titleOnline: string;
  titleOffline: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex size-3 rounded-full",
        isOnline
          ? "animate-pulse bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]"
          : "bg-zinc-600"
      )}
      title={isOnline ? titleOnline : titleOffline}
    />
  );
}

function PlayerAvatar({
  displayName,
  avatarUrl,
  rank,
}: {
  displayName: string;
  avatarUrl: string | null;
  rank: number;
}) {
  const isTopThree = rank <= 3;
  const initials = getInitials(displayName);

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full",
        isTopThree ? "size-14 ring-2 ring-white/20" : "size-10"
      )}
    >
      {avatarUrl ? (
        <Image src={avatarUrl} alt={displayName} fill className="object-cover" />
      ) : (
        <div
          className={cn(
            "flex h-full w-full items-center justify-center bg-gradient-to-br font-bold text-white",
            isTopThree
              ? "from-cyan-500/40 via-violet-500/40 to-fuchsia-500/40 text-lg"
              : "from-cyan-500/25 to-violet-600/30 text-base"
          )}
        >
          {initials}
        </div>
      )}
    </div>
  );
}

function LeaderboardCard({
  entry,
  tab,
  locale,
  animateKey,
  onPlayerClick,
}: {
  entry: PlatformLeaderboardEntry;
  tab: LeaderboardTab;
  locale: string;
  animateKey: string;
  onPlayerClick?: (entry: PlatformLeaderboardEntry) => void;
}) {
  const t = useTranslations("leaderboard");
  const tcx = useTranslations("common");
  const isTopThree = entry.rank <= 3;

  const valueLabel =
    tab === "donated"
      ? entry.isDonationMasked && entry.donationTier
        ? formatDonationTierLabel(entry.donationTier, locale)
        : formatDonationAmount(entry.value, locale)
      : formatDurationSeconds(entry.value, (key, values) => tcx(key, values));

  const cardBody = (
    <div
      role={onPlayerClick ? "button" : undefined}
      tabIndex={onPlayerClick ? 0 : undefined}
      onClick={onPlayerClick ? () => onPlayerClick(entry) : undefined}
      onKeyDown={
        onPlayerClick
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onPlayerClick(entry);
              }
            }
          : undefined
      }
      className={cn(
        "flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5",
        entry.isMe && "bg-cyan-500/5",
        onPlayerClick &&
          "cursor-pointer rounded-xl transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40"
      )}
      key={`${animateKey}-${entry.userId}-${entry.rank}`}
    >
      <div className="flex w-10 shrink-0 items-center justify-center sm:w-11">
        <RankBadge rank={entry.rank} />
      </div>

      <PlayerAvatar
        displayName={entry.displayName}
        avatarUrl={entry.avatarUrl}
        rank={entry.rank}
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <UserBadge
            username={entry.displayName}
            title={entry.equippedTitle}
            animateTitle={false}
            usernameClassName={cn(
              "max-w-full truncate",
              isTopThree ? "text-base sm:text-lg" : "text-sm sm:text-base",
              "text-zinc-100"
            )}
            titleClassName="text-[10px] sm:text-xs"
          />
          <OnlineIndicator
            isOnline={entry.isOnline}
            titleOnline={t("statusOnline")}
            titleOffline={t("statusOffline")}
          />
          {entry.isMe && (
            <span className="shrink-0 rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-xs font-semibold text-cyan-300 sm:text-sm">
              {t("youBadge")}
            </span>
          )}
        </div>
        {isTopThree && (
          <p className="mt-1 text-sm text-zinc-500 sm:text-base">
            #{entry.rank} ·{" "}
            {entry.isOnline ? t("statusOnline") : t("statusOffline")}
          </p>
        )}
      </div>

      <div className="shrink-0 text-right">
        <p
          className={cn(
            "font-mono font-bold tabular-nums whitespace-nowrap transition-all duration-300",
            isTopThree
              ? "bg-gradient-to-r from-cyan-300 via-violet-300 to-fuchsia-300 bg-clip-text text-lg text-transparent sm:text-xl"
              : "text-sm text-zinc-200 sm:text-base"
          )}
        >
          {valueLabel}
        </p>
      </div>
    </div>
  );

  if (isTopThree) {
    return (
      <div className={TOP_RGB_BORDER}>
        <div className={TOP_RGB_INNER}>{cardBody}</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-zinc-900/50 backdrop-blur-sm">
      {cardBody}
    </div>
  );
}

function LeaderboardList({
  entries,
  tab,
  locale,
  loading,
  fetchError,
  animateKey,
  onPlayerClick,
}: {
  entries: PlatformLeaderboardEntry[];
  tab: LeaderboardTab;
  locale: string;
  loading: boolean;
  fetchError: boolean;
  animateKey: string;
  onPlayerClick?: (entry: PlatformLeaderboardEntry) => void;
}) {
  const t = useTranslations("leaderboard");

  if (fetchError && entries.length === 0) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center gap-2 px-4 text-center">
        <Trophy className="size-8 text-zinc-600" />
        <p className="text-sm text-rose-300">{t("fetchError")}</p>
      </div>
    );
  }

  if (loading && entries.length === 0) {
    return (
      <div className="flex min-h-48 items-center justify-center">
        <Loader2 className="size-7 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-center">
        <Trophy className="size-8 text-zinc-600" />
        <p className="text-sm text-zinc-500">
          {tab === "donated" ? t("emptyDonated") : t("empty")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3.5 sm:space-y-4">
      {entries.map((entry) => (
        <LeaderboardCard
          key={entry.userId}
          entry={entry}
          tab={tab}
          locale={locale}
          animateKey={animateKey}
          onPlayerClick={onPlayerClick}
        />
      ))}
    </div>
  );
}

function LeaderboardPagination({
  page,
  totalPages,
  totalEntries,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalEntries: number;
  onPageChange: (page: number) => void;
}) {
  const t = useTranslations("leaderboard");

  if (totalEntries === 0) return null;

  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/8 bg-zinc-950/80 px-4 py-2.5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 gap-1 border-white/10 bg-white/5 px-3 text-sm text-zinc-300 hover:text-white"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft className="size-4" />
        {t("pagePrev")}
      </Button>
      <span className="text-sm tabular-nums text-zinc-500">
        {t("pageInfo", { current: page, total: totalPages })}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 gap-1 border-white/10 bg-white/5 px-3 text-sm text-zinc-300 hover:text-white"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        {t("pageNext")}
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}

function LeaderboardTabPanel({
  entries,
  tab,
  locale,
  loading,
  fetchError,
  animateKey,
  page,
  onPlayerClick,
}: {
  entries: PlatformLeaderboardEntry[];
  tab: LeaderboardTab;
  locale: string;
  loading: boolean;
  fetchError: boolean;
  animateKey: string;
  page: number;
  onPlayerClick?: (entry: PlatformLeaderboardEntry) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(entries.length / LEADERBOARD_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * LEADERBOARD_PAGE_SIZE;
  const pageEntries = entries.slice(start, start + LEADERBOARD_PAGE_SIZE);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2.5 [scrollbar-gutter:stable]">
      <LeaderboardList
        entries={pageEntries}
        tab={tab}
        locale={locale}
        loading={loading}
        fetchError={fetchError}
        animateKey={animateKey}
        onPlayerClick={onPlayerClick}
      />
    </div>
  );
}

export function LeaderboardNavButton({ className }: { className?: string }) {
  const t = useTranslations("leaderboard");
  const locale = useLocale();
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<LeaderboardTab>("online");
  const [data, setData] = useState<PlatformLeaderboardsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [animateKey, setAnimateKey] = useState("initial");
  const [pageByTab, setPageByTab] = useState<Record<LeaderboardTab, number>>({
    online: 1,
    playTime: 1,
    donated: 1,
  });
  const [playerPreview, setPlayerPreview] = useState<ChatPlayerPreview | null>(null);
  const [playerCardOpen, setPlayerCardOpen] = useState(false);
  const [reopenLeaderboardAfterProfile, setReopenLeaderboardAfterProfile] =
    useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handlePlayerClick = useCallback(
    (entry: PlatformLeaderboardEntry) => {
      setPlayerPreview(leaderboardEntryToPlayerPreview(entry));
      setReopenLeaderboardAfterProfile(open);
      setOpen(false);
      setPlayerCardOpen(true);
    },
    [open]
  );

  const handlePlayerCardOpenChange = useCallback(
    (nextOpen: boolean) => {
      setPlayerCardOpen(nextOpen);
      if (!nextOpen) {
        setPlayerPreview(null);
        if (reopenLeaderboardAfterProfile) {
          setOpen(true);
          setReopenLeaderboardAfterProfile(false);
        }
      }
    },
    [reopenLeaderboardAfterProfile]
  );

  const setTabPage = useCallback((tab: LeaderboardTab, page: number) => {
    setPageByTab((prev) => ({ ...prev, [tab]: page }));
  }, []);

  const fetchLeaderboards = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);

    try {
      const response = await fetch("/api/leaderboards", {
        credentials: "same-origin",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("fetch failed");
      }

      const payload = (await response.json()) as PlatformLeaderboardsResponse;
      setData(payload);
      setFetchError(false);
      setLastUpdated(new Date());
      setAnimateKey(payload.fetchedAt);
    } catch {
      setFetchError(true);
      if (!silent) setData(null);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    void fetchLeaderboards();

    pollRef.current = setInterval(() => {
      void fetchLeaderboards(true);
    }, LEADERBOARD_POLL_MS);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [fetchLeaderboards, open]);

  const onlineEntries = data?.online ?? [];
  const playTimeEntries = data?.playTime ?? [];
  const donatedEntries = data?.donated ?? [];

  const activeEntries =
    activeTab === "online"
      ? onlineEntries
      : activeTab === "playTime"
        ? playTimeEntries
        : donatedEntries;
  const activePage = pageByTab[activeTab];
  const activeTotalPages = Math.max(
    1,
    Math.ceil(activeEntries.length / LEADERBOARD_PAGE_SIZE)
  );

  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "relative gap-1.5 border-amber-400/25 bg-amber-500/10 px-2.5 text-amber-200 shadow-md shadow-amber-500/10 sm:px-3",
          "hover:border-amber-300/40 hover:bg-amber-500/15 hover:text-amber-100",
          "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit]",
          "before:bg-gradient-to-r before:from-cyan-500/0 before:via-violet-500/10 before:to-fuchsia-500/0",
          className
        )}
        aria-label={t("title")}
      >
        <Trophy className="size-4 shrink-0" />
        <span className="text-xs font-medium sm:text-sm">{t("navLabel")}</span>
      </DialogTrigger>

      <DialogContent
        showCloseButton
        className={cn(
          "flex max-h-[85vh] w-[min(calc(100vw-1rem),720px)] max-w-[min(calc(100vw-1rem),720px)] flex-col gap-0 overflow-hidden",
          "sm:max-w-[720px]",
          "border-cyan-400/20 bg-zinc-950/95 p-0 text-base text-zinc-100",
          "shadow-2xl shadow-violet-500/15 backdrop-blur-xl"
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-cyan-500/10 via-violet-500/5 to-transparent" />

        <div className="relative flex min-h-0 flex-col gap-3 px-5 py-4 sm:gap-4">
          <DialogHeader className="shrink-0 space-y-1 text-center">
            <DialogTitle className="flex items-center justify-center gap-2.5 text-xl font-bold">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20">
                <Trophy className="size-4 text-amber-300" />
              </span>
              <span className="bg-gradient-to-r from-cyan-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
                {t("title")}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400 sm:text-sm">
              {t("subtitle")}
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as LeaderboardTab)}
            className="flex min-h-0 flex-col"
          >
            <div className="overflow-hidden rounded-xl border border-white/10 bg-zinc-900/40">
              <TabsList className="!flex !h-auto !w-full items-stretch gap-1.5 rounded-none border-0 border-b border-white/10 bg-zinc-900/80 p-1.5 group-data-horizontal/tabs:!h-auto">
                <TabsTrigger
                  value="online"
                  className={cn(
                    TAB_TRIGGER_CLASS,
                    "!h-9",
                    "data-active:bg-gradient-to-r data-active:from-cyan-500/25 data-active:to-violet-500/25 data-active:text-cyan-100"
                  )}
                >
                  {t("tabOnline")}
                </TabsTrigger>
                <TabsTrigger
                  value="playTime"
                  className={cn(
                    TAB_TRIGGER_CLASS,
                    "!h-9",
                    "data-active:bg-gradient-to-r data-active:from-violet-500/25 data-active:to-fuchsia-500/25 data-active:text-violet-100"
                  )}
                >
                  {t("tabPlayTime")}
                </TabsTrigger>
                <TabsTrigger
                  value="donated"
                  className={cn(
                    TAB_TRIGGER_CLASS,
                    "!h-9",
                    "data-active:bg-gradient-to-r data-active:from-fuchsia-500/25 data-active:to-amber-500/25 data-active:text-fuchsia-100"
                  )}
                >
                  {t("tabDonated")}
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-2.5 text-sm text-zinc-500">
                <span className="min-w-0 truncate">
                  {activeTab === "donated"
                    ? t("donatedHint")
                    : lastUpdated
                      ? t("lastUpdated", {
                          time: lastUpdated.toLocaleTimeString(locale),
                        })
                      : t("loading")}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 shrink-0 gap-1.5 px-3 text-sm text-zinc-400 hover:text-cyan-300"
                  onClick={() => void fetchLeaderboards()}
                  disabled={loading}
                >
                  <RefreshCw className={cn("size-4", loading && "animate-spin")} />
                  {t("refresh")}
                </Button>
              </div>

              <div className="flex h-[460px] max-h-[460px] flex-col">
                <TabsContent value="online" keepMounted={false} className="mt-0 flex min-h-0 flex-1 flex-col outline-none">
                  <LeaderboardTabPanel
                    entries={onlineEntries}
                    tab="online"
                    locale={locale}
                    loading={loading}
                    fetchError={fetchError}
                    animateKey={animateKey}
                    page={pageByTab.online}
                    onPlayerClick={handlePlayerClick}
                  />
                </TabsContent>
                <TabsContent value="playTime" keepMounted={false} className="mt-0 flex min-h-0 flex-1 flex-col outline-none">
                  <LeaderboardTabPanel
                    entries={playTimeEntries}
                    tab="playTime"
                    locale={locale}
                    loading={loading}
                    fetchError={fetchError}
                    animateKey={animateKey}
                    page={pageByTab.playTime}
                    onPlayerClick={handlePlayerClick}
                  />
                </TabsContent>
                <TabsContent value="donated" keepMounted={false} className="mt-0 flex min-h-0 flex-1 flex-col outline-none">
                  <LeaderboardTabPanel
                    entries={donatedEntries}
                    tab="donated"
                    locale={locale}
                    loading={loading}
                    fetchError={fetchError}
                    animateKey={animateKey}
                    page={pageByTab.donated}
                    onPlayerClick={handlePlayerClick}
                  />
                </TabsContent>
              </div>
            </div>
          </Tabs>

          <div className="shrink-0 border-t border-white/5 pt-3">
            <LeaderboardPagination
              page={Math.min(activePage, activeTotalPages)}
              totalPages={activeTotalPages}
              totalEntries={activeEntries.length}
              onPageChange={(page) => setTabPage(activeTab, page)}
            />
          </div>

          {profile && (
            <p className="shrink-0 border-t border-white/5 pt-3 text-center text-xs text-zinc-500">
              {t("loggedInHint")}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>

    <ChatPlayerCard
      player={playerPreview}
      open={playerCardOpen}
      onOpenChange={handlePlayerCardOpenChange}
    />
    </>
  );
}
