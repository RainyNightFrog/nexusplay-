import { GAME_GENRES, type GameGenre } from "@/lib/game-metadata";
import { createServerSupabase } from "@/lib/supabase-server";
import { loadPublicCreatorProfile } from "@/lib/creator-public-service";
import { resolveDevlogEntries } from "@/lib/game-page-content";
import { getPublicGameById } from "@/lib/games-service";
import { getSiteUrl } from "@/lib/site-url";
import { getWebSubHubUrl } from "@/lib/websub-service";

export type RssFeedItem = {
  id: string | number;
  title: string;
  description: string;
  url: string;
  publishedAt: string;
};

export type RssChannelConfig = {
  title: string;
  description: string;
  link?: string;
  language?: string;
  atomSelfUrl?: string;
};

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function truncate(text: string, max = 280) {
  const plain = text.replace(/\s+/g, " ").trim();
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max - 1)}…`;
}

export function buildRssFeedXml(items: RssFeedItem[], channel: RssChannelConfig) {
  const baseUrl = getSiteUrl();
  const now = new Date().toUTCString();
  const channelLink = channel.link ?? baseUrl;
  const language = channel.language ?? "zh-HK";

  const itemXml = items
    .map((item) => {
      const pubDate = new Date(item.publishedAt).toUTCString();
      return `<item>
  <title>${escapeXml(item.title)}</title>
  <link>${escapeXml(item.url)}</link>
  <guid isPermaLink="true">${escapeXml(item.url)}</guid>
  <description>${escapeXml(item.description)}</description>
  <pubDate>${pubDate}</pubDate>
</item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(channel.title)}</title>
    <link>${escapeXml(channelLink)}</link>
    <description>${escapeXml(channel.description)}</description>
    <language>${escapeXml(language)}</language>
    <lastBuildDate>${now}</lastBuildDate>
    <generator>NexusPlay</generator>
${itemXml}
  </channel>
</rss>`;
}

export function buildAtomFeedXml(items: RssFeedItem[], channel: RssChannelConfig) {
  const baseUrl = getSiteUrl();
  const channelLink = channel.link ?? baseUrl;
  const updatedSource = items[0]?.publishedAt ?? new Date().toISOString();
  const feedId = channelLink.endsWith("/") ? channelLink : `${channelLink}/`;
  const selfUrl = channel.atomSelfUrl ?? feedId;
  const hubUrl = getWebSubHubUrl();
  const hubXml = hubUrl
    ? `  <link href="${escapeXml(hubUrl)}" rel="hub" />\n`
    : "";

  const entryXml = items
    .map((item) => {
      const updated = new Date(item.publishedAt).toISOString();
      return `<entry>
  <title>${escapeXml(item.title)}</title>
  <link href="${escapeXml(item.url)}" rel="alternate" />
  <id>${escapeXml(item.url)}</id>
  <updated>${updated}</updated>
  <summary>${escapeXml(item.description)}</summary>
</entry>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(channel.title)}</title>
  <subtitle>${escapeXml(channel.description)}</subtitle>
  <link href="${escapeXml(channelLink)}" rel="alternate" />
${hubXml}  <link href="${escapeXml(selfUrl)}" rel="self" />
  <id>${escapeXml(feedId)}</id>
  <updated>${new Date(updatedSource).toISOString()}</updated>
  <generator>NexusPlay</generator>
