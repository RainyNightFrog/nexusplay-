import {
  formatForumAuthor,
  type ForumCategory,
  type ForumComment,
  type ForumCommentRecord,
  type ForumPost,
  type ForumPostRecord,
  type ForumPostWithGame,
  VALID_FORUM_CATEGORIES,
} from "@/lib/forum";
import {
  buildLocalizedForumComments,
  buildLocalizedForumPosts,
} from "@/lib/forum-seed-builder";
import { resolveEquippedTitles } from "@/lib/equipped-title-service";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";
import type { SupabaseClient } from "@supabase/supabase-js";

const SEED_USER_PREFIX = "seed-forum-";


async function attachCommentCounts(
  supabase: SupabaseClient,
  postIds: number[]
): Promise<Map<number, number>> {
  const counts = new Map<number, number>();
  if (postIds.length === 0) return counts;

  const { data } = await supabase
    .from("forum_comments")
    .select("post_id")
    .in("post_id", postIds);

  for (const row of data ?? []) {
    const postId = row.post_id as number;
    counts.set(postId, (counts.get(postId) ?? 0) + 1);
  }

  return counts;
}

async function getAuthenticatedClient() {
  return createAuthServerClient();
}

export async function getForumPostCount(gameId: number): Promise<number> {
  const posts = await getForumPostsByGameId(gameId);
  return posts.length;
}

function mapPosts(
  records: ForumPostRecord[],
  nameMap: Map<string, string>,
  titleMap: Map<string, import("@/lib/titles").EquippedTitle | null>,
  commentCounts: Map<number, number> = new Map()
): ForumPost[] {
  return records.map((record) => ({
    ...record,
    author_name: nameMap.get(record.user_id) ?? formatForumAuthor(record.user_id),
    author_equipped_title: titleMap.get(record.user_id) ?? null,
    comment_count: commentCounts.get(record.id) ?? 0,
  }));
}

function mapComments(
  records: ForumCommentRecord[],
  nameMap: Map<string, string>,
  titleMap: Map<string, import("@/lib/titles").EquippedTitle | null>
): ForumComment[] {
  return records.map((record) => ({
    ...record,
    author_name: nameMap.get(record.user_id) ?? formatForumAuthor(record.user_id),
    author_equipped_title: titleMap.get(record.user_id) ?? null,
  }));
}

async function resolveAuthorDisplay(userIds: string[]) {
  const supabase = createServerSupabase();
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  const nameMap = new Map<string, string>();

  if (uniqueIds.length === 0) {
    return { nameMap, titleMap: new Map<string, import("@/lib/titles").EquippedTitle | null>() };
  }

  const [{ data: profiles }, titleMap] = await Promise.all([
    supabase.from("profiles").select("id, display_name").in("id", uniqueIds),
    resolveEquippedTitles(supabase, uniqueIds),
  ]);

  for (const userId of uniqueIds) {
    const profile = profiles?.find((row) => row.id === userId);
    nameMap.set(
      userId,
      formatForumAuthor(userId, profile?.display_name ?? null)
    );
  }

  return { nameMap, titleMap };
}

export async function getForumPostsByGameId(
  gameId: number,
  locale?: string | null
): Promise<ForumPost[]> {
  const supabase = createServerSupabase();

  let records: ForumPostRecord[] = [];
  let gameTitle = "";

  const { data, error } = await supabase
    .from("forum_posts")
    .select("*")
    .eq("game_id", gameId)
    .order("created_at", { ascending: false });

  if (!error) {
    records = (data ?? []) as ForumPostRecord[];
  }

  const { data: gameRow } = await supabase
    .from("games")
    .select("title")
    .eq("id", gameId)
    .maybeSingle();

  gameTitle = gameRow?.title ?? "";

  if (records.length === 0) {
    return buildLocalizedForumPosts(gameId, gameTitle, locale);
  }

  const { nameMap, titleMap } = await resolveAuthorDisplay(
    records.map((row) => row.user_id)
  );
  const commentCounts = await attachCommentCounts(
    supabase,
    records.map((row) => row.id)
  );
  return mapPosts(records, nameMap, titleMap, commentCounts);
}

