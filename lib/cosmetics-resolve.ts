import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveStoreCosmeticCssByKeys } from "@/lib/ap-store-service";

/** 已裝備外觀（profiles 欄位） */
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

/** 靜態後援（舊商品／離線） */
const COSMETIC_CSS_BY_CODE: Record<string, string> = {
  frame_cyan_ring: "ap-frame-cyan",
  frame_violet_glow: "ap-frame-violet",
  frame_gold_crown: "ap-frame-gold",
  frame_void_orbit: "ap-frame-void-orbit",
  frame_mint_hex: "ap-frame-mint-hex",
  frame_ember_ring: "ap-frame-ember",
  frame_crystal_prism: "ap-frame-crystal",
  frame_eternal_rain: "ap-frame-eternal-rain",
  name_cyan: "ap-name-cyan",
  name_cyan_pulse: "ap-name-cyan",
  name_rose: "ap-name-rose",
  name_rose_flare: "ap-name-rose",
  name_aurora: "ap-name-aurora",
  name_aurora_flow: "ap-name-aurora",
  name_gold_legend: "ap-name-gold-legend",
  name_lime_static: "ap-name-lime",
  name_ice_shard: "ap-name-ice",
  name_crimson_nova: "ap-name-crimson",
  name_prism_myth: "ap-name-prism-myth",
  bubble_mint: "ap-bubble-mint",
  badge_mint_spark: "ap-bubble-mint",
  bubble_sunset: "ap-bubble-sunset",
  badge_sunset_wave: "ap-bubble-sunset",
  bubble_void: "ap-bubble-void",
  badge_void_pulse: "ap-bubble-void",
  badge_rain_storm: "ap-badge-rain-storm",
  badge_sky_ripple: "ap-bubble-sky",
  badge_plasma_arc: "ap-bubble-plasma",
  badge_obsidian_flare: "ap-bubble-obsidian",
  badge_frog_aurora: "ap-badge-frog-aurora",
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

/** 優先查 AP 商店 asset_config，再回退靜態 map */
export async function resolveCosmeticCssByCodes(
  supabase: SupabaseClient,
  codes: string[]
): Promise<Map<string, string>> {
  const unique = [...new Set(codes.filter(Boolean))];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;

  try {
    const fromStore = await resolveStoreCosmeticCssByKeys(supabase, unique);
    for (const [key, css] of fromStore) {
      map.set(key, css);
    }
  } catch {
    /* store table may not exist yet */
  }

  for (const code of unique) {
    if (!map.has(code) && COSMETIC_CSS_BY_CODE[code]) {
      map.set(code, COSMETIC_CSS_BY_CODE[code]);
    }
  }

  return map;
}
