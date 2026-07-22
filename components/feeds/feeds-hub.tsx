"use client";

import { useTranslations } from "next-intl";
import { ArrowLeft, Rss } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { SiteHeader } from "@/components/layout/site-header";
import { NavActions } from "@/components/layout/nav-actions";
import { CategoryFeedPreviewPicker } from "@/components/feeds/category-feed-preview-picker";
import { FeedPreviewPanel } from "@/components/feeds/feed-preview-panel";
import { RssFeedLink } from "@/components/feeds/rss-feed-link";
import { GAME_GENRES } from "@/lib/game-metadata";
import {
  categoryAtomFeedPath,
  categoryFeedPath,
} from "@/lib/rss-feed-service";
import { platformGamesAtomFeedPath } from "@/lib/feed-discovery";
import type { FeedStats } from "@/lib/feed-stats-service";
import { useGameI18n } from "@/hooks/use-game-i18n";
import { cn } from "@/lib/utils";

const PLATFORM_FEEDS = [
  { href: "/feed.xml", labelKey: "platformGamesRss" as const },
  { href: platformGamesAtomFeedPath(), labelKey: "platformGamesAtom" as const },
  { href: "/feed/forum.xml", labelKey: "platformForumRss" as const },
  { href: "/feed/forum.xml?format=atom", labelKey: "platformForumAtom" as const },
];

type FeedsHubProps = {
  stats: FeedStats;
};

export function FeedsHub({ stats }: FeedsHubProps) {
  const t = useTranslations("feeds");
  const { localizedTag } = useGameI18n();

  const categoryCountByName = new Map(
    stats.categories.map((entry) => [entry.category, entry.gameCount])
  );

  return (
    <div className="dark relative min-h-full text-zinc-100">
      <SiteHeader>
        {/* 手機：返回＋標題 */}
        <div className="flex min-w-0 flex-1 items-center gap-2 md:hidden">
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "shrink-0 gap-1.5 px-2 text-zinc-400 hover:text-amber-300"
            )}
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-violet-600 shadow-md shadow-amber-500/20">
              <Rss className="size-3.5 text-white" />
            </div>
            <span className="truncate text-sm font-semibold text-white">
              {t("title")}
            </span>
          </div>
        </div>

        {/* 電腦：還原原本頂欄 */}
        <Link
          href="/"
          className="hidden text-sm text-zinc-400 hover:text-white md:inline"
        >
          {t("backHome")}
        </Link>
        <NavActions className="ml-auto hidden md:flex" />
      </SiteHeader>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="mb-8 text-center">
          <div className="mb-2 inline-flex items-center gap-2 text-sm text-amber-400">
            <Rss className="size-4" />
            {t("badge")}
          </div>
          <h1 className="text-3xl font-bold text-white">{t("title")}</h1>
          <p className="mt-3 text-sm text-zinc-400">{t("description")}</p>
        </div>

        <section className="mb-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-4">
            <p className="text-xs text-zinc-500">{t("statsPlatformGames")}</p>
            <p className="mt-1 text-2xl font-semibold text-white">
              {stats.platformGames}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-4">
            <p className="text-xs text-zinc-500">{t("statsForumWeek")}</p>
            <p className="mt-1 text-2xl font-semibold text-white">
              {stats.forumPostsWeek}
            </p>
          </div>
        </section>

        <section className="mb-10 rounded-2xl border border-white/10 bg-zinc-900/50 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">{t("platformTitle")}</h2>
            <a
              href="/feeds.opml"
              className="text-xs text-violet-400/90 hover:text-violet-300"
            >
              {t("opmlExport")}
            </a>
          </div>
          <ul className="space-y-4">
            {PLATFORM_FEEDS.map((feed) => (
              <li key={feed.href}>
                <RssFeedLink href={feed.href} label={t(feed.labelKey)} />
                {feed.href === "/feed.xml" ? <FeedPreviewPanel feed="games" /> : null}
                {feed.href === "/feed/forum.xml" ? <FeedPreviewPanel feed="forum" /> : null}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-zinc-600">
            {t("previewApiHint")}{" "}
            <a
              href="/api/feeds/preview?feed=games&limit=10"
              className="text-violet-400/90 hover:text-violet-300"
            >
              JSON
            </a>
            {" · "}
            <a
              href="/api/feeds/catalog"
              className="text-violet-400/90 hover:text-violet-300"
            >
              {t("catalogLink")}
            </a>
            {" · "}
            <a
              href="/api/feeds/health"
              className="text-violet-400/90 hover:text-violet-300"
            >
              {t("healthLink")}
            </a>
          </p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-zinc-900/50 p-5">
          <h2 className="mb-2 text-lg font-semibold text-white">{t("categoriesTitle")}</h2>
          <p className="mb-4 text-xs text-zinc-500">{t("categoriesDesc")}</p>
          <ul className="space-y-3">
            {GAME_GENRES.map((category) => {
              const gameCount = categoryCountByName.get(category) ?? 0;
              return (
                <li
                  key={category}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2"
                >
                  <div>
                    <span className="text-sm text-zinc-200">{localizedTag(category)}</span>
                    <span className="ml-2 text-xs text-zinc-600">
                      {t("categoryGameCount", { count: gameCount })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <a
                      href={categoryFeedPath(category)}
                      className="text-amber-400/90 hover:text-amber-300"
                    >
                      RSS
                    </a>
                    <span className="text-zinc-700">·</span>
                    <a
                      href={categoryAtomFeedPath(category)}
                      className="text-cyan-400/90 hover:text-cyan-300"
                    >
                      Atom
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
          <CategoryFeedPreviewPicker />
        </section>

        <p className="mt-8 text-center text-xs text-zinc-600">{t("hint")}</p>
      </main>
    </div>
  );
}
