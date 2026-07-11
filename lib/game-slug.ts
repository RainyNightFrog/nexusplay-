import type { SupabaseClient } from "@supabase/supabase-js";
import { isReservedSubdomain } from "@/lib/subdomain";

export const GAME_SLUG_MIN_LENGTH = 3;
export const GAME_SLUG_MAX_LENGTH = 48;
export const GAME_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isNumericGameId(value: string) {
  return /^\d+$/.test(value.trim());
}

/** 將使用者輸入正規化為合法 slug（小寫、連字符） */
export function normalizeGameSlugInput(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, GAME_SLUG_MAX_LENGTH);
}

/** 從遊戲名稱自動產生建議 slug */
export function suggestGameSlugFromTitle(title: string) {
  const ascii = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalizeGameSlugInput(ascii);
}

export type GameSlugValidationResult =
  | { ok: true; slug: string }
  | { ok: false; error: string };

export function validateGameSlug(raw: string): GameSlugValidationResult {
  const slug = normalizeGameSlugInput(raw);

  if (!slug) {
    return { ok: false, error: "請輸入專案網址（slug）" };
  }
  if (slug.length < GAME_SLUG_MIN_LENGTH) {
    return {
      ok: false,
      error: `專案網址至少 ${GAME_SLUG_MIN_LENGTH} 個字元`,
    };
  }
  if (!GAME_SLUG_PATTERN.test(slug)) {
    return {
      ok: false,
      error: "僅可使用小寫英文字母、數字與連字符（-）",
    };
  }
  if (isReservedSubdomain(slug)) {
    return { ok: false, error: "此網址名稱為平台保留字，請改用其他名稱" };
  }

  return { ok: true, slug };
}

export function resolveGameSlugForSave(params: {
  rawSlug: string;
  title: string;
  requireSlug: boolean;
}) {
  const trimmed = params.rawSlug.trim();
  if (trimmed) {
    return validateGameSlug(trimmed);
  }

  if (!params.requireSlug) {
    return { ok: true as const, slug: null as string | null };
  }

  const suggested = suggestGameSlugFromTitle(params.title);
  if (!suggested) {
    return {
      ok: false as const,
      error: "請設定專案網址，或改用英文遊戲名稱以自動產生",
    };
  }

  return validateGameSlug(suggested);
}

export async function resolveGameRecordByRouteParam(
  supabase: SupabaseClient,
  param: string
) {
  const value = param.trim();
  if (!value) return { record: null, numericId: null as number | null };

  if (isNumericGameId(value)) {
    const numericId = Number.parseInt(value, 10);
    const { data, error } = await supabase
      .from("games")
      .select("*")
      .eq("id", numericId)
      .maybeSingle();

    if (error) {
      throw new Error(`讀取遊戲失敗：${error.message}`);
    }

    return { record: data, numericId };
  }

  const slugResult = validateGameSlug(value);
  if (!slugResult.ok) {
    return { record: null, numericId: null };
  }

  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("slug", slugResult.slug)
    .maybeSingle();

  if (error) {
    throw new Error(`讀取遊戲失敗：${error.message}`);
  }

  return {
    record: data,
    numericId: typeof data?.id === "number" ? data.id : null,
  };
}
