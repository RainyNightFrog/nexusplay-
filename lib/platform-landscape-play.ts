import { PLATFORM_GAMES } from "@/lib/platform-catalog";

const LANDSCAPE_SLUGS = new Set(
  PLATFORM_GAMES.filter((game) => game.slug !== "void-gacha").map(
    (game) => game.slug
  )
);

/** 平台內建橫向遊戲（街機 + demos，不含 VOID GACHA 響應式頁） */
export function isPlatformLandscapePlaySlug(
  slug?: string | null
): boolean {
  if (!slug) return false;
  return LANDSCAPE_SLUGS.has(slug.trim().toLowerCase());
}

/** 手機窄螢幕：用於自動全螢幕／橫持閘門（避免觸控筆電誤觸） */
export function isMobileNarrowPlayViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

export function isLandscapeViewport(): boolean {
  if (typeof window === "undefined") return true;
  const vv = window.visualViewport;
  const w = vv?.width ?? window.innerWidth;
  const h = vv?.height ?? window.innerHeight;
  return w >= h;
}
