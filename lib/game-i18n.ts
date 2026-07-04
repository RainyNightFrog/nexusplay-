import { PLATFORM_GAMES } from "@/lib/platform-catalog";

/** Map game title → catalog slug for i18n lookup */
export const CATALOG_SLUG_BY_TITLE = Object.fromEntries(
  PLATFORM_GAMES.map((game) => [game.title, game.slug])
) as Record<string, string>;

const CATEGORY_KEYS = new Set([
  "全部",
  "動作",
  "冒險",
  "益智",
  "3D",
  "2D",
  "策略",
  "多人",
  "RPG",
  "競速",
  "休閒",
  "射擊",
]);

/** Translate a DB/category tag using home.categories messages when available */
export function translateCategoryTag(
  tHome: (key: string) => string,
  tag: string
): string {
  if (CATEGORY_KEYS.has(tag)) {
    return tHome(`categories.${tag}`);
  }
  return tag;
}
