import type { SupabaseClient } from "@supabase/supabase-js";
import { isReservedSubdomain } from "@/lib/subdomain";
import {
  GAME_SLUG_MAX_LENGTH,
  GAME_SLUG_MIN_LENGTH,
  GAME_SLUG_PATTERN,
  normalizeGameSlugInput,
} from "@/lib/game-slug";

export type CreatorUsernameValidationResult =
  | { ok: true; username: string }
  | { ok: false; error: string };

export function normalizeCreatorUsername(raw: string) {
  return normalizeGameSlugInput(raw);
}

export function suggestCreatorUsernameFromName(name: string) {
  const ascii = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalizeCreatorUsername(ascii);
}

export function validateCreatorUsername(
  raw: string
): CreatorUsernameValidationResult {
  const username = normalizeCreatorUsername(raw);

  if (!username) {
    return { ok: false, error: "請輸入創作者網址名稱" };
  }
  if (username.length < GAME_SLUG_MIN_LENGTH) {
    return {
      ok: false,
      error: `網址名稱至少 ${GAME_SLUG_MIN_LENGTH} 個字元`,
    };
  }
  if (username.length > GAME_SLUG_MAX_LENGTH) {
    return { ok: false, error: "網址名稱過長" };
  }
  if (!GAME_SLUG_PATTERN.test(username)) {
    return {
      ok: false,
      error: "僅可使用小寫英文字母、數字與連字符（-）",
    };
  }
  if (isReservedSubdomain(username)) {
    return { ok: false, error: "此網址名稱為平台保留字，請改用其他名稱" };
  }

  return { ok: true, username };
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim()
  );
}

export async function resolveCreatorIdByRouteParam(
  supabase: SupabaseClient,
  param: string
) {
  const value = param.trim();
  if (!value) return null;

  if (isUuid(value)) {
    return value;
  }

  const usernameResult = validateCreatorUsername(value);
  if (!usernameResult.ok) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", usernameResult.username)
    .maybeSingle();

  if (error) {
    throw new Error(`讀取創作者失敗：${error.message}`);
  }

  return data?.id ?? null;
}

export type SubdomainRouteKind = "game" | "creator";

export async function resolveSubdomainRoute(
  supabase: SupabaseClient,
  label: string
): Promise<SubdomainRouteKind | null> {
  const normalized = normalizeGameSlugInput(label);
  if (!normalized || isReservedSubdomain(normalized)) {
    return null;
  }

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id")
    .eq("slug", normalized)
    .maybeSingle();

  if (gameError) {
    throw new Error(`讀取遊戲子網域失敗：${gameError.message}`);
  }
  if (game) return "game";

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", normalized)
    .maybeSingle();

  if (profileError) {
    throw new Error(`讀取創作者子網域失敗：${profileError.message}`);
  }
  if (profile) return "creator";

  return null;
}
