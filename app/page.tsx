"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gamepad2,
  MessagesSquare,
  Search,
  Upload,
  Heart,
  Share2,
  Users,
  Sparkles,
  Zap,
  TrendingUp,
  SlidersHorizontal,
  ArrowUpDown,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreatorDashboardLink, UserNav } from "@/components/auth/user-nav";
import { FeaturedGames } from "@/components/home/featured-games";
import {
  FILTER_CATEGORIES,
  SORT_OPTIONS,
  TAG_COLORS,
  type FilterCategory,
  type Game,
  type SortOption,
} from "@/lib/games";
import { ALL_CATEGORY, HOME_COPY } from "@/lib/home-copy";
import { cn } from "@/lib/utils";

const MotionLink = motion.create(Link);
const SKELETON_COUNT = 8;

function GameCard({ game, index }: { game: Game; index: number }) {
  return (
    <MotionLink
      href={`/game/${game.id}`}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.07, ease: "easeOut" }}
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      className="group relative block cursor-pointer"
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60",
          "shadow-lg shadow-black/40 backdrop-blur-sm",
          "transition-[border-color,box-shadow] duration-300",
          "group-hover:border-cyan-400/50 group-hover:shadow-cyan-500/10 group-hover:shadow-2xl"
        )}
      >
        <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/10 via-transparent to-violet-500/10" />
          <div className="absolute inset-px rounded-[15px] ring-1 ring-inset ring-white/10 group-hover:ring-cyan-400/40" />
        </div>

        <div className="relative aspect-[16/10] overflow-hidden">
          <Image
            src={game.image}
            alt={game.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
        </div>

        <div className="relative space-y-3 p-4 text-center">
          <h3 className="text-base font-semibold tracking-tight text-white transition-colors group-hover:text-cyan-50">
            {game.title}
          </h3>

          <div className="flex flex-wrap justify-center gap-1.5">
            {game.tags.map((tag) => (
              <span
                key={tag}
                className={cn(
                  "rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                  TAG_COLORS[tag] ?? "bg-zinc-700/50 text-zinc-300 ring-zinc-600/40"
                )}
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Users className="size-3.5 text-cyan-400/80" />
              {game.players} {HOME_COPY.statsPlaying}
            </span>
            <span className="flex items-center gap-1.5">
              <Heart className="size-3.5 text-rose-400/80" />
              {game.likes} {HOME_COPY.statsLikes}
            </span>
            <span className="flex items-center gap-1.5">
              <Share2 className="size-3.5 text-fuchsia-400/80" />
              {game.shares} {HOME_COPY.statsShares}
            </span>
          </div>
        </div>
      </div>
    </MotionLink>
  );
}

function GameCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60 shadow-lg shadow-black/20">
      <Skeleton className="aspect-[16/10] w-full rounded-none bg-zinc-800/70" />
      <div className="space-y-3 p-4">
        <Skeleton className="mx-auto h-5 w-3/4 bg-zinc-800/70" />
        <div className="flex justify-center gap-1.5">
          <Skeleton className="h-5 w-12 rounded-md bg-zinc-800/70" />
          <Skeleton className="h-5 w-10 rounded-md bg-zinc-800/70" />
        </div>
        <Skeleton className="mx-auto h-4 w-20 bg-zinc-800/70" />
      </div>
    </div>
  );
}

function GameGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: index * 0.04 }}
        >
          <GameCardSkeleton />
        </motion.div>
      ))}
    </div>
  );
}

