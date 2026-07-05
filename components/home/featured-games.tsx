"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Crown, Heart, Share2, Star, Users } from "lucide-react";
import { FEATURED_GAMES } from "@/lib/platform-catalog";
import { TAG_COLORS, type Game } from "@/lib/games";
import { useGameI18n } from "@/hooks/use-game-i18n";
import { useFormatCount } from "@/hooks/use-format-count";
import { cn } from "@/lib/utils";

const ACCENT_STYLES = {
  cyan: {
    ring: "ring-cyan-400/30",
    glow: "from-cyan-500/20 via-transparent to-emerald-500/10",
    badge: "border-cyan-400/30 bg-cyan-500/10 text-cyan-300",
    stat: "text-cyan-300",
    hover: "group-hover:border-cyan-400/40 group-hover:shadow-cyan-500/15",
  },
  amber: {
    ring: "ring-amber-400/30",
    glow: "from-amber-500/20 via-transparent to-orange-500/10",
    badge: "border-amber-400/30 bg-amber-500/10 text-amber-300",
    stat: "text-amber-300",
    hover: "group-hover:border-amber-400/40 group-hover:shadow-amber-500/15",
  },
  violet: {
    ring: "ring-violet-400/30",
    glow: "from-violet-500/20 via-transparent to-fuchsia-500/10",
    badge: "border-violet-400/30 bg-violet-500/10 text-violet-300",
    stat: "text-violet-300",
    hover: "group-hover:border-violet-400/40 group-hover:shadow-violet-500/15",
  },
} as const;

function resolveFeaturedGame(catalogTitle: string, games: Game[]) {
  return games.find((game) => game.title === catalogTitle);
}

type FeaturedGamesProps = {
  games: Game[];
  loading?: boolean;
  favoriteCounts?: Record<number, number>;
  favoritedIds?: Set<number>;
  favoriteBusyId?: number | null;
  onFavoriteClick?: (gameId: number) => void;
};

export function FeaturedGames({
  games,
  loading,
  favoriteCounts = {},
  favoritedIds = new Set<number>(),
  favoriteBusyId = null,
  onFavoriteClick,
}: FeaturedGamesProps) {
  const t = useTranslations("home");
  const tc = useTranslations("common");
  const { localizedBadge, localizedDescription, localizedTag } = useGameI18n();
  const { formatCount } = useFormatCount();
  const featuredEntries = FEATURED_GAMES.map((catalog) => {
    const live = resolveFeaturedGame(catalog.title, games);
    const accent = catalog.featuredAccent;
    const styles = ACCENT_STYLES[accent];

    return {
      catalog,
      game: live ?? {
        id: 0,
        title: catalog.title,
        tags: catalog.categories,
        players: catalog.playsCount,
        likes: catalog.likesCount,
        shares: catalog.sharesCount,
        image: catalog.coverPath.startsWith("/")
          ? catalog.coverPath
          : catalog.coverPath,
        creator: catalog.creator,
        description: catalog.description,
        embedUrl: catalog.demoUrl,
        featured: true,
        featuredBadge: catalog.featuredBadge,
        featuredAccent: accent,
        ratingAvg: catalog.ratingAvg,
      },
      accent,
      styles,
    };
  });

  return (
    <section className="pb-12">
      <div className="mb-8 text-center">
        <div className="mb-2 inline-flex items-center justify-center gap-2 text-sm font-medium text-amber-400">
          <Crown className="size-4" />
          {t("featuredBadge")}
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          {t("featuredTitle")}
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          {t("featuredDesc")}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {featuredEntries.map(({ catalog, game, accent, styles }, index) => {
          const href = game.id > 0 ? `/game/${game.id}/forum` : "#";
          const isClickable = game.id > 0 && !loading;
          const favoriteCount =
            game.id > 0 ? (favoriteCounts[game.id] ?? game.likes) : game.likes;
          const favorited = game.id > 0 && favoritedIds.has(game.id);
          const favoriteBusy = favoriteBusyId === game.id;

          return (
            <motion.div
              key={catalog.slug}
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Link
                href={isClickable ? href : "#"}
                onClick={(event) => {
                  if (!isClickable) event.preventDefault();
                }}
                className={cn(
                  "group relative block overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/70",
                  "shadow-2xl shadow-black/50 backdrop-blur-sm transition-all duration-300",
                  styles.hover,
                  !isClickable && "pointer-events-none opacity-80"
                )}
              >
                <div
                  className={cn(
                    "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-60",
                    styles.glow
                  )}
                />
                <div className="relative aspect-[16/11] overflow-hidden">
                  <Image
                    src={game.image}
                    alt={game.title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 33vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    priority={index === 0}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                  {game.featuredBadge && (
                    <span
                      className={cn(
                        "absolute left-4 top-4 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wide backdrop-blur-md",
                        styles.badge
                      )}
                    >
                      {localizedBadge(game.title, game.featuredBadge)}
                    </span>
                  )}
                </div>

                <div className="relative space-y-3 p-5">
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-white transition-colors group-hover:text-white/95">
                      {game.title}
                    </h3>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {tc("creatorPrefix")}{" "}
                      <span className="font-medium text-zinc-300">
                        {game.creator || tc("defaultCreator")}
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-wrap justify-center gap-1.5">
                    {game.tags.map((tag) => (
                      <span
                        key={tag}
                        className={cn(
                          "rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                          TAG_COLORS[tag] ??
                            "bg-zinc-700/50 text-zinc-300 ring-zinc-600/40"
                        )}
                      >
                        {localizedTag(tag)}
                      </span>
                    ))}
                  </div>

                  <p className="line-clamp-2 text-sm leading-relaxed text-zinc-400">
                    {localizedDescription(game.title, game.description)}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 border-t border-white/5 pt-3 text-xs">
                    <span className={cn("flex items-center gap-1.5", styles.stat)}>
                      <Users className="size-3.5" />
                      {formatCount(game.players)}
                    </span>
                    <span className="flex items-center gap-1.5 text-rose-300/90">
                      {game.id > 0 && onFavoriteClick ? (
                        <button
                          type="button"
                          disabled={favoriteBusy}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            onFavoriteClick(game.id);
                          }}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-md transition hover:text-rose-200 disabled:opacity-50",
                            favorited && "text-rose-300"
                          )}
                          aria-label={
                            favorited ? t("statsFavorited") : t("statsFavorite")
                          }
                        >
                          <Heart
                            className={cn(
                              "size-3.5",
                              favorited && "fill-rose-400 text-rose-400"
                            )}
                          />
                          {formatCount(favoriteCount)}
                        </button>
                      ) : (
                        <>
                          <Heart className="size-3.5" />
                          {formatCount(favoriteCount)}
                        </>
                      )}
                    </span>
                    <span className="flex items-center gap-1.5 text-fuchsia-300/90">
                      <Share2 className="size-3.5" />
                      {formatCount(game.shares)}
                    </span>
                    {game.ratingAvg && (
                      <span className="ml-auto flex items-center gap-1 text-amber-300/90">
                        <Star className="size-3.5 fill-amber-400/80 text-amber-400/80" />
                        {game.ratingAvg.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                <div
                  className={cn(
                    "pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset transition-all duration-300",
                    styles.ring,
                    "group-hover:ring-2"
                  )}
                />
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
