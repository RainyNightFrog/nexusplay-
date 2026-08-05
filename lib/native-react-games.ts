/**
 * 平台內建、但以 React 原生元件遊玩（非 iframe HTML5）的虛擬遊戲。
 * 詳情頁 `/game/[slug]` 直接掛載對應 Client，不走 embed 白名單。
 */

export const NEON_HOLDEM_SLUG = "neon-holdem";
export const NEON_HOLDEM_TITLE = "Neon Hold'em";

/** game_url 標記：表示原生 React 遊玩，不可當 iframe src */
export const NATIVE_REACT_GAME_URL_PREFIX = "native:";

export const NATIVE_REACT_GAME_SLUGS = new Set<string>([NEON_HOLDEM_SLUG]);

export function isNativeReactPlaySlug(slug?: string | null): boolean {
  if (!slug) return false;
  return NATIVE_REACT_GAME_SLUGS.has(slug.trim().toLowerCase());
}

export function isNativeReactGameUrl(gameUrl?: string | null): boolean {
  if (!gameUrl) return false;
  return gameUrl.trim().toLowerCase().startsWith(NATIVE_REACT_GAME_URL_PREFIX);
}

export function nativeReactGameUrl(slug: string): string {
  return `${NATIVE_REACT_GAME_URL_PREFIX}${slug.trim().toLowerCase()}`;
}
