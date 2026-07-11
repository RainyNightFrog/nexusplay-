"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gamepad2,
  MessagesSquare,
  Upload,
  Sparkles,
  Zap,
  TrendingUp,
  SlidersHorizontal,
  ArrowUpDown,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectDisplayValue,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { CreatorDashboardLink } from "@/components/auth/user-nav";
import { LeaderboardNavButton } from "@/components/LeaderboardModal";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteSearch } from "@/components/layout/site-search";
import { MobileSearchButton } from "@/components/layout/mobile-search-button";
import { getCreatorDashboardHref } from "@/lib/creator-nav";
import { useAuth } from "@/hooks/use-auth";
import { FeaturedGames } from "@/components/home/featured-games";
import { AnnouncementMarquee } from "@/components/home/announcement-marquee";
import { HomePersonalizedSections } from "@/components/home/home-personalized-sections";
import { PriceFilterSidebar } from "@/components/home/price-filter-sidebar";
import {
  BentoGameGrid,
  BentoGameGridSkeleton,
} from "@/components/home/bento-game-grid";
import { TagFilterBar } from "@/components/home/tag-filter-bar";
import {
  FILTER_CATEGORIES,
  SORT_OPTIONS,
  type FilterCategory,
  type Game,
  type SortOption,
} from "@/lib/games";
import type { GameTag } from "@/lib/game-metadata";
import { appendGameTagsToSearchParams } from "@/lib/game-tag-filter";
import {
  appendGamePriceFilterToSearchParams,
  priceFilterIdToParams,
  type PriceFilterId,
} from "@/lib/game-price-filter";
import { ALL_CATEGORY } from "@/lib/home-copy";
import { useGameI18n } from "@/hooks/use-game-i18n";
import { useGameFavoriteActions } from "@/hooks/use-game-favorite-actions";
import { cn } from "@/lib/utils";

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
  const t = useTranslations("home");
  const { localizedTag } = useGameI18n();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className={cn(
        "mb-8 rounded-2xl border border-white/10 bg-zinc-900/50 p-4 text-center shadow-xl shadow-black/20 backdrop-blur-md",
        "sm:p-5"
      )}
    >
      <div className="flex flex-col items-center gap-4 lg:flex-row lg:justify-center lg:gap-8">
        <div className="flex items-center justify-center gap-2 text-sm font-medium text-zinc-400">
          <SlidersHorizontal className="size-4 text-cyan-400" />
          <span>{t("filterLabel")}</span>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm font-medium text-zinc-400">
          <ArrowUpDown className="size-4 text-violet-400" />
          <span className="hidden sm:inline">{t("sortLabel")}</span>
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
              <SelectDisplayValue>{t(`sort.${sort}`)}</SelectDisplayValue>
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-zinc-900 text-zinc-100 ring-white/10">
              {SORT_OPTIONS.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="focus:bg-cyan-500/10 focus:text-cyan-100"
                >
                  {t(`sort.${option.value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
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
                {localizedTag(tag)}
              </Badge>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

export function HomePageClient() {
  const t = useTranslations("home");
  const tNav = useTranslations("nav");
  const { localizedTag } = useGameI18n();
  const { profile, isCreator } = useAuth();
  const uploadHref = getCreatorDashboardHref(profile, isCreator, "/dashboard/upload");
  const {
    favoriteCounts,
    favoritedIds,
    favoriteBusyId,
    loadFavoriteCounts,
    toggleGameFavorite,
  } = useGameFavoriteActions();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [category, setCategory] = useState<FilterCategory>(ALL_CATEGORY);
  const [selectedTags, setSelectedTags] = useState<GameTag[]>([]);
  const [sort, setSort] = useState<SortOption>("latest");
  const [priceFilter, setPriceFilter] = useState<PriceFilterId>("all");

  const loadGames = useCallback(
    async (
      nextCategory: FilterCategory,
      nextTags: GameTag[],
      nextSort: SortOption,
      nextPriceFilter: PriceFilterId
    ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (nextCategory !== ALL_CATEGORY) {
        params.set("category", nextCategory);
      }
      if (nextSort !== "latest") {
        params.set("sort", nextSort);
      }
      appendGameTagsToSearchParams(params, nextTags);
      appendGamePriceFilterToSearchParams(
        params,
        priceFilterIdToParams(nextPriceFilter)
      );
      const query = params.toString();
      const response = await fetch(`/api/games${query ? `?${query}` : ""}`);
      const data = (await response.json()) as { games?: Game[] };
      const nextGames = data.games ?? [];
      setGames(nextGames);
      void loadFavoriteCounts(nextGames.map((game) => game.id));
    } catch {
      setGames([]);
    } finally {
      setLoading(false);
    }
  },
    [loadFavoriteCounts]
  );

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2500);
  }, []);

  const handleFavoriteClick = useCallback(
    async (gameId: number) => {
      const result = await toggleGameFavorite(gameId);
      if (result.message) showToast(result.message);
    },
    [showToast, toggleGameFavorite]
  );

  useEffect(() => {
    loadGames(category, selectedTags, sort, priceFilter);
  }, [category, selectedTags, sort, priceFilter, loadGames]);

  const activeSortLabel = t(`sort.${sort}`);
  const activePriceFilterLabel = t(`priceFilter.${priceFilter}`);
  const categoryLabel = (value: FilterCategory) => localizedTag(value);
  const selectedTagsLabel = useMemo(
    () => selectedTags.map((tag) => localizedTag(tag)).join(" · "),
    [selectedTags, localizedTag]
  );

  return (
    <div className="dark relative min-h-full text-zinc-100">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="fixed left-1/2 top-20 z-[70] -translate-x-1/2 rounded-xl border border-white/10 bg-zinc-900/95 px-4 py-2.5 text-sm text-white shadow-xl backdrop-blur-md"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Navbar */}
      <SiteHeader zIndex="50">
        <div className="relative mx-auto hidden max-w-md flex-1 md:block">
          <SiteSearch />
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <MobileSearchButton />
          <Link
            href="/community"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "hidden gap-1.5 border-violet-400/20 bg-violet-500/10 text-violet-200 hover:border-violet-400/30 hover:bg-violet-500/15 sm:inline-flex"
            )}
          >
            <MessagesSquare className="size-3.5" />
            {tNav("community")}
          </Link>
          <LanguageSwitcher />
          <LeaderboardNavButton />
          <CreatorDashboardLink />
        </div>
      </SiteHeader>

      <AnnouncementMarquee uploadHref={uploadHref} />

      <main className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <section className="relative py-12 sm:py-20 lg:py-24">
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
              {t("heroBadge")}
            </motion.div>

            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              <span className="bg-gradient-to-br from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
                {t("heroTitle1")}
              </span>
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                {t("heroTitle2")}
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-center text-base leading-relaxed text-zinc-400 sm:text-lg">
              <span className="block">{t("heroDesc1")}</span>
              <span className="block">{t("heroDesc2")}</span>
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
                  {t("browseGames")}
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
                  render={<Link href={uploadHref} />}
                  className={cn(
                    "group relative h-12 gap-2 overflow-hidden rounded-xl px-8 text-base font-semibold",
                    "border-0 bg-gradient-to-r from-cyan-500 via-violet-600 to-fuchsia-600 text-white",
                    "shadow-xl shadow-violet-500/25",
                    "before:absolute before:inset-0 before:translate-x-[-100%] before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent before:transition-transform before:duration-700 hover:before:translate-x-[100%]"
                  )}
                >
                  <Upload className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5" />
                  {t("uploadGame")}
                  <Zap className="size-4 text-yellow-300 opacity-0 transition-all duration-300 group-hover:opacity-100" />
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        </section>

        <FeaturedGames
          games={games}
          loading={loading}
          favoriteCounts={favoriteCounts}
          favoritedIds={favoritedIds}
          favoriteBusyId={favoriteBusyId}
          onFavoriteClick={(gameId) => void handleFavoriteClick(gameId)}
        />

        <HomePersonalizedSections profileId={profile?.id} />

        {/* Game Grid */}
        <section id="game-grid" className="pb-20">
          <div className="mb-6 text-center">
            <div className="mb-2 inline-flex items-center justify-center gap-2 text-sm font-medium text-cyan-400">
              <TrendingUp className="size-4" />
              {t("exploreGames")}
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {t("featuredGames")}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {selectedTags.length > 0
                ? category === ALL_CATEGORY
                  ? priceFilter === "all"
                    ? t("gridDescTags", {
                        tags: selectedTagsLabel,
                        sort: activeSortLabel,
                      })
                    : t("gridDescCategoryTags", {
                        category: t("priceFilter.all"),
                        tags: selectedTagsLabel,
                        sort: activeSortLabel,
                      })
                  : priceFilter === "all"
                    ? t("gridDescCategoryTags", {
                        category: categoryLabel(category),
                        tags: selectedTagsLabel,
                        sort: activeSortLabel,
                      })
                    : t("gridDescCategoryTags", {
                        category: `${categoryLabel(category)} · ${activePriceFilterLabel}`,
                        tags: selectedTagsLabel,
                        sort: activeSortLabel,
                      })
                : category === ALL_CATEGORY
                ? priceFilter === "all"
                  ? t("gridDescAll", { sort: activeSortLabel })
                  : t("gridDescPrice", {
                      sort: activeSortLabel,
                      price: activePriceFilterLabel,
                    })
                : priceFilter === "all"
                  ? t("gridDescCategory", {
                      category: categoryLabel(category),
                      sort: activeSortLabel,
                    })
                  : t("gridDescCategoryPrice", {
                      category: categoryLabel(category),
                      sort: activeSortLabel,
                      price: activePriceFilterLabel,
                    })}
            </p>
          </div>

          <div className="relative">
            <PriceFilterSidebar
              value={priceFilter}
              onChange={setPriceFilter}
              className="mb-6 min-[1600px]:absolute min-[1600px]:top-0 min-[1600px]:right-full min-[1600px]:z-10 min-[1600px]:mb-0 min-[1600px]:mr-4 min-[1600px]:w-36"
            />

          <TagFilterBar
            selectedTags={selectedTags}
            onChange={setSelectedTags}
          />

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
                <BentoGameGridSkeleton />
              </motion.div>
            ) : games.length > 0 ? (
              <motion.div
                key={`${category}-${selectedTags.join(",")}-${sort}-${priceFilter}-bento`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <BentoGameGrid
                  games={games}
                  favoriteCounts={favoriteCounts}
                  favoritedIds={favoritedIds}
                  favoriteBusyId={favoriteBusyId}
                  onFavoriteClick={(gameId) => void handleFavoriteClick(gameId)}
                />
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
                  {selectedTags.length > 0
                    ? t("emptyTags")
                    : priceFilter !== "all"
                    ? t("emptyPrice", { price: activePriceFilterLabel })
                    : category === ALL_CATEGORY
                      ? t("emptyAll")
                      : t("emptyCategory", {
                          category: categoryLabel(category),
                        })}
                </p>
                <p className="mt-2 text-sm text-zinc-500">
                  {selectedTags.length > 0
                    ? t("emptyHintTags")
                    : priceFilter !== "all"
                    ? t("emptyHintPrice")
                    : category === ALL_CATEGORY
                      ? t("emptyHintAll")
                      : t("emptyHintCategory")}
                </p>
                {(category !== ALL_CATEGORY ||
                  priceFilter !== "all" ||
                  selectedTags.length > 0) && (
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {selectedTags.length > 0 && (
                      <Button
                        variant="ghost"
                        className="text-zinc-400 hover:text-fuchsia-300"
                        onClick={() => setSelectedTags([])}
                      >
                        {t("viewAllTags")}
                      </Button>
                    )}
                    {category !== ALL_CATEGORY && (
                      <Button
                        variant="ghost"
                        className="text-zinc-400 hover:text-cyan-300"
                        onClick={() => setCategory(ALL_CATEGORY)}
                      >
                        {t("viewAllCategories")}
                      </Button>
                    )}
                    {priceFilter !== "all" && (
                      <Button
                        variant="ghost"
                        className="text-zinc-400 hover:text-emerald-300"
                        onClick={() => setPriceFilter("all")}
                      >
                        {t("viewAllPrices")}
                      </Button>
                    )}
                  </div>
                )}
                <Link
                  href="/dashboard/upload"
                  className={cn(buttonVariants(), "mt-6 inline-flex")}
                >
                  {t("uploadNewGame")}
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        </section>
      </main>
    </div>
  );
}
