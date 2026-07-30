import type { SupabaseClient } from "@supabase/supabase-js";
import type { EquippedTitle } from "@/lib/titles";

export type LeaderboardRow = {
  id: number;
  game_id: number;
  user_id: string;
  player_name: string;
  score: number;
  grade: string | null;
  difficulty: string;
  meta: Record<string, unknown>;
  updated_at: string;
};

const DEFAULT_LEADERBOARD_DIFFICULTY = "normal";

/** 統一存成 easy / normal / hard，避免 casual↔easy 雙開同分 */
export function canonicalizeDifficulty(raw: unknown): string {
  const k = String(raw || DEFAULT_LEADERBOARD_DIFFICULTY)
    .trim()
    .toLowerCase()
    .slice(0, 32);
  if (k === "casual" || k === "easy") return "easy";
  if (k === "standard" || k === "normal") return "normal";
  if (k === "extreme" || k === "hard" || k === "狂暴") return "hard";
  return k || DEFAULT_LEADERBOARD_DIFFICULTY;
}

export function difficultyAliases(raw: unknown): string[] {
  const k = canonicalizeDifficulty(raw);
  if (k === "easy") return ["easy", "casual"];
  if (k === "normal") return ["normal", "standard"];
  if (k === "hard") return ["hard", "extreme"];
  return [k];
}

export function normalizePlayerNameKey(name: unknown): string {
  return String(name || "")
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function resolveLeaderboardDifficulty(
  meta: Record<string, unknown> | null | undefined
): string {
  const raw = meta?.difficulty;
  if (typeof raw === "string" && raw.trim()) {
    return canonicalizeDifficulty(raw);
  }
  return DEFAULT_LEADERBOARD_DIFFICULTY;
}

export type LeaderboardPublicEntry = {
  rank: number;
  playerName: string;
  score: number;
  grade: string | null;
  difficulty?: string;
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

/** 同一 user 只留最高分；再以顯示名稱去重，避免雙開別名／同名雙列 */
export function dedupeLeaderboardRows(rows: LeaderboardRow[]): LeaderboardRow[] {
  const byUser = new Map<string, LeaderboardRow>();
  for (const row of rows) {
    const uid = row.user_id || `anon:${row.id}`;
    const prev = byUser.get(uid);
    if (!prev || row.score > prev.score) {
      byUser.set(uid, row);
    }
  }

  const byName = new Map<string, LeaderboardRow>();
  const order: string[] = [];
  for (const row of byUser.values()) {
    const nameKey = normalizePlayerNameKey(row.player_name) || `id:${row.id}`;
    const prev = byName.get(nameKey);
    if (!prev) {
      byName.set(nameKey, row);
      order.push(nameKey);
      continue;
    }
    if (row.score > prev.score) {
      byName.set(nameKey, row);
    }
  }

  return order
    .map((key) => byName.get(key)!)
    .sort((a, b) => b.score - a.score);
}

export async function getTopLeaderboard(
  supabase: SupabaseClient,
  gameId: number,
  limit = 20,
  difficulty?: string | null
): Promise<LeaderboardRow[]> {
  let query = supabase
    .from("game_leaderboard")
    .select("id, game_id, user_id, player_name, score, grade, difficulty, meta, updated_at")
    .eq("game_id", gameId);

  if (difficulty) {
    query = query.in("difficulty", difficultyAliases(difficulty));
  }

  // 多取一些再去重，避免別名列佔滿 limit 後把真高分擠掉
  const fetchLimit = Math.min(100, Math.max(limit * 3, limit + 10));
  const { data, error } = await query.order("score", { ascending: false }).limit(fetchLimit);

  if (error) {
    throw new Error(`讀取排行榜失敗：${error.message}`);
  }

  return dedupeLeaderboardRows((data ?? []) as LeaderboardRow[]).slice(0, limit);
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
  const difficulty = resolveLeaderboardDifficulty(meta);
  const aliases = difficultyAliases(difficulty);
  const metaWithDifficulty = { ...meta, difficulty };

  const { data: existingRows, error: readError } = await supabase
    .from("game_leaderboard")
    .select("id, score, difficulty")
    .eq("game_id", gameId)
    .eq("user_id", userId)
    .in("difficulty", aliases);

  if (readError) {
    throw new Error(`讀取排行榜紀錄失敗：${readError.message}`);
  }

  const rows = existingRows ?? [];
  const bestExisting = rows.reduce<(typeof rows)[number] | null>((best, row) => {
    if (!best || row.score > best.score) return row;
    return best;
  }, null);

  if (bestExisting && bestExisting.score >= score) {
    const { data: current, error: fetchError } = await supabase
      .from("game_leaderboard")
      .select("id, game_id, user_id, player_name, score, grade, difficulty, meta, updated_at")
      .eq("id", bestExisting.id)
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
        difficulty,
        meta: metaWithDifficulty,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "game_id,user_id,difficulty" }
    )
    .select("id, game_id, user_id, player_name, score, grade, difficulty, meta, updated_at")
    .single();

  if (error) {
    throw new Error(`提交排行榜失敗：${error.message}`);
  }

  // 清掉同難度別名列，避免下次查詢又出現雙開
  const staleIds = rows
    .filter((row) => row.difficulty !== difficulty)
    .map((row) => row.id);
  if (staleIds.length) {
    await supabase.from("game_leaderboard").delete().in("id", staleIds);
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
    difficulty: row.difficulty,
    meta: (row.meta as Record<string, unknown>) ?? {},
    updatedAt: row.updated_at,
    isMe: currentUserId ? row.user_id === currentUserId : false,
    equippedTitle: titleMap?.get(row.user_id) ?? null,
  }));
}
