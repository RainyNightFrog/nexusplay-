import type { GameGenre } from "@/lib/game-metadata";
import {
  categoryRssChannel,
  creatorRssChannel,
  forumRssChannel,
  gamesRssChannel,
  isValidFeedCategory,
  listCategoryGameFeedItems,
  listCreatorRssFeedItems,
  listForumRssFeedItems,
  listGameRssFeedItems,
  listSingleGameFeedItems,
  singleGameFeedChannel,
  type RssFeedItem,
  type RssChannelConfig,
} from "@/lib/rss-feed-service";

export type FeedPreviewKind =
  | "games"
  | "forum"
  | "category"
  | "game"
  | "creator";

export type FeedPreviewResult = {
  feed: FeedPreviewKind;
  format: "json";
  channel: RssChannelConfig;
  items: RssFeedItem[];
  updatedAt: string;
  category?: GameGenre;
  gameId?: number;
  creatorId?: string;
};

function latestUpdatedAt(items: RssFeedItem[]) {
  if (!items.length) return new Date().toISOString();
  return items.reduce((latest, item) => {
    return new Date(item.publishedAt) > new Date(latest) ? item.publishedAt : latest;
  }, items[0].publishedAt);
}

export async function buildFeedPreview(input: {
  feed: FeedPreviewKind;
  limit: number;
  category?: string;
  gameId?: number;
  creatorId?: string;
}): Promise<FeedPreviewResult | null> {
  const { feed, limit } = input;

  if (feed === "games") {
    const items = await listGameRssFeedItems(limit);
    return {
      feed,
      format: "json",
      channel: gamesRssChannel(),
      items,
      updatedAt: latestUpdatedAt(items),
    };
  }

  if (feed === "forum") {
    const items = await listForumRssFeedItems(limit);
    return {
      feed,
      format: "json",
      channel: forumRssChannel(),
      items,
      updatedAt: latestUpdatedAt(items),
    };
  }

  if (feed === "category") {
    const category = input.category?.trim();
    if (!category || !isValidFeedCategory(category)) return null;

    const items = await listCategoryGameFeedItems(category, limit);
    return {
      feed,
      format: "json",
      channel: categoryRssChannel(category),
      items,
      updatedAt: latestUpdatedAt(items),
      category,
    };
  }

  if (feed === "game") {
    const gameId = input.gameId;
    if (!gameId || !Number.isFinite(gameId)) return null;

    const payload = await listSingleGameFeedItems(gameId, limit);
    if (!payload) return null;

    return {
      feed,
      format: "json",
      channel: singleGameFeedChannel(payload.gameTitle, gameId),
      items: payload.items,
      updatedAt: latestUpdatedAt(payload.items),
      gameId,
    };
  }

  if (feed === "creator") {
    const creatorId = input.creatorId?.trim();
    if (!creatorId) return null;

    const payload = await listCreatorRssFeedItems(creatorId, limit);
    if (!payload) return null;

    return {
      feed,
      format: "json",
      channel: creatorRssChannel(payload.displayName, creatorId),
      items: payload.items,
      updatedAt: latestUpdatedAt(payload.items),
      creatorId,
    };
  }

  return null;
}

export function parseFeedPreviewKind(value: string | null): FeedPreviewKind | null {
  if (
    value === "games" ||
    value === "forum" ||
    value === "category" ||
    value === "game" ||
    value === "creator"
  ) {
    return value;
  }
  return null;
}

export const FEED_PREVIEW_DEFAULT_LIMIT = 10;
export const FEED_PREVIEW_MAX_LIMIT = 30;
