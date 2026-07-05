"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Gamepad2,
  Heart,
  Loader2,
  Search,
  UserRound,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { NavActions } from "@/components/layout/nav-actions";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteSearch } from "@/components/layout/site-search";
import { SearchHistoryPanel } from "@/components/search/search-history-panel";
import { SearchShortcuts } from "@/components/search/search-shortcuts";
import type { SearchCreatorResult } from "@/lib/platform-search-service";
import { addSearchHistory } from "@/lib/search-history";
import type { Game } from "@/lib/games";
import { useGameFavoriteActions } from "@/hooks/use-game-favorite-actions";
import { useFormatCount } from "@/hooks/use-format-count";
import { cn } from "@/lib/utils";

function SearchPageContent() {
  const t = useTranslations("search");
  const tNav = useTranslations("nav");
  const th = useTranslations("home");
  const searchParams = useSearchParams();
  const query = searchParams.get("q")?.trim() ?? "";
  const { formatCount } = useFormatCount();
  const {
    favoriteCounts,
    favoritedIds,
    favoriteBusyId,
    loadFavoriteCounts,
    toggleGameFavorite,
  } = useGameFavoriteActions();

  const [loading, setLoading] = useState(false);
  const [games, setGames] = useState<Game[]>([]);
  const [creators, setCreators] = useState<SearchCreatorResult[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2500);
  }, []);

  useEffect(() => {
    if (!query) {
      setGames([]);
      setCreators([]);
      return;
    }

    setLoading(true);
    addSearchHistory(query);
    fetch(`/api/search?q=${encodeURIComponent(query)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then(
        (data: {
          games?: Game[];
          creators?: SearchCreatorResult[];
        } | null) => {
          const nextGames = data?.games ?? [];
          setGames(nextGames);
          setCreators(data?.creators ?? []);
          void loadFavoriteCounts(nextGames.map((game) => game.id));
        }
      )
      .catch(() => {
        setGames([]);
        setCreators([]);
      })
      .finally(() => setLoading(false));
  }, [query, loadFavoriteCounts]);

  async function handleFavoriteClick(gameId: number) {
    const result = await toggleGameFavorite(gameId);
    if (result.message) showToast(result.message);
  }

  return (
    <div className="dark relative min-h-full text-zinc-100">
      {toast && (
        <div className="fixed left-1/2 top-20 z-[70] -translate-x-1/2 rounded-xl border border-white/10 bg-zinc-900/95 px-4 py-2.5 text-sm text-white shadow-xl backdrop-blur-md">
          {toast}
        </div>
      )}

      <SiteHeader>
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "gap-1.5 text-zinc-400 hover:text-white"
          )}
        >
          <ArrowLeft className="size-4" />
          {tNav("backHome")}
        </Link>
        <div className="mx-auto hidden max-w-md flex-1 px-4 md:block">
          <SiteSearch defaultQuery={query} />
        </div>
        <NavActions className="ml-auto" />
      </SiteHeader>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-8 text-center md:hidden">
          <SiteSearch defaultQuery={query} autoFocus />
        </div>

        <div className="mb-8 text-center">
          <div className="mb-2 inline-flex items-center gap-2 text-sm text-cyan-400">
            <Search className="size-4" />
            {t("title")}
          </div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            {query ? t("resultsFor", { query }) : t("prompt")}
          </h1>
          {query && !loading && (
            <p className="mt-2 text-sm text-zinc-500">
              {t("summary", { games: games.length, creators: creators.length })}
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2 className="size-8 animate-spin text-cyan-400" />
          </div>
        ) : !query ? (
          <div className="space-y-6">
            <SearchShortcuts />
            <div className="rounded-2xl border border-dashed border-white/10 bg-zinc-900/40 py-16 text-center">
              <Search className="mx-auto size-10 text-zinc-600" />
              <p className="mt-4 text-sm text-zinc-500">{t("emptyPrompt")}</p>
            </div>
            <SearchHistoryPanel />
          </div>
        ) : games.length === 0 && creators.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-zinc-900/40 py-16 text-center">
            <Gamepad2 className="mx-auto size-10 text-zinc-600" />
            <p className="mt-4 text-sm text-zinc-500">{t("noResults")}</p>
          </div>
        ) : (
          <div className="space-y-12">
            {creators.length > 0 && (
              <section>
                <h2 className="mb-4 text-lg font-semibold text-white">
                  {t("creatorsTitle")}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {creators.map((creator) => (
                    <Link
                      key={creator.id}
                      href={`/creator/${creator.id}`}
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900/60 p-4 transition hover:border-violet-400/30"
                    >
                      <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-zinc-950">
                        {creator.avatarUrl ? (
                          <Image
                            src={creator.avatarUrl}
                            alt={creator.displayName}
                            width={48}
                            height={48}
                            className="size-full object-cover"
                          />
                        ) : (
                          <UserRound className="size-6 text-violet-400" />
                        )}
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="truncate font-semibold text-white">
                          {creator.displayName}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {t("creatorGameCount", { count: creator.gameCount })}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {games.length > 0 && (
              <section>
                <h2 className="mb-4 text-lg font-semibold text-white">
                  {t("gamesTitle")}
                </h2>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {games.map((game, index) => {
                    const favorited = favoritedIds.has(game.id);
                    const favoriteCount = favoriteCounts[game.id] ?? game.likes;

                    return (
                      <motion.div
                        key={game.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: index * 0.04 }}
                      >
                        <Link
                          href={`/game/${game.id}`}
                          className="group block overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60 shadow-lg transition hover:border-cyan-400/30"
                        >
                          <div className="relative aspect-[16/10] overflow-hidden">
                            <Image
                              src={game.image}
                              alt={game.title}
                              fill
                              sizes="(max-width: 640px) 100vw, 25vw"
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          </div>
                          <div className="space-y-2 p-4">
                            <h3 className="font-semibold text-white group-hover:text-cyan-50">
                              {game.title}
                            </h3>
                            <p className="text-xs text-zinc-500">{game.creator}</p>
                            <div className="flex items-center gap-3 text-xs text-zinc-400">
                              <button
                                type="button"
                                disabled={favoriteBusyId === game.id}
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  void handleFavoriteClick(game.id);
                                }}
                                className="inline-flex items-center gap-1 text-rose-300/90 hover:text-rose-200 disabled:opacity-50"
                              >
                                <Heart
                                  className={cn(
                                    "size-3.5",
                                    favorited && "fill-rose-400 text-rose-400"
                                  )}
                                />
                                {formatCount(favoriteCount)} {th("statsFavorites")}
                              </button>
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export function SearchPageClient() {
  const t = useTranslations("search");

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="size-8 animate-spin text-cyan-400" />
          <span className="sr-only">{t("loading")}</span>
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
