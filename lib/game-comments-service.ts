import {
  type GameComment,
  type SeedGameComment,
  MAX_COMMENT_LENGTH,
} from "@/lib/game-page-content";
import { formatForumAuthor } from "@/lib/forum";
import { SEED_GAME_COMMENTS } from "@/lib/platform-catalog";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";
import type { SupabaseClient } from "@supabase/supabase-js";

type GameCommentRecord = {
  id: number;
  game_id: number;
  user_id: string;
  content: string;
  created_at: string;
};

const SEED_USER_PREFIX = "seed-comment-";

function buildSeedComments(gameId: number, gameTitle: string): GameComment[] {
  const seeds = SEED_GAME_COMMENTS[gameTitle];
  if (!seeds?.length) return [];

  const now = Date.now();
  return seeds.map((seed, index) => ({
    id: -(gameId * 100 + index + 1),
    game_id: gameId,
    user_id: `${SEED_USER_PREFIX}${gameId}-${index}`,
    content: seed.content,
    created_at: new Date(now - seed.offsetHours * 3_600_000).toISOString(),
    author_name: seed.authorName,
  }));
}

async function resolveAuthorNames(userIds: string[]) {
  const supabase = createServerSupabase();
  const uniqueIds = [...new Set(userIds.filter((id) => !id.startsWith(SEED_USER_PREFIX)))];
  const nameMap = new Map<string, string>();

  if (uniqueIds.length === 0) {
    return nameMap;
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", uniqueIds);

  for (const userId of uniqueIds) {
    const profile = profiles?.find((row) => row.id === userId);
    nameMap.set(
      userId,
      formatForumAuthor(userId, profile?.display_name ?? null)
    );
  }

  return nameMap;
}

function mapComments(
  records: GameCommentRecord[],
  nameMap: Map<string, string>
): GameComment[] {
  return records.map((record) => ({
    ...record,
    author_name: record.user_id.startsWith(SEED_USER_PREFIX)
      ? formatForumAuthor(record.user_id)
      : nameMap.get(record.user_id) ?? formatForumAuthor(record.user_id),
  }));
}

async function loadGameTitle(gameId: number) {
  const supabase = createServerSupabase();
  const { data: gameRow } = await supabase
    .from("games")
    .select("title")
    .eq("id", gameId)
    .maybeSingle();
  return gameRow?.title ?? "";
}

function mergeWithSeedComments(
  gameId: number,
  gameTitle: string,
  comments: GameComment[]
): GameComment[] {
  const seeds = buildSeedComments(gameId, gameTitle);
  if (!seeds.length) return comments;

  const merged = [...comments, ...seeds].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  return merged.slice(0, 50);
}

export async function getGameCommentsByGameId(gameId: number): Promise<GameComment[]> {
  const supabase = createServerSupabase();

  const { data, error } = await supabase
    .from("game_comments")
    .select("*")
    .eq("game_id", gameId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    if (
      error.message.includes("game_comments") &&
      error.message.includes("schema cache")
    ) {
      const gameTitle = await loadGameTitle(gameId);
      return buildSeedComments(gameId, gameTitle);
    }
    throw new Error(`讀取評論失敗：${error.message}`);
  }

  const records = (data ?? []) as GameCommentRecord[];
  const gameTitle = await loadGameTitle(gameId);

  if (records.length === 0) {
    return buildSeedComments(gameId, gameTitle);
  }

  const nameMap = await resolveAuthorNames(records.map((row) => row.user_id));
  const realComments = mapComments(records, nameMap);
  return mergeWithSeedComments(gameId, gameTitle, realComments);
}

export async function createGameComment(
  input: { gameId: number; userId: string; content: string },
  supabase?: SupabaseClient
): Promise<GameComment> {
  const trimmed = input.content.trim();
  if (!trimmed) {
    throw new Error("請輸入評論內容");
  }
  if (trimmed.length > MAX_COMMENT_LENGTH) {
    throw new Error(`評論不可超過 ${MAX_COMMENT_LENGTH} 字`);
  }

  const client = supabase ?? (await createAuthServerClient());
  const { data, error } = await client
    .from("game_comments")
    .insert({
      game_id: input.gameId,
      user_id: input.userId,
      content: trimmed,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`發表評論失敗：${error.message}`);
  }

  const record = data as GameCommentRecord;
  const nameMap = await resolveAuthorNames([record.user_id]);
  return mapComments([record], nameMap)[0]!;
}

export type { SeedGameComment };