function FilterSortBar({
  category,
  sort,
  onCategoryChange,
  onSortChange,
}: {
  category: FilterCategory;
  sort: SortOption;
  onCategoryChange: (category: FilterCategory) => void;
  onSortChange: (sort: SortOption) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className={cn(
        "mb-8 rounded-2xl border border-white/10 bg-zinc-900/50 p-4 shadow-xl shadow-black/20 backdrop-blur-md",
        "sm:p-5"
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-400">
          <SlidersHorizontal className="size-4 text-cyan-400" />
          <span>{HOME_COPY.filterLabel}</span>
        </div>

        <div className="flex items-center gap-2 text-sm font-medium text-zinc-400 lg:shrink-0">
          <ArrowUpDown className="size-4 text-violet-400" />
          <span className="hidden sm:inline">{HOME_COPY.sortLabel}</span>
          <Select
            value={sort}
            onValueChange={(value) => onSortChange(value as SortOption)}
          >
            <SelectTrigger
              size="default"
              className={cn(
                "h-9 min-w-[148px] border-white/10 bg-white/5 text-zinc-200",
                "hover:bg-white/8 focus-visible:border-cyan-400/40 focus-visible:ring-cyan-500/20"
              )}
            >
              <SelectValue placeholder={HOME_COPY.sortPlaceholder} />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-zinc-900 text-zinc-100 ring-white/10">
              {SORT_OPTIONS.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="focus:bg-cyan-500/10 focus:text-cyan-100"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTER_CATEGORIES.map((tag) => {
          const isActive = category === tag;
          return (
            <motion.button
              key={tag}
              type="button"
              onClick={() => onCategoryChange(tag)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="relative shrink-0"
            >
              {isActive && (
                <motion.span
                  layoutId="active-category-pill"
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500/25 via-violet-500/25 to-fuchsia-500/25 ring-1 ring-cyan-400/40"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Badge
                variant={isActive ? "default" : "outline"}
                className={cn(
                  "relative h-8 cursor-pointer px-4 text-sm transition-all duration-200",
                  isActive
                    ? "border-transparent bg-gradient-to-r from-cyan-500 to-violet-600 text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-violet-500"
                    : "border-white/10 bg-white/5 text-zinc-300 hover:border-white/20 hover:bg-white/10 hover:text-white"
                )}
              >
                {tag}
              </Badge>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

export default function Home() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<FilterCategory>(ALL_CATEGORY);
  const [sort, setSort] = useState<SortOption>("latest");

  const loadGames = useCallback(async (nextCategory: FilterCategory, nextSort: SortOption) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (nextCategory !== ALL_CATEGORY) {
        params.set("category", nextCategory);
      }
      if (nextSort !== "latest") {
        params.set("sort", nextSort);
      }
      const query = params.toString();
      const response = await fetch(`/api/games${query ? `?${query}` : ""}`);
      const data = (await response.json()) as { games?: Game[] };
      setGames(data.games ?? []);
    } catch {
      setGames([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGames(category, sort);
  }, [category, sort, loadGames]);

  const activeSortLabel =
    SORT_OPTIONS.find((option) => option.value === sort)?.label ??
    SORT_OPTIONS[0].label;

  return (
    <div className="dark relative min-h-full text-zinc-100">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-zinc-950/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <motion.a
            href="/"
            className="flex shrink-0 items-center gap-2.5"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="relative flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-violet-600 shadow-lg shadow-cyan-500/25">
              <Gamepad2 className="size-5 text-white" />
              <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 transition-opacity hover:opacity-100" />
            </div>
            <span className="hidden bg-gradient-to-r from-white via-cyan-100 to-violet-200 bg-clip-text text-lg font-bold tracking-tight text-transparent sm:block">
              NexusPlay
            </span>
          </motion.a>

          <div className="relative mx-auto hidden max-w-md flex-1 md:block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="search"
              placeholder={HOME_COPY.searchPlaceholder}
              className={cn(
                "h-10 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 text-sm",
                "text-zinc-100 placeholder:text-zinc-500 backdrop-blur-md",
                "outline-none transition-all duration-200",
                "focus:border-cyan-400/40 focus:bg-white/8 focus:ring-2 focus:ring-cyan-500/20"
              )}
            />
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <Link
              href="/community"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "hidden gap-1.5 border-violet-400/20 bg-violet-500/10 text-violet-200 hover:border-violet-400/30 hover:bg-violet-500/15 sm:inline-flex"
              )}
            >
              <MessagesSquare className="size-3.5" />
              {HOME_COPY.community}
            </Link>
            <CreatorDashboardLink />
            <UserNav />
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <section className="relative py-16 sm:py-24 lg:py-28">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="mx-auto max-w-3xl text-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-1.5 text-xs font-medium text-cyan-300 backdrop-blur-sm"
            >
              <Sparkles className="size-3.5" />
              {HOME_COPY.heroBadge}
            </motion.div>

            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              <span className="bg-gradient-to-br from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
                {HOME_COPY.heroTitle1}
              </span>
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                {HOME_COPY.heroTitle2}
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">
              {HOME_COPY.heroDesc1}
              <br />
              {HOME_COPY.heroDesc2}
            </p>

            <motion.div
              className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.5 }}
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.96 }}
                className="group relative"
              >
                <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-cyan-400 via-violet-500 to-fuchsia-500 opacity-60 blur-lg transition-opacity duration-300 group-hover:opacity-100" />
                <Button
                  size="lg"
                  className={cn(
                    "group relative h-12 gap-2 overflow-hidden rounded-xl px-8 text-base font-semibold",
                    "border-0 bg-gradient-to-r from-cyan-500 via-violet-600 to-fuchsia-600 text-white",
                    "shadow-xl shadow-violet-500/25",
                    "before:absolute before:inset-0 before:translate-x-[-100%] before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent before:transition-transform before:duration-700 hover:before:translate-x-[100%]"
                  )}
                  onClick={() =>
                    document
                      .getElementById("game-grid")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  <TrendingUp className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5" />
                  {HOME_COPY.browseGames}
                  <Zap className="size-4 text-yellow-300 opacity-0 transition-all duration-300 group-hover:opacity-100" />
                </Button>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.96 }}
                className="group relative"
              >
                <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-cyan-400 via-violet-500 to-fuchsia-500 opacity-60 blur-lg transition-opacity duration-300 group-hover:opacity-100" />
                <Button
                  size="lg"
                  nativeButton={false}
                  render={<Link href="/dashboard/upload" />}
                  className={cn(
                    "group relative h-12 gap-2 overflow-hidden rounded-xl px-8 text-base font-semibold",
                    "border-0 bg-gradient-to-r from-cyan-500 via-violet-600 to-fuchsia-600 text-white",
                    "shadow-xl shadow-violet-500/25",
                    "before:absolute before:inset-0 before:translate-x-[-100%] before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent before:transition-transform before:duration-700 hover:before:translate-x-[100%]"
                  )}
                >
                  <Upload className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5" />
                  {HOME_COPY.uploadGame}
                  <Zap className="size-4 text-yellow-300 opacity-0 transition-all duration-300 group-hover:opacity-100" />
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        </section>

        <FeaturedGames games={games} loading={loading} />

        {/* Game Grid */}
        <section id="game-grid" className="pb-20">
          <div className="mb-6 text-center">
            <div className="mb-2 inline-flex items-center justify-center gap-2 text-sm font-medium text-cyan-400">
              <TrendingUp className="size-4" />
              {HOME_COPY.exploreGames}
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {HOME_COPY.featuredGames}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {category === ALL_CATEGORY
                ? HOME_COPY.gridDescAll(activeSortLabel)
                : HOME_COPY.gridDescCategory(category, activeSortLabel)}
            </p>
          </div>

          <FilterSortBar
            category={category}
            sort={sort}
            onCategoryChange={setCategory}
            onSortChange={setSort}
          />

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <GameGridSkeleton />
              </motion.div>
            ) : games.length > 0 ? (
              <motion.div
                key={`${category}-${sort}-grid`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              >
                {games.map((game, index) => (
                  <GameCard key={game.id} game={game} index={index} />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="rounded-2xl border border-dashed border-white/10 bg-zinc-900/40 py-16 text-center"
              >
                <Gamepad2 className="mx-auto mb-4 size-10 text-zinc-600" />
                <p className="text-lg font-medium text-white">
                  {category === ALL_CATEGORY
                    ? HOME_COPY.emptyAll
                    : HOME_COPY.emptyCategory(category)}
                </p>
                <p className="mt-2 text-sm text-zinc-500">
                  {category === ALL_CATEGORY
                    ? HOME_COPY.emptyHintAll
                    : HOME_COPY.emptyHintCategory}
                </p>
                {category !== ALL_CATEGORY && (
                  <Button
                    variant="ghost"
                    className="mt-4 text-zinc-400 hover:text-cyan-300"
                    onClick={() => setCategory(ALL_CATEGORY)}
                  >
                    {HOME_COPY.viewAllCategories}
                  </Button>
                )}
                <Link
                  href="/dashboard/upload"
                  className={cn(buttonVariants(), "mt-6 inline-flex")}
                >
                  {HOME_COPY.uploadNewGame}
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative border-t border-white/5 py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-xs text-zinc-600 sm:px-6 lg:px-8">
          <p>
            <Link
              href="/community/rules"
              className="text-zinc-500 transition-colors hover:text-violet-400"
            >
              {HOME_COPY.communityRules}
            </Link>
            {" ? "}
            {HOME_COPY.footer}
          </p>
        </div>
      </footer>
    </div>
  );
}
