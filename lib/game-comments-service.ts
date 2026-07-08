import {
  type GameComment,
  MAX_COMMENT_LENGTH,
} from "@/lib/game-page-content";
import {
  buildLocalizedGameComments,
  isSeedGameCommentUserId,
} from "@/lib/forum-seed-builder";
import { formatForumAuthor } from "@/lib/forum";
import { resolveEquippedTitles } from "@/lib/equipped-title-service";
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

async function resolveAuthorNames(userIds: string[]) {
  const supabase = createServerSupabase();
  const uniqueIds = [
    ...new Set(userIds.filter((id) => !isSeedGameCommentUserId(id))),
  ];
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
  nameMap: Map<string, string>,
  titleMap: Map<string, import("@/lib/titles").EquippedTitle | null>
): GameComment[] {
  return records.map((record) => ({
    ...record,
    author_name:
      nameMap.get(record.user_id) ?? formatForumAuthor(record.user_id),
    author_equipped_title: titleMap.get(record.user_id) ?? null,
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
  comments: GameComment[],
  locale?: string | null
): GameComment[] {
  const seeds = buildLocalizedGameComments(gameId, gameTitle, locale);
  if (!seeds.length) return comments;

  const merged = [...comments, ...seeds].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  return merged.slice(0, 50);
}

export async function getGameCommentsByGameId(
  gameId: number,
  locale?: string | null
): Promise<GameComment[]> {
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
      return buildLocalizedGameComments(gameId, gameTitle, locale);
    }
    throw new Error(`讀取評論失敗：${error.message}`);
  }

  const records = (data ?? []) as GameCommentRecord[];
  const gameTitle = await loadGameTitle(gameId);

  if (records.length === 0) {
    return buildLocalizedGameComments(gameId, gameTitle, locale);
  }

  const nameMap = await resolveAuthorNames(records.map((row) => row.user_id));
  const titleMap = await resolveEquippedTitles(
    supabase,
    records.map((row) => row.user_id)
  );
  const realComments = mapComments(records, nameMap, titleMap);
  return mergeWithSeedComments(gameId, gameTitle, realComments, locale);
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
  const serverSupabase = createServerSupabase();
  const [nameMap, titleMap] = await Promise.all([
    resolveAuthorNames([record.user_id]),
    resolveEquippedTitles(serverSupabase, [record.user_id]),
  ]);
  return mapComments([record], nameMap, titleMap)[0]!;
}
