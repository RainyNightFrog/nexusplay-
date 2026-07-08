import type { ForumComment, ForumPost } from "@/lib/forum";
import {
  FORUM_POST_SEEDS,
  GAME_COMMENT_SEEDS,
} from "@/lib/forum-seed-content";
import {
  pickLocalizedText,
  resolveForumSeedLocale,
  resolveSeedAuthorName,
  resolveSeedContentLocale,
  resolveStableSeedVirtualPlayerId,
  type ForumSeedLocale,
} from "@/lib/forum-seed-locale";
import type { GameComment } from "@/lib/game-page-content";

const SEED_USER_PREFIX = "seed-forum-";
const SEED_COMMENT_USER_PREFIX = "seed-comment-";

export function seedForumPostStableKey(gameId: number, postIndex: number) {
  return `${gameId}#${postIndex}`;
}

export function buildLocalizedForumPosts(
  gameId: number,
  gameTitle: string,
  locale?: string | null
): ForumPost[] {
  const seeds = FORUM_POST_SEEDS[gameTitle];
  if (!seeds?.length) return [];

  const seedLocale = resolveForumSeedLocale(locale);
  const now = Date.now();

  return seeds.map((seed, index) => {
    const userId = `${SEED_USER_PREFIX}${gameId}-${index}`;
    const createdAt = new Date(
      now - seed.createdAtOffsetDays * 86_400_000
    ).toISOString();
    const contentLocale = resolveSeedContentLocale(seed.author, seedLocale);

    return {
      id: -(gameId * 100 + index + 1),
      game_id: gameId,
      user_id: userId,
      title: pickLocalizedText(seed.title, contentLocale),
      category: seed.category,
      content: pickLocalizedText(seed.content, contentLocale),
      created_at: createdAt,
      author_name: resolveSeedAuthorName(seed.author, seedLocale),
      author_equipped_title: null,
      author_virtual_player_id: resolveStableSeedVirtualPlayerId(seed.author),
      comment_count: seed.comments?.length ?? 0,
    };
  });
}

export function buildLocalizedForumComments(
  postId: number,
  gameTitle: string,
  postIndex: number,
  locale?: string | null
): ForumComment[] {
  const seeds = FORUM_POST_SEEDS[gameTitle];
  const seed = seeds?.[postIndex];
  if (!seed?.comments?.length) return [];

  const seedLocale = resolveForumSeedLocale(locale);
  const postCreatedAt = new Date(
    Date.now() - seed.createdAtOffsetDays * 86_400_000
  ).getTime();

  return seed.comments.map((comment, index) => {
    const contentLocale = resolveSeedContentLocale(comment.author, seedLocale);

    return {
      id: -(postId * 10 + index + 1),
      post_id: postId,
      user_id: `${SEED_USER_PREFIX}comment-${postId}-${index}`,
      content: pickLocalizedText(comment.content, contentLocale),
      created_at: new Date(
        postCreatedAt + comment.offsetHours * 3_600_000
      ).toISOString(),
      author_name: resolveSeedAuthorName(comment.author, seedLocale),
      author_equipped_title: null,
      author_virtual_player_id: resolveStableSeedVirtualPlayerId(comment.author),
    };
  });
}

export function buildLocalizedGameComments(
  gameId: number,
  gameTitle: string,
  locale?: string | null
): GameComment[] {
  const seeds = GAME_COMMENT_SEEDS[gameTitle];
  if (!seeds?.length) return [];

  const seedLocale = resolveForumSeedLocale(locale);
  const now = Date.now();

  return seeds.map((seed, index) => {
    const contentLocale = resolveSeedContentLocale(seed.author, seedLocale);

    return {
      id: -(gameId * 100 + index + 1),
      game_id: gameId,
      user_id: `${SEED_COMMENT_USER_PREFIX}${gameId}-${index}`,
      content: pickLocalizedText(seed.content, contentLocale),
      created_at: new Date(now - seed.offsetHours * 3_600_000).toISOString(),
      author_name: resolveSeedAuthorName(seed.author, seedLocale),
      author_equipped_title: null,
    };
  });
}

export function parseSeedForumPostId(postId: number): {
  gameId: number;
  postIndex: number;
} | null {
  if (postId >= 0) return null;
  const abs = Math.abs(postId);
  const gameId = Math.floor(abs / 100);
  const postIndex = (abs % 100) - 1;
  if (postIndex < 0) return null;
  return { gameId, postIndex };
}

export function seedForumPostFingerprint(post: {
  title: string;
  category: string;
  content: string;
}) {
  return `${post.category}\0${post.title}\0${post.content}`;
}

const SEED_CONTENT_LOCALES: ForumSeedLocale[] = ["zh-HK", "zh-CN", "en"];

export function findMaterializedSeedPostIndex(
  gameTitle: string,
  post: { title: string; category: string; content: string }
): number | null {
  const seeds = FORUM_POST_SEEDS[gameTitle];
  if (!seeds?.length) return null;

  for (let index = 0; index < seeds.length; index++) {
    const seed = seeds[index]!;
    if (seed.category !== post.category) continue;

    for (const locale of SEED_CONTENT_LOCALES) {
      const title = pickLocalizedText(seed.title, locale);
      const content = pickLocalizedText(seed.content, locale);
      if (title === post.title && content === post.content) {
        return index;
      }
    }
  }

  return null;
}

export function isSeedForumUserId(userId: string) {
  return userId.startsWith(SEED_USER_PREFIX);
}

export function isSeedGameCommentUserId(userId: string) {
  return userId.startsWith(SEED_COMMENT_USER_PREFIX);
}
