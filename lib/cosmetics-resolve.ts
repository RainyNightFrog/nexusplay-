import type { SupabaseClient } from "@supabase/supabase-js";

/** 已裝備外觀（profiles 欄位）；商店已移除，僅保留顯示解析 */
export type EquippedCosmetics = {
  avatar_frame: string | null;
  name_color: string | null;
  chat_bubble: string | null;
};

export const EMPTY_COSMETICS: EquippedCosmetics = {
  avatar_frame: null,
  name_color: null,
  chat_bubble: null,
};

/** 舊 AP 商店商品 code → CSS class（靜態對照，不再查 ap_shop_items） */
const COSMETIC_CSS_BY_CODE: Record<string, string> = {
  frame_cyan_ring: "ap-frame-cyan",
  frame_violet_glow: "ap-frame-violet",
  frame_gold_crown: "ap-frame-gold",
  name_cyan: "ap-name-cyan",
  name_rose: "ap-name-rose",
  name_aurora: "ap-name-aurora",
  bubble_mint: "ap-bubble-mint",
  bubble_sunset: "ap-bubble-sunset",
  bubble_void: "ap-bubble-void",
};

function isMissingCosmeticColumn(
  error: { code?: string; message?: string } | null
) {
  if (!error) return false;
  return (
    error.message?.includes("equipped_avatar_frame") ||
    error.message?.includes("equipped_name_color") ||
    error.message?.includes("equipped_chat_bubble") ||
    error.message?.includes("column") ||
    error.code === "PGRST204"
  );
}

export async function getEquippedCosmetics(
  supabase: SupabaseClient,
  userId: string
): Promise<EquippedCosmetics> {
  const { data, error } = await supabase
    .from("profiles")
    .select("equipped_avatar_frame, equipped_name_color, equipped_chat_bubble")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    if (isMissingCosmeticColumn(error)) return { ...EMPTY_COSMETICS };
    throw new Error(`讀取外觀失敗：${error.message}`);
  }

  return {
    avatar_frame:
      typeof data?.equipped_avatar_frame === "string"
        ? data.equipped_avatar_frame
        : null,
    name_color:
      typeof data?.equipped_name_color === "string"
        ? data.equipped_name_color
        : null,
    chat_bubble:
      typeof data?.equipped_chat_bubble === "string"
        ? data.equipped_chat_bubble
        : null,
  };
}

export async function resolveEquippedCosmeticsMap(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<Map<string, EquippedCosmetics>> {
  const result = new Map<string, EquippedCosmetics>();
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  for (const id of uniqueIds) {
    result.set(id, { ...EMPTY_COSMETICS });
  }
  if (uniqueIds.length === 0) return result;

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, equipped_avatar_frame, equipped_name_color, equipped_chat_bubble"
    )
    .in("id", uniqueIds);

  if (error) {
    if (isMissingCosmeticColumn(error)) return result;
    throw new Error(`批次讀取外觀失敗：${error.message}`);
  }

  for (const row of data ?? []) {
    result.set(row.id, {
      avatar_frame:
        typeof row.equipped_avatar_frame === "string"
          ? row.equipped_avatar_frame
          : null,
      name_color:
        typeof row.equipped_name_color === "string"
          ? row.equipped_name_color
          : null,
      chat_bubble:
        typeof row.equipped_chat_bubble === "string"
          ? row.equipped_chat_bubble
          : null,
    });
  }

  return result;
}

/** supabase 參數保留以相容既有呼叫端；改為靜態 map，不再查商店表 */
export async function resolveCosmeticCssByCodes(
  _supabase: SupabaseClient,
  codes: string[]
): Promise<Map<string, string>> {
  const unique = [...new Set(codes.filter(Boolean))];
  const map = new Map<string, string>();
  for (const code of unique) {
    const css = COSMETIC_CSS_BY_CODE[code];
    if (css) map.set(code, css);
  }
  return map;
}