${entryXml}
</feed>`;
}

export async function listGameRssFeedItems(limit = 30): Promise<RssFeedItem[]> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("games")
    .select("id, title, description, created_at")
    .eq("publish_status", "public")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  const baseUrl = getSiteUrl();

  return (data ?? []).map((row) => ({
    id: row.id as number,
    title: row.title as string,
    description: truncate((row.description as string) ?? ""),
    url: `${baseUrl}/game/${row.id}`,
    publishedAt: row.created_at as string,
  }));
}

/** @deprecated Use listGameRssFeedItems */
export const listRssFeedItems = listGameRssFeedItems;

export async function listForumRssFeedItems(limit = 30): Promise<RssFeedItem[]> {
  const supabase = createServerSupabase();
  const { data: posts, error: postsError } = await supabase
    .from("forum_posts")
    .select("id, title, content, created_at, game_id")
    .order("created_at", { ascending: false })
    .limit(limit * 2);

  if (postsError) throw new Error(postsError.message);
  if (!posts?.length) return [];

  const gameIds = [...new Set(posts.map((row) => row.game_id as number))];
  const { data: games, error: gamesError } = await supabase
    .from("games")
    .select("id, title")
    .in("id", gameIds)
    .eq("publish_status", "public")
    .eq("status", "approved");

  if (gamesError) throw new Error(gamesError.message);

  const gameTitleById = new Map(
    (games ?? []).map((game) => [game.id as number, game.title as string])
  );
  const baseUrl = getSiteUrl();

  return posts
    .filter((row) => gameTitleById.has(row.game_id as number))
    .slice(0, limit)
    .map((row) => {
      const gameTitle = gameTitleById.get(row.game_id as number);
      const postTitle = row.title as string;
      const title = gameTitle ? `${postTitle} · ${gameTitle}` : postTitle;

      return {
        id: row.id as number,
        title,
        description: truncate((row.content as string) ?? ""),
        url: `${baseUrl}/game/${row.game_id}/forum?post=${row.id}`,
        publishedAt: row.created_at as string,
      };
    });
}

export async function listCreatorRssFeedItems(
  creatorId: string,
  limit = 30
): Promise<{ items: RssFeedItem[]; displayName: string } | null> {
  const creator = await loadPublicCreatorProfile(creatorId);
  if (!creator) return null;

  const supabase = createServerSupabase();
  const { data: games, error } = await supabase
    .from("games")
    .select("id, title, description, created_at")
    .eq("creator_id", creatorId)
    .eq("publish_status", "public")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  const baseUrl = getSiteUrl();
  const items = (games ?? []).map((game) => ({
    id: game.id as number,
    title: game.title as string,
    description: truncate((game.description as string) ?? ""),
    url: `${baseUrl}/game/${game.id}`,
    publishedAt: game.created_at as string,
  }));

  return { items, displayName: creator.displayName };
}

export function gamesRssChannel(): RssChannelConfig {
  return {
    title: "NexusPlay — New Games",
    description: "Latest public games published on NexusPlay.",
  };
}

export function forumRssChannel(): RssChannelConfig {
  const baseUrl = getSiteUrl();
  return {
    title: "NexusPlay — Community Forum",
    description: "Latest forum discussions across NexusPlay games.",
    link: `${baseUrl}/community`,
  };
}

export function forumFeedPath() {
  return "/feed/forum.xml";
}

export function forumAtomFeedPath() {
  return `${forumFeedPath()}?format=atom`;
}

export function creatorRssChannel(displayName: string, creatorId: string): RssChannelConfig {
  const baseUrl = getSiteUrl();
  return {
    title: `${displayName} — NexusPlay Games`,
    description: `Public games by ${displayName} on NexusPlay.`,
    link: `${baseUrl}/creator/${creatorId}`,
  };
}

export function creatorFeedPath(creatorId: string) {
  return `/feed/creator/${creatorId}`;
}

export function creatorAtomFeedPath(creatorId: string) {
  return `${creatorFeedPath(creatorId)}?format=atom`;
}

export function singleGameFeedChannel(gameTitle: string, gameId: number): RssChannelConfig {
  const baseUrl = getSiteUrl();
  return {
    title: `${gameTitle} — NexusPlay Updates`,
    description: `Devlogs and forum discussions for ${gameTitle}.`,
    link: `${baseUrl}/game/${gameId}`,
  };
}

export async function listSingleGameFeedItems(
  gameId: number,
  limit = 40
): Promise<{ items: RssFeedItem[]; gameTitle: string } | null> {
  const game = await getPublicGameById(gameId);
  if (!game) return null;

  const supabase = createServerSupabase();
  const baseUrl = getSiteUrl();
  const items: RssFeedItem[] = [];

  const { data: record } = await supabase
    .from("games")
    .select("title, devlog_entries")
    .eq("id", gameId)
    .maybeSingle();

  if (record) {
    for (const devlog of resolveDevlogEntries(record)) {
      items.push({
        id: devlog.id,
        title: `Devlog: ${devlog.title}`,
        description: truncate(devlog.content),
        url: `${baseUrl}/game/${gameId}`,
        publishedAt: devlog.createdAt,
      });
    }
  }

  const { data: posts, error: postsError } = await supabase
    .from("forum_posts")
    .select("id, title, content, created_at")
    .eq("game_id", gameId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (postsError) throw new Error(postsError.message);

  for (const post of posts ?? []) {
    items.push({
      id: post.id as number,
      title: post.title as string,
      description: truncate((post.content as string) ?? ""),
      url: `${baseUrl}/game/${gameId}/forum?post=${post.id}`,
      publishedAt: post.created_at as string,
    });
  }

  items.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  return {
    items: items.slice(0, limit),
    gameTitle: game.title,
  };
}

export function isValidFeedCategory(value: string): value is GameGenre {
  return (GAME_GENRES as readonly string[]).includes(value);
}

export function categoryFeedPath(category: GameGenre) {
  return `/feed/category/${encodeURIComponent(category)}`;
}

export function categoryAtomFeedPath(category: GameGenre) {
  return `${categoryFeedPath(category)}?format=atom`;
}

export async function listCategoryGameFeedItems(
  category: GameGenre,
  limit = 30
): Promise<RssFeedItem[]> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("games")
    .select("id, title, description, created_at")
    .eq("category", category)
    .eq("publish_status", "public")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  const baseUrl = getSiteUrl();

  return (data ?? []).map((row) => ({
    id: row.id as number,
    title: row.title as string,
    description: truncate((row.description as string) ?? ""),
    url: `${baseUrl}/game/${row.id}`,
    publishedAt: row.created_at as string,
  }));
}

export function categoryRssChannel(category: GameGenre): RssChannelConfig {
  const baseUrl = getSiteUrl();
  return {
    title: `NexusPlay — ${category}`,
    description: `Latest ${category} games on NexusPlay.`,
    link: `${baseUrl}/?category=${encodeURIComponent(category)}`,
  };
}
