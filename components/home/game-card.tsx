"use client";

import { GameCoverImage } from "@/components/ui/game-cover-image";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Heart, Share2, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { TAG_COLORS, type Game } from "@/lib/games";
import { useGameI18n } from "@/hooks/use-game-i18n";
import { useFormatCount } from "@/hooks/use-format-count";
import { cn } from "@/lib/utils";
import { resolveDisplayFavoriteCount } from "@/lib/virtual-games-seed-data";

const MotionLink = motion.create(Link);

export type GameCardSize = "default" | "hero" | "tall" | "wide";

type GameCardProps = {
  game: Game;
  index: number;
  favoriteCount?: number;
  favorited?: boolean;
  favoriteBusy?: boolean;
  onFavoriteClick?: (event: React.MouseEvent) => void;
  size?: GameCardSize;
  hotPick?: boolean;
  className?: string;
};

export function GameCard({
  game,
  index,
  favoriteCount,
  favorited,
  favoriteBusy,
  onFavoriteClick,
  size = "default",
  hotPick = false,
  className,
}: GameCardProps) {
  const t = useTranslations("home");
  const { localizedTag } = useGameI18n();
  const { formatCount } = useFormatCount();
  const displayFavoriteCount = resolveDisplayFavoriteCount(favoriteCount, game.likes);

  return (
    <MotionLink
      href={`/game/${game.id}`}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.05, ease: "easeOut" }}
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      className={cn("group relative block cursor-pointer", className)}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60",
          "shadow-lg shadow-black/40 backdrop-blur-sm",
          "transition-[border-color,box-shadow] duration-300",
          "group-hover:border-cyan-400/50 group-hover:shadow-cyan-500/10 group-hover:shadow-2xl",
          hotPick && "ring-1 ring-cyan-400/25"
        )}
      >
        <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/10 via-transparent to-violet-500/10" />
          <div className="absolute inset-px rounded-[15px] ring-1 ring-inset ring-white/10 group-hover:ring-cyan-400/40" />
        </div>

        <div className="relative aspect-[16/10] overflow-hidden">
          <GameCoverImage
            src={game.image}
            alt={game.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
          {hotPick && (
            <div className="absolute left-3 top-3 rounded-full border border-cyan-400/30 bg-cyan-500/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-200 backdrop-blur-sm">
              {t("hotPickBadge")}
            </div>
          )}
          {game.isUpcoming && (
            <div
              className={cn(
                "absolute right-3 top-3 rounded-full border border-fuchsia-400/40",
                "bg-fuchsia-500/20 px-2.5 py-0.5 text-[10px] font-semibold tracking-wider text-fuchsia-100",
                "shadow-[0_0_18px_rgba(232,121,249,0.45)] backdrop-blur-sm"
              )}
            >
              {t("upcomingBadge")}
            </div>
          )}
        </div>

        <div className="relative space-y-3 p-4 text-center">
          <h3 className="text-base font-semibold tracking-tight text-white transition-colors group-hover:text-cyan-50">
            {game.title}
          </h3>

          <div className="flex flex-wrap justify-center gap-1.5">
            {game.tags
              .filter((tag) => tag.trim())
              .slice(0, 4)
              .map((tag) => (
                <span
                  key={tag}
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                    TAG_COLORS[tag] ?? "bg-zinc-700/50 text-zinc-300 ring-zinc-600/40"
                  )}
                >
                  {localizedTag(tag)}
                </span>
              ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Users className="size-3.5 text-cyan-400/80" />
              {formatCount(game.players)} {t("statsPlaying")}
            </span>
            <span className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={favoriteBusy}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onFavoriteClick?.(event);
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md transition",
                  "hover:text-rose-300 disabled:opacity-50",
                  onFavoriteClick && "cursor-pointer"
                )}
                aria-label={favorited ? t("statsFavorited") : t("statsFavorite")}
              >
                <Heart
                  className={cn(
                    "size-3.5",
                    favorited ? "fill-rose-400 text-rose-400" : "text-rose-400/80"
                  )}
                />
                {formatCount(displayFavoriteCount)} {t("statsFavorites")}
              </button>
            </span>
            <span className="flex items-center gap-1.5">
              <Share2 className="size-3.5 text-fuchsia-400/80" />
              {formatCount(game.shares)} {t("statsShares")}
            </span>
          </div>
        </div>
      </div>
    </MotionLink>
  );
}

export function GameCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60 shadow-lg shadow-black/20",
        className
      )}
    >
      <div className="aspect-[16/10] w-full animate-pulse bg-zinc-800/70" />
      <div className="space-y-3 p-4">
        <div className="mx-auto h-5 w-3/4 animate-pulse rounded bg-zinc-800/70" />
        <div className="flex justify-center gap-1.5">
          <div className="h-5 w-12 animate-pulse rounded-md bg-zinc-800/70" />
          <div className="h-5 w-10 animate-pulse rounded-md bg-zinc-800/70" />
        </div>
      </div>
    </div>
  );
}
