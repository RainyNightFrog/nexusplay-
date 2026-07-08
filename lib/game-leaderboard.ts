import type { SupabaseClient } from "@supabase/supabase-js";
import type { EquippedTitle } from "@/lib/titles";

export type LeaderboardRow = {
  id: number;
  game_id: number;
  user_id: string;
  player_name: string;
  score: number;
  grade: string | null;
  meta: Record<string, unknown>;
  updated_at: string;
};

export type LeaderboardPublicEntry = {
  rank: number;
  playerName: string;
  score: number;
  grade: string | null;
  meta: Record<string, unknown>;
  updatedAt: string;
  isMe?: boolean;
  equippedTitle: EquippedTitle | null;
};

export function validateLeaderboardSubmit(body: {
  score?: unknown;
  grade?: unknown;
  meta?: unknown;
}): body is { score: number; grade?: string; meta?: Record<string, unknown> } {
  if (typeof body.score !== "number" || !Number.isFinite(body.score) || body.score < 0) {
    return false;
  }
  if (body.score > 999_999_999) return false;
  if (body.grade != null && typeof body.grade !== "string") return false;
  if (body.meta != null) {
    if (typeof body.meta !== "object" || Array.isArray(body.meta)) return false;
    if (JSON.stringify(body.meta).length > 4096) return false;
  }
  return true;
}

export async function getTopLeaderboard(
  supabase: SupabaseClient,
  gameId: number,
  limit = 20
): Promise<LeaderboardRow[]> {
  const { data, error } = await supabase
    .from("game_leaderboard")
    .select("id, game_id, user_id, player_name, score, grade, meta, updated_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`讀取排行榜失敗：${error.message}`);
  }

  return (data ?? []) as LeaderboardRow[];
}

export async function submitLeaderboardScore(
  supabase: SupabaseClient,
  gameId: number,
  userId: string,
  playerName: string,
  score: number,
  grade: string | null,
  meta: Record<string, unknown>
): Promise<LeaderboardRow> {
  const { data: existing, error: readError } = await supabase
    .from("game_leaderboard")
    .select("id, score")
    .eq("game_id", gameId)
    .eq("user_id", userId)
    .maybeSingle();

  if (readError) {
    throw new Error(`讀取排行榜紀錄失敗：${readError.message}`);
  }

  if (existing && existing.score >= score) {
    const { data: current, error: fetchError } = await supabase
      .from("game_leaderboard")
      .select("id, game_id, user_id, player_name, score, grade, meta, updated_at")
      .eq("id", existing.id)
      .single();

    if (fetchError) {
      throw new Error(`讀取排行榜紀錄失敗：${fetchError.message}`);
    }

    return current as LeaderboardRow;
  }

  const { data, error } = await supabase
    .from("game_leaderboard")
    .upsert(
      {
        game_id: gameId,
        user_id: userId,
        player_name: playerName,
        score,
        grade,
        meta,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "game_id,user_id" }
    )
    .select("id, game_id, user_id, player_name, score, grade, meta, updated_at")
    .single();

  if (error) {
    throw new Error(`提交排行榜失敗：${error.message}`);
  }

  return data as LeaderboardRow;
}

export function mapPublicLeaderboard(
  rows: LeaderboardRow[],
  currentUserId?: string | null,
  titleMap?: Map<string, EquippedTitle | null>
): LeaderboardPublicEntry[] {
  return rows.map((row, index) => ({
    rank: index + 1,
    playerName: row.player_name,
    score: row.score,
    grade: row.grade,
    meta: (row.meta as Record<string, unknown>) ?? {},
    updatedAt: row.updated_at,
    isMe: currentUserId ? row.user_id === currentUserId : false,
    equippedTitle: titleMap?.get(row.user_id) ?? null,
  }));
}
