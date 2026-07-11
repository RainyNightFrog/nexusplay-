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
  findMaterializedSeedPostIndex,
  parseSeedForumPostId,
  seedForumPostStableKey,
} from "@/lib/forum-seed-builder";
import { getAmbientUserPlayerMap } from "@/lib/ambient-user-index";
import { resolveEquippedTitles } from "@/lib/equipped-title-service";
import { resolveSupporterFlags } from "@/lib/supporter-profile";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";
import type { SupabaseClient } from "@supabase/supabase-js";

function collectMaterializedSeedKeys(
  gameId: number,
  gameTitle: string,
  realPosts: ForumPost[]
): Set<string> {
  const keys = new Set<string>();
  if (!gameTitle) return keys;

  for (const post of realPosts) {
    const index = findMaterializedSeedPostIndex(gameTitle, post);
    if (index !== null) {
      keys.add(seedForumPostStableKey(gameId, index));
    }
  }

  return keys;
}

function mergeRealPostsWithRemainingSeeds(
  gameId: number,
  gameTitle: string,
  realPosts: ForumPost[],
  locale?: string | null
): ForumPost[] {
  if (!gameTitle) return realPosts;

  const materialized = collectMaterializedSeedKeys(gameId, gameTitle, realPosts);
  const remainingSeeds = buildLocalizedForumPosts(gameId, gameTitle, locale).filter(
    (seed) => {
      const parsed = parseSeedForumPostId(seed.id);
      if (!parsed) return true;
      return !materialized.has(seedForumPostStableKey(gameId, parsed.postIndex));
    }
  );

  return [...realPosts, ...remainingSeeds].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

async function resolveAmbientUserIdForVirtualPlayer(
  supabase: SupabaseClient,
  virtualPlayerId: string | null | undefined
): Promise<string | null> {
  if (!virtualPlayerId) return null;
  const map = await getAmbientUserPlayerMap(supabase);
  for (const [userId, playerId] of map.entries()) {
    if (playerId === virtualPlayerId) return userId;
  }
  return null;
}

async function resolveMaterializedAuthorUserId(
  supabase: SupabaseClient,
  gameId: number,
  virtualPlayerId: string | null | undefined,
  fallbackUserId: string
): Promise<string> {
  const ambient = await resolveAmbientUserIdForVirtualPlayer(
    supabase,
    virtualPlayerId
  );
  if (ambient) return ambient;

  const { data: game } = await supabase
    .from("games")
    .select("creator_id")
    .eq("id", gameId)
    .maybeSingle();
  if (game?.creator_id) return game.creator_id as string;

  return fallbackUserId;
}

export async function materializeSeedForumPostIfNeeded(
  gameId: number,
  seedPostId: number,
  locale: string | null | undefined,
  actingUserId: string
): Promise<number> {
  const parsed = parseSeedForumPostId(seedPostId);
  if (!parsed || parsed.gameId !== gameId) {
    throw new Error("找不到此貼文");
  }

  const supabase = createServerSupabase();
  const { data: gameRow } = await supabase
    .from("games")
    .select("title")
    .eq("id", gameId)
    .maybeSingle();

  if (!gameRow?.title) {
    throw new Error("找不到此貼文");
  }

  const seedPosts = buildLocalizedForumPosts(gameId, gameRow.title, locale);
  const seedPost = seedPosts[parsed.postIndex];
  if (!seedPost || seedPost.id !== seedPostId) {
    throw new Error("找不到此貼文");
  }

  const { data: existingPosts } = await supabase
    .from("forum_posts")
    .select("id, title, category, content")
    .eq("game_id", gameId);

  for (const row of existingPosts ?? []) {
    const index = findMaterializedSeedPostIndex(
      gameRow.title,
      row as ForumPostRecord
    );
    if (index === parsed.postIndex) {
      return row.id as number;
    }
  }

  const authorUserId = await resolveMaterializedAuthorUserId(
    supabase,
    gameId,
    seedPost.author_virtual_player_id,
    actingUserId
  );

  const realPost = await createForumPost(
    {
      gameId,
      userId: authorUserId,
      title: seedPost.title,
      category: seedPost.category,
      content: seedPost.content,
    },
    supabase
  );

  const seedComments = buildLocalizedForumComments(
    seedPostId,
    gameRow.title,
    parsed.postIndex,
    locale
  );

  for (const seedComment of seedComments) {
    const commentAuthorId = await resolveMaterializedAuthorUserId(
      supabase,
      gameId,
      seedComment.author_virtual_player_id,
      actingUserId
    );
    await createForumComment(
      {
        postId: realPost.id,
        userId: commentAuthorId,
        content: seedComment.content,
      },
      supabase
    );
  }

  return realPost.id;
}


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
  commentCounts: Map<number, number> = new Map(),
  supporterMap: Map<string, boolean> = new Map()
): ForumPost[] {
  return records.map((record) => ({
    ...record,
    author_name: nameMap.get(record.user_id) ?? formatForumAuthor(record.user_id),
    author_equipped_title: titleMap.get(record.user_id) ?? null,
    author_is_supporter: supporterMap.get(record.user_id) === true,
    comment_count: commentCounts.get(record.id) ?? 0,
  }));
}

