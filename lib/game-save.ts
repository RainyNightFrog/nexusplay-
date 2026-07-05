import type { SupabaseClient } from "@supabase/supabase-js";

export const MAX_SAVE_JSON_BYTES = 256 * 1024;

export type GameSaveRecord = {
  game_id: number;
  user_id: string;
  save_data: unknown;
  updated_at: string;
};

export function validateSavePayload(save: unknown): save is Record<string, unknown> {
  if (save === null || typeof save !== "object" || Array.isArray(save)) {
    return false;
  }

  const serialized = JSON.stringify(save);
  if (serialized.length > MAX_SAVE_JSON_BYTES) {
    return false;
  }

  return true;
}

export async function loadGameSave(
  supabase: SupabaseClient,
  gameId: number,
  userId: string
): Promise<GameSaveRecord | null> {
  const { data, error } = await supabase
    .from("game_saves")
    .select("game_id, user_id, save_data, updated_at")
    .eq("game_id", gameId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`讀取存檔失敗：${error.message}`);
  }

  return data as GameSaveRecord | null;
}

export async function upsertGameSave(
  supabase: SupabaseClient,
  gameId: number,
  userId: string,
  saveData: Record<string, unknown>
): Promise<GameSaveRecord> {
  const { data, error } = await supabase
    .from("game_saves")
    .upsert(
      {
        game_id: gameId,
        user_id: userId,
        save_data: saveData,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "game_id,user_id" }
    )
    .select("game_id, user_id, save_data, updated_at")
    .single();

  if (error) {
    throw new Error(`儲存存檔失敗：${error.message}`);
  }

  return data as GameSaveRecord;
}
