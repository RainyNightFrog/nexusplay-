import { PLATFORM_GAMES } from "@/lib/platform-catalog";
import { GAME_GENRES, GAME_TAGS } from "@/lib/game-metadata";

/** Map game title → catalog slug for i18n lookup */
export const CATALOG_SLUG_BY_TITLE = Object.fromEntries(
  PLATFORM_GAMES.map((game) => [game.title, game.slug])
) as Record<string, string>;

/** Tags that need a safe i18n key (next-intl dot-path cannot resolve e.g. categories.3D) */
export const CATEGORY_MESSAGE_KEY: Record<string, string> = {
  "3D": "dim3d",
  "2D": "dim2d",
  "8-bit": "bit8",
  "16-bit": "bit16",
};

export function categoryMessageKey(tag: string): string {
  return CATEGORY_MESSAGE_KEY[tag] ?? tag;
}

export type HomeCategoryMessages = {
  home?: {
    categories?: Record<string, string>;
  };
};

export function normalizeCategoryTag(tag: string): string {
  return String(tag ?? "").trim();
}

/** Resolve a genre/tag label from loaded messages; never returns an i18n key path */
export function translateCategoryTagFromMessages(
  messages: HomeCategoryMessages | undefined,
  tag: string
): string {
  const normalized = normalizeCategoryTag(tag);
  if (!normalized) return "";

  const key = categoryMessageKey(normalized);
  const label = messages?.home?.categories?.[key];
  if (typeof label === "string" && label.trim()) {
    return label;
  }

  return normalized;
}

/** @deprecated Prefer translateCategoryTagFromMessages with useMessages() */
export function translateCategoryTag(
  tCategories: (key: string) => string,
  tag: string
): string {
  const normalized = normalizeCategoryTag(tag);
  if (!normalized) return "";

  const key = categoryMessageKey(normalized);
  let translated: string;

  try {
    translated = tCategories(key);
  } catch {
    return normalized;
  }

  if (
    !translated ||
    translated === key ||
    translated.includes("home.categories") ||
    translated.startsWith("categories.")
  ) {
    return normalized;
  }

  return translated;
}

/** All category/tag keys that should exist under home.categories */
export const HOME_CATEGORY_MESSAGE_TAGS = [
  "全部",
  ...GAME_GENRES,
  ...GAME_TAGS.filter(
    (tag) => !(GAME_GENRES as readonly string[]).includes(tag)
  ),
  ...Object.keys(CATEGORY_MESSAGE_KEY),
] as const;
