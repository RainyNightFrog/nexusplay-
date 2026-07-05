"use client";

import Image from "next/image";
import { Heart } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import type { Game } from "@/lib/games";
import { useFormatCount } from "@/hooks/use-format-count";
import { cn } from "@/lib/utils";

type HomeGameRowProps = {
  title: string;
  description?: string;
  games: Game[];
  viewAllHref?: string;
  viewAllLabel?: string;
  accent?: "rose" | "violet";
  badgeCount?: number;
  badgeLabel?: string;
  favoriteCounts?: Record<number, number>;
};

export function HomeGameRow({
  title,
  description,
  games,
  viewAllHref,
  viewAllLabel,
  accent = "rose",
  badgeCount = 0,
  badgeLabel,
  favoriteCounts = {},
}: HomeGameRowProps) {
  const tc = useTranslations("common");
  const th = useTranslations("home");
  const { formatCount } = useFormatCount();

  if (games.length === 0) return null;

  const accentClass =
    accent === "violet"
      ? "group-hover:border-violet-400/40 group-hover:shadow-violet-500/10"
      : "group-hover:border-rose-400/40 group-hover:shadow-rose-500/10";

  return (
    <section className="pb-10">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-white sm:text-2xl">{title}</h2>
            {badgeCount > 0 && (
              <span
                className="rounded-full bg-violet-500 px-2 py-0.5 text-xs font-semibold text-white"
                title={badgeLabel}
              >
                {badgeCount > 99 ? "99+" : badgeCount}
              </span>
            )}
          </div>
          {description && (
            <p className="mt-1 text-sm text-zinc-500">{description}</p>
          )}
        </div>
        {viewAllHref && viewAllLabel && (
          <Link href={viewAllHref} className="text-sm text-violet-400 hover:underline">
            {viewAllLabel}
          </Link>
        )}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {games.map((game, index) => (
          <motion.div
            key={game.id}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: index * 0.05 }}
            className="w-[220px] shrink-0 sm:w-[240px]"
          >
            <Link
              href={`/game/${game.id}`}
              className={cn(
                "group block overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60",
                "shadow-lg shadow-black/30 transition-all duration-300 hover:shadow-xl",
                accentClass
              )}
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                <Image
                  src={game.image}
                  alt={game.title}
                  fill
                  sizes="240px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-3">
                <h3 className="truncate text-sm font-semibold text-white">
                  {game.title}
                </h3>
                <p className="mt-0.5 truncate text-xs text-zinc-500">
                  {game.creator || tc("defaultCreator")}
                </p>
                {(favoriteCounts[game.id] ?? 0) > 0 && (
                  <p className="mt-1 flex items-center justify-center gap-1 text-[11px] text-rose-300/90">
                    <Heart className="size-3" />
                    {formatCount(favoriteCounts[game.id] ?? 0)} {th("statsFavorites")}
                  </p>
                )}
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
