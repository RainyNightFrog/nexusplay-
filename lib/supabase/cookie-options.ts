import type { CookieOptionsWithName } from "@supabase/ssr";

/**
 * Host-only cookies（不設 Domain）。
 * 登入 session 僅存在於主站 host，不會送到 play.*，避免惡意 embed 帶用者身分。
 */
export function getSupabaseCookieOptions(): CookieOptionsWithName {
  return { path: "/", sameSite: "lax" };
}