function mapComments(
  records: ForumCommentRecord[],
  nameMap: Map<string, string>,
  titleMap: Map<string, import("@/lib/titles").EquippedTitle | null>,
  supporterMap: Map<string, boolean> = new Map()
): ForumComment[] {
  return records.map((record) => ({
    ...record,
    author_name: nameMap.get(record.user_id) ?? formatForumAuthor(record.user_id),
    author_equipped_title: titleMap.get(record.user_id) ?? null,
    author_is_supporter: supporterMap.get(record.user_id) === true,
  }));
}

async function resolveAuthorDisplay(userIds: string[]) {
  const supabase = createServerSupabase();
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  const nameMap = new Map<string, string>();

  if (uniqueIds.length === 0) {
    return {
      nameMap,
      titleMap: new Map<string, import("@/lib/titles").EquippedTitle | null>(),
      supporterMap: new Map<string, boolean>(),
    };
  }

  const [{ data: profiles }, titleMap, supporterMap] = await Promise.all([
    supabase.from("profiles").select("id, display_name").in("id", uniqueIds),
    resolveEquippedTitles(supabase, uniqueIds),
    resolveSupporterFlags(supabase, uniqueIds),
  ]);

  for (const userId of uniqueIds) {
    const profile = profiles?.find((row) => row.id === userId);
    nameMap.set(
      userId,
      formatForumAuthor(userId, profile?.display_name ?? null)
    );
  }

  return { nameMap, titleMap, supporterMap };
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

  const { nameMap, titleMap, supporterMap } = await resolveAuthorDisplay(
    records.map((row) => row.user_id)
  );
  const commentCounts = await attachCommentCounts(
    supabase,
    records.map((row) => row.id)
  );
  const realPosts = mapPosts(records, nameMap, titleMap, commentCounts, supporterMap);
  return mergeRealPostsWithRemainingSeeds(gameId, gameTitle, realPosts, locale);
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

  const gameIds = games.map((game) => game.id);
  const { data: records, error } = await supabase
    .from("forum_posts")
    .select("*")
    .in("game_id", gameIds)
    .order("created_at", { ascending: false });

  const allPosts: ForumPostWithGame[] = [];
  const dbRecords = error ? [] : ((records ?? []) as ForumPostRecord[]);
  const mappedByGame = new Map<number, ForumPost[]>();

  if (dbRecords.length > 0) {
    const { nameMap, titleMap, supporterMap } = await resolveAuthorDisplay(
      dbRecords.map((row) => row.user_id)
    );
    const commentCounts = await attachCommentCounts(
      supabase,
      dbRecords.map((row) => row.id)
    );

    for (const record of dbRecords) {
      const mapped = mapPosts([record], nameMap, titleMap, commentCounts, supporterMap)[0];
      if (!mapped) continue;
      const list = mappedByGame.get(record.game_id) ?? [];
      list.push(mapped);
      mappedByGame.set(record.game_id, list);
    }
  }

  for (const game of games) {
    const realPosts = mappedByGame.get(game.id) ?? [];
    const merged = mergeRealPostsWithRemainingSeeds(
      game.id,
      game.title,
      realPosts,
      locale
    );
    for (const post of merged) {
      allPosts.push({
        ...post,
        game_title: game.title,
      });
    }
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
  const { nameMap, titleMap, supporterMap } = await resolveAuthorDisplay([record.user_id]);
  const commentCounts = await attachCommentCounts(supabase, [record.id]);
  return mapPosts([record], nameMap, titleMap, commentCounts, supporterMap)[0] ?? null;
}

export async function getForumCommentsByPostId(
  postId: number,
  locale?: string | null
): Promise<ForumComment[]> {
  if (postId < 0) {
    const parsed = parseSeedForumPostId(postId);
    if (!parsed) return [];

    const supabase = createServerSupabase();
    const { data: gameRow } = await supabase
      .from("games")
      .select("title")
      .eq("id", parsed.gameId)
      .maybeSingle();

    if (!gameRow?.title) return [];

    const seedPosts = buildLocalizedForumPosts(
      parsed.gameId,
      gameRow.title,
      locale
    );
    const seedPost = seedPosts[parsed.postIndex];
    if (!seedPost) return [];

    const { data: existingPosts } = await supabase
      .from("forum_posts")
      .select("id, title, category, content")
      .eq("game_id", parsed.gameId);

    for (const row of existingPosts ?? []) {
      const index = findMaterializedSeedPostIndex(
        gameRow.title,
        row as ForumPostRecord
      );
      if (index === parsed.postIndex) {
        return getForumCommentsByPostId(row.id as number, locale);
      }
    }

    return buildLocalizedForumComments(
      postId,
      gameRow.title,
      parsed.postIndex,
      locale
    );
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
  const { nameMap, titleMap, supporterMap } = await resolveAuthorDisplay(
    records.map((row) => row.user_id)
  );
  return mapComments(records, nameMap, titleMap, supporterMap);
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
  const { nameMap, titleMap, supporterMap } = await resolveAuthorDisplay([record.user_id]);
  return mapPosts([record], nameMap, titleMap, new Map([[record.id, 0]]), supporterMap)[0]!;
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
  const { nameMap, titleMap, supporterMap } = await resolveAuthorDisplay([record.user_id]);
  return mapComments([record], nameMap, titleMap, supporterMap)[0]!;
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