export async function getAllForumPosts(
  locale?: string | null
): Promise<ForumPostWithGame[]> {
  const supabase = createServerSupabase();
  const { data: games } = await supabase
    .from("games")
    .select("id, title")
    .order("id", { ascending: true });

  if (!games?.length) {
    return [];
  }

  const gameTitleMap = new Map(games.map((game) => [game.id, game.title]));
  const gameIds = games.map((game) => game.id);
  const { data: records, error } = await supabase
    .from("forum_posts")
    .select("*")
    .in("game_id", gameIds)
    .order("created_at", { ascending: false });

  const postsByGame = new Map<number, ForumPostRecord[]>();
  for (const row of (records ?? []) as ForumPostRecord[]) {
    const existing = postsByGame.get(row.game_id) ?? [];
    existing.push(row);
    postsByGame.set(row.game_id, existing);
  }

  const allPosts: ForumPostWithGame[] = [];
  const dbRecords = error ? [] : ((records ?? []) as ForumPostRecord[]);

  if (dbRecords.length > 0) {
    const { nameMap, titleMap } = await resolveAuthorDisplay(
      dbRecords.map((row) => row.user_id)
    );
    const commentCounts = await attachCommentCounts(
      supabase,
      dbRecords.map((row) => row.id)
    );

    for (const record of dbRecords) {
      const mapped = mapPosts([record], nameMap, titleMap, commentCounts)[0];
      if (!mapped) continue;
      allPosts.push({
        ...mapped,
        game_title: gameTitleMap.get(record.game_id) ?? "",
      });
    }
  }

  for (const game of games) {
    if ((postsByGame.get(game.id) ?? []).length > 0) continue;
    allPosts.push(
      ...buildLocalizedForumPosts(game.id, game.title, locale).map((post) => ({
        ...post,
        game_title: game.title,
      }))
    );
  }

  return allPosts.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function getForumPostById(
  gameId: number,
  postId: number
): Promise<ForumPost | null> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("forum_posts")
    .select("*")
    .eq("id", postId)
    .eq("game_id", gameId)
    .maybeSingle();

  if (error) {
    throw new Error(`讀取討論貼文失敗：${error.message}`);
  }

  if (!data) return null;

  const record = data as ForumPostRecord;
  const { nameMap, titleMap } = await resolveAuthorDisplay([record.user_id]);
  const commentCounts = await attachCommentCounts(supabase, [record.id]);
  return mapPosts([record], nameMap, titleMap, commentCounts)[0] ?? null;
}

export async function getForumCommentsByPostId(
  postId: number,
  locale?: string | null
): Promise<ForumComment[]> {
  if (postId < 0) {
    const gameId = Math.floor(Math.abs(postId) / 100);
    const postIndex = (Math.abs(postId) % 100) - 1;
    const supabase = createServerSupabase();
    const { data: gameRow } = await supabase
      .from("games")
      .select("title")
      .eq("id", gameId)
      .maybeSingle();

    if (gameRow?.title) {
      return buildLocalizedForumComments(
        postId,
        gameRow.title,
        postIndex,
        locale
      );
    }
    return [];
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("forum_comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`讀取回覆失敗：${error.message}`);
  }

  const records = (data ?? []) as ForumCommentRecord[];
  const { nameMap, titleMap } = await resolveAuthorDisplay(
    records.map((row) => row.user_id)
  );
  return mapComments(records, nameMap, titleMap);
}

export async function createForumPost(
  input: {
    gameId: number;
    userId: string;
    title: string;
    category: ForumCategory;
    content: string;
  },
  supabase?: SupabaseClient
): Promise<ForumPost> {
  if (!VALID_FORUM_CATEGORIES.includes(input.category)) {
    throw new Error("無效的貼文分類");
  }

  const client = supabase ?? (await getAuthenticatedClient());
  const { data, error } = await client
    .from("forum_posts")
    .insert({
      game_id: input.gameId,
      user_id: input.userId,
      title: input.title,
      category: input.category,
      content: input.content,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`發布討論失敗：${error.message}`);
  }

  const record = data as ForumPostRecord;
  const { nameMap, titleMap } = await resolveAuthorDisplay([record.user_id]);
  return mapPosts([record], nameMap, titleMap, new Map([[record.id, 0]]))[0]!;
}

export async function createForumComment(
  input: {
    postId: number;
    userId: string;
    content: string;
  },
  supabase?: SupabaseClient
): Promise<ForumComment> {
  const client = supabase ?? (await getAuthenticatedClient());
  const { data, error } = await client
    .from("forum_comments")
    .insert({
      post_id: input.postId,
      user_id: input.userId,
      content: input.content,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`發表回覆失敗：${error.message}`);
  }

  const record = data as ForumCommentRecord;
  const { nameMap, titleMap } = await resolveAuthorDisplay([record.user_id]);
  return mapComments([record], nameMap, titleMap)[0]!;
}

export async function forumPostBelongsToGame(
  postId: number,
  gameId: number
): Promise<boolean> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("forum_posts")
    .select("id")
    .eq("id", postId)
    .eq("game_id", gameId)
    .maybeSingle();

  if (error) {
    throw new Error(`驗證貼文失敗：${error.message}`);
  }

  return Boolean(data);
}
