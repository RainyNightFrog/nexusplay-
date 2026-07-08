import type { ForumComment, ForumPost } from "@/lib/forum";
import {
  FORUM_POST_SEEDS,
  GAME_COMMENT_SEEDS,
} from "@/lib/forum-seed-content";
import {
  pickLocalizedText,
  resolveForumSeedLocale,
  resolveSeedAuthorName,
} from "@/lib/forum-seed-locale";
import type { GameComment } from "@/lib/game-page-content";

const SEED_USER_PREFIX = "seed-forum-";
const SEED_COMMENT_USER_PREFIX = "seed-comment-";

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

    return {
      id: -(gameId * 100 + index + 1),
      game_id: gameId,
      user_id: userId,
      title: pickLocalizedText(seed.title, seedLocale),
      category: seed.category,
      content: pickLocalizedText(seed.content, seedLocale),
      created_at: createdAt,
      author_name: resolveSeedAuthorName(seed.author, seedLocale),
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

  return seed.comments.map((comment, index) => ({
    id: -(postId * 10 + index + 1),
    post_id: postId,
    user_id: `${SEED_USER_PREFIX}comment-${postId}-${index}`,
    content: pickLocalizedText(comment.content, seedLocale),
    created_at: new Date(
      postCreatedAt + comment.offsetHours * 3_600_000
    ).toISOString(),
    author_name: resolveSeedAuthorName(comment.author, seedLocale),
  }));
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

  return seeds.map((seed, index) => ({
    id: -(gameId * 100 + index + 1),
    game_id: gameId,
    user_id: `${SEED_COMMENT_USER_PREFIX}${gameId}-${index}`,
    content: pickLocalizedText(seed.content, seedLocale),
    created_at: new Date(now - seed.offsetHours * 3_600_000).toISOString(),
    author_name: resolveSeedAuthorName(seed.author, seedLocale),
  }));
}

export function isSeedForumUserId(userId: string) {
  return userId.startsWith(SEED_USER_PREFIX);
}

export function isSeedGameCommentUserId(userId: string) {
  return userId.startsWith(SEED_COMMENT_USER_PREFIX);
}
