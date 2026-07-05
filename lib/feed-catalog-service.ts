import { GAME_GENRES } from "@/lib/game-metadata";
import {
  categoryAtomFeedPath,
  categoryFeedPath,
  forumAtomFeedPath,
  forumFeedPath,
} from "@/lib/rss-feed-service";
import {
  platformGamesAtomFeedPath,
  platformGamesFeedAlternates,
} from "@/lib/feed-discovery";
import { getSiteUrl } from "@/lib/site-url";

export type FeedCatalogEntry = {
  id: string;
  label: string;
  rss: string;
  atom: string;
  html?: string;
  preview: string;
};

export type FeedCatalog = {
  generatedAt: string;
  opml: string;
  feeds: FeedCatalogEntry[];
};

export function buildFeedCatalog(): FeedCatalog {
  const baseUrl = getSiteUrl();
  const platform = platformGamesFeedAlternates();
  const feeds: FeedCatalogEntry[] = [
    {
      id: "games",
      label: "New Games",
      rss: platform.rss,
      atom: platform.atom,
      html: baseUrl,
      preview: `${baseUrl}/api/feeds/preview?feed=games`,
    },
    {
      id: "forum",
      label: "Community Forum",
      rss: `${baseUrl}${forumFeedPath()}`,
      atom: `${baseUrl}${forumAtomFeedPath()}`,
      html: `${baseUrl}/community`,
      preview: `${baseUrl}/api/feeds/preview?feed=forum`,
    },
  ];

  for (const category of GAME_GENRES) {
    feeds.push({
      id: `category:${category}`,
      label: category,
      rss: `${baseUrl}${categoryFeedPath(category)}`,
      atom: `${baseUrl}${categoryAtomFeedPath(category)}`,
      html: `${baseUrl}/?category=${encodeURIComponent(category)}`,
      preview: `${baseUrl}/api/feeds/preview?feed=category&category=${encodeURIComponent(category)}`,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    opml: `${baseUrl}/feeds.opml`,
    feeds,
  };
}

export function platformGamesAtomPath() {
  return platformGamesAtomFeedPath();
}
