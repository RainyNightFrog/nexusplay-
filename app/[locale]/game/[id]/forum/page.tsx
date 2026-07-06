"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Gamepad2,
  Loader2,
  MessagesSquare,
  Play,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { CommunityForum } from "@/components/game/community-forum";
import { RssFeedLink } from "@/components/feeds/rss-feed-link";
import { FeedJsonLink } from "@/components/feeds/feed-json-link";
import { LeaderboardNavButton } from "@/components/LeaderboardModal";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { SiteHeader } from "@/components/layout/site-header";
import { isSupabaseImage, type Game } from "@/lib/games";
import { useGameI18n } from "@/hooks/use-game-i18n";
import { cn } from "@/lib/utils";

function ForumPageFallback() {
  const tCommon = useTranslations("common");

  return (
    <div className="dark flex min-h-full flex-col items-center justify-center px-4 text-zinc-100">
      <Loader2 className="mb-4 size-10 animate-spin text-violet-400" />
      <p className="text-sm text-zinc-400">{tCommon("loadingForum")}</p>
    </div>
  );
}

export default function GameForumPage() {
  return (
    <Suspense fallback={<ForumPageFallback />}>
      <GameForumContent />
    </Suspense>
  );
}

function GameForumContent() {
  const t = useTranslations("game");
  const tCommunity = useTranslations("community");
  const tCommon = useTranslations("common");
  const { localizedDescription } = useGameI18n();
  const params = useParams();
  const gameId = params.id as string;

  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2500);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadGame() {
      setLoading(true);
      try {
        const response = await fetch(`/api/games/${gameId}`);
        const data = (await response.json()) as {
          game?: Game;
          error?: string;
        };

        if (!cancelled) {
          setGame(response.ok ? (data.game ?? null) : null);
        }
      } catch {
        if (!cancelled) setGame(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadGame();
    return () => {
      cancelled = true;
    };
  }, [gameId]);

  if (loading) {
    return <ForumPageFallback />;
  }

  if (!game) {
    return (
      <div className="dark flex min-h-full flex-col items-center justify-center px-4 text-zinc-100">
        <MessagesSquare className="mb-4 size-12 text-zinc-600" />
        <h1 className="text-xl font-semibold text-white">
          {tCommon("gameNotFound")}
        </h1>
        <Link href="/community" className={cn(buttonVariants(), "mt-6")}>
          {tCommon("backToCommunity")}
        </Link>
      </div>
    );
  }

  return (
    <div className="dark relative min-h-full text-zinc-100">
      <SiteHeader>
          <Link
            href="/community"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "gap-1.5 text-zinc-400 hover:text-violet-300"
            )}
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">{tCommunity("hub")}</span>
          </Link>

          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-md shadow-violet-500/20">
              <MessagesSquare className="size-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {game.title}
              </p>
              <p className="text-[11px] text-violet-300/80">
                {t("communityForum")}
              </p>
            </div>
          </div>

          <Link
            href={`/game/${game.id}`}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "hidden gap-1.5 border-white/10 bg-white/5 text-zinc-300 hover:border-cyan-400/30 sm:inline-flex"
            )}
          >
            <Play className="size-3.5" />
            {tCommon("backToGame")}
          </Link>

          <LanguageSwitcher />
          <LeaderboardNavButton />
      </SiteHeader>

      <main className="relative mx-auto max-w-5xl px-4 py-6 text-center sm:px-6 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "mb-6 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60",
            "shadow-lg shadow-black/40"
          )}
        >
          <div className="flex flex-col items-center gap-4 p-4 text-center sm:p-5">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-zinc-800">
              <Image
                src={game.image}
                alt={game.title}
                fill
                sizes="64px"
                className="object-cover"
                unoptimized={!isSupabaseImage(game.image)}
              />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold text-white sm:text-xl">
                {game.title}
              </h1>
              <p className="mt-1 line-clamp-2 text-sm text-zinc-400">
                {game ? localizedDescription(game.title, game.description) : ""}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <RssFeedLink
                  href={`/feed/game/${game.id}`}
                  label={t("gameFeedRss")}
                />
                <FeedJsonLink
                  href={`/api/feeds/preview?feed=game&id=${game.id}&limit=10`}
                  label={t("gameFeedJson")}
                />
              </div>
            </div>
            <Link
              href={`/game/${game.id}`}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "shrink-0 gap-1.5 border-cyan-400/25 bg-cyan-500/10 text-cyan-200 hover:border-cyan-400/40 sm:hidden"
              )}
            >
              <Gamepad2 className="size-3.5" />
              {tCommon("playGame")}
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className={cn(
            "overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50",
            "shadow-xl shadow-black/40 backdrop-blur-sm"
          )}
        >
          <CommunityForum
            gameId={game.id}
            gameTitle={game.title}
            onToast={showToast}
          />
        </motion.div>
      </main>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={cn(
              "fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2",
              "rounded-full border border-violet-400/30 bg-zinc-900/95 px-5 py-2.5",
              "text-sm text-violet-100 shadow-xl shadow-violet-500/10 backdrop-blur-md"
            )}
          >
            <Check className="size-4 text-violet-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
