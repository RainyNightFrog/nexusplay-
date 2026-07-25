/** 公開遊戲頁路徑：優先 slug，否則退回數字 id */

export type GamePathRef = {
  id: number | string;
  slug?: string | null;
};

export function gameRouteSegment(game: GamePathRef): string {
  const slug = typeof game.slug === "string" ? game.slug.trim() : "";
  return slug || String(game.id);
}

/**
 * 建立公開遊戲頁相對路徑。
 * @example buildGameHref(game) → `/game/neon-snake-extreme`
 * @example buildGameHref(game, "/forum") → `/game/neon-snake-extreme/forum`
 * @example buildGameHref(game, "?draftSaved=1") → `/game/neon-snake-extreme?draftSaved=1`
 */
export function buildGameHref(game: GamePathRef, suffix = ""): string {
  const base = `/game/${gameRouteSegment(game)}`;
  if (!suffix) return base;
  if (suffix.startsWith("?") || suffix.startsWith("#")) {
    return `${base}${suffix}`;
  }
  return `${base}${suffix.startsWith("/") ? suffix : `/${suffix}`}`;
}

export function buildAbsoluteGameUrl(
  baseUrl: string,
  game: GamePathRef,
  suffix = ""
): string {
  return `${baseUrl.replace(/\/$/, "")}${buildGameHref(game, suffix)}`;
}
