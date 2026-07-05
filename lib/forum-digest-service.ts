import { createServerSupabase } from "@/lib/supabase-server";
import { getSiteUrl } from "@/lib/site-url";
import {
  resolveForumDigestEmailCopy,
  type ForumDigestEmailCopy,
} from "@/lib/digest-i18n";
import { defaultLocale, type AppLocale } from "@/i18n/routing";

export type ForumDigestPost = {
  title: string;
  gameTitle: string;
  url: string;
  excerpt: string;
  createdAt: string;
};

export type ForumDigestPreview = {
  subject: string;
  periodDays: number;
  posts: ForumDigestPost[];
  copy: ForumDigestEmailCopy;
};

const DIGEST_DAYS = 7;
const DIGEST_LIMIT = 12;

function truncate(text: string, max = 160) {
  const plain = text.replace(/\s+/g, " ").trim();
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max - 1)}…`;
}

function emptyPreview(locale: AppLocale): ForumDigestPreview {
  const copy = resolveForumDigestEmailCopy(locale);
  return {
    subject: copy.subject,
    periodDays: DIGEST_DAYS,
    posts: [],
    copy,
  };
}

async function resolveFollowedGameIds(
  supabase: ReturnType<typeof createServerSupabase>,
  userId: string
): Promise<Set<number>> {
  const { data: follows, error: followsError } = await supabase
    .from("creator_follows")
    .select("creator_id")
    .eq("follower_id", userId);

  if (followsError) throw new Error(followsError.message);
  if (!follows?.length) return new Set();

  const creatorIds = follows.map((row) => row.creator_id as string);
  const { data: games, error: gamesError } = await supabase
    .from("games")
    .select("id")
    .in("creator_id", creatorIds)
    .eq("publish_status", "public")
    .eq("status", "approved");

  if (gamesError) throw new Error(gamesError.message);

  return new Set((games ?? []).map((game) => game.id as number));
}

export async function buildForumDigestPreview(
  userId?: string,
  locale: AppLocale = defaultLocale
): Promise<ForumDigestPreview> {
  const copy = resolveForumDigestEmailCopy(locale);
  const supabase = createServerSupabase();
  const since = new Date(Date.now() - DIGEST_DAYS * 86_400_000).toISOString();
  const baseUrl = getSiteUrl();

  let followedGameIds: Set<number> | undefined;
  if (userId) {
    const scopedGameIds = await resolveFollowedGameIds(supabase, userId);
    if (scopedGameIds.size === 0) {
      return emptyPreview(locale);
    }
    followedGameIds = scopedGameIds;
  }

  const { data: posts, error: postsError } = await supabase
    .from("forum_posts")
    .select("id, title, content, created_at, game_id")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(DIGEST_LIMIT * 4);

  if (postsError) throw new Error(postsError.message);
  if (!posts?.length) {
    return emptyPreview(locale);
  }

  const filteredPosts = followedGameIds
    ? posts.filter((row) => followedGameIds.has(row.game_id as number))
    : posts;

  if (!filteredPosts.length) {
    return emptyPreview(locale);
  }

  const gameIds = [...new Set(filteredPosts.map((row) => row.game_id as number))];
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

  const digestPosts: ForumDigestPost[] = filteredPosts
    .filter((row) => gameTitleById.has(row.game_id as number))
    .slice(0, DIGEST_LIMIT)
    .map((row) => {
      const gameId = row.game_id as number;
      const gameTitle = gameTitleById.get(gameId) ?? "Game";
      return {
        title: row.title as string,
        gameTitle,
        url: `${baseUrl}/game/${gameId}/forum?post=${row.id}`,
        excerpt: truncate((row.content as string) ?? ""),
        createdAt: row.created_at as string,
      };
    });

  return {
    subject: copy.subject,
    periodDays: DIGEST_DAYS,
    posts: digestPosts,
    copy,
  };
}

export function renderForumDigestHtml(
  preview: ForumDigestPreview,
  options?: { unsubscribeUrl?: string }
) {
  const { copy } = preview;
  const items = preview.posts
    .map(
      (post) =>
        `<li style="margin-bottom:12px"><strong>${post.title}</strong> · ${post.gameTitle}<br/><span style="color:#71717a">${post.excerpt}</span><br/><a href="${post.url}">${copy.viewDiscussion}</a></li>`
    )
    .join("");

  const footer = options?.unsubscribeUrl
    ? `<p style="margin-top:24px;font-size:12px;color:#71717a"><a href="${options.unsubscribeUrl}" style="color:#a1a1aa">${copy.unsubscribeLink}</a></p>`
    : "";

  return `<div style="font-family:sans-serif;color:#fafafa;background:#09090b;padding:24px">
  <h1 style="color:#a78bfa;margin:0 0 8px">${copy.title}</h1>
  <p style="color:#a1a1aa;margin:0 0 20px">${copy.periodLabel.replace("{days}", String(preview.periodDays))}</p>
  <ul style="padding-left:18px;margin:0">${items || `<li>${copy.emptyPosts}</li>`}</ul>
  ${footer}
</div>`;
}

export function renderForumDigestText(
  preview: ForumDigestPreview,
  options?: { unsubscribeUrl?: string }
) {
  const { copy } = preview;
  const header = `${copy.title} — ${copy.periodLabel.replace("{days}", String(preview.periodDays))}`;
  const footer = options?.unsubscribeUrl
    ? `\n\n${copy.unsubscribeLink}: ${options.unsubscribeUrl}`
    : "";

  if (preview.posts.length === 0) {
    return `${header}\n\n${copy.emptyPosts}${footer}`;
  }

  const lines = preview.posts.map(
    (post) => `- ${post.title} · ${post.gameTitle}\n  ${post.excerpt}\n  ${post.url}`
  );

  return [header, "", ...lines, footer].join("\n");
}
