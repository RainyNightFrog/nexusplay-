import { getSiteUrl } from "@/lib/site-url";
import type { GameGenre } from "@/lib/game-metadata";
import {
  categoryAtomFeedPath,
  categoryFeedPath,
  creatorAtomFeedPath,
  creatorFeedPath,
  forumAtomFeedPath,
  forumFeedPath,
} from "@/lib/rss-feed-service";

export type FeedAlternateUrls = {
  rss: string;
  atom: string;
};

function absoluteFeedPath(path: string) {
  return `${getSiteUrl()}${path}`;
}

export function platformGamesFeedAlternates(): FeedAlternateUrls {
  const rss = absoluteFeedPath("/feed.xml");
  return { rss, atom: `${rss}?format=atom` };
}

export function forumFeedAlternates(): FeedAlternateUrls {
  const rss = absoluteFeedPath(forumFeedPath());
  return { rss, atom: absoluteFeedPath(forumAtomFeedPath()) };
}

export function gameFeedAlternates(gameId: number): FeedAlternateUrls {
  const rss = absoluteFeedPath(`/feed/game/${gameId}`);
  return { rss, atom: `${rss}?format=atom` };
}

export function creatorFeedAlternates(creatorId: string): FeedAlternateUrls {
  return {
    rss: absoluteFeedPath(creatorFeedPath(creatorId)),
    atom: absoluteFeedPath(creatorAtomFeedPath(creatorId)),
  };
}

export function categoryFeedAlternates(category: GameGenre): FeedAlternateUrls {
  return {
    rss: absoluteFeedPath(categoryFeedPath(category)),
    atom: absoluteFeedPath(categoryAtomFeedPath(category)),
  };
}

export function feedAlternateTypes(feeds: FeedAlternateUrls) {
  return {
    "application/rss+xml": feeds.rss,
    "application/atom+xml": feeds.atom,
  };
}

export function platformGamesAtomFeedPath() {
  return "/feed.xml?format=atom";
}
