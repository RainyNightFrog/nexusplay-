"use client";

import { useTranslations } from "next-intl";
import { CATALOG_SLUG_BY_TITLE, translateCategoryTag } from "@/lib/game-i18n";

export function useGameI18n() {
  const tHome = useTranslations("home");
  const tCatalog = useTranslations("catalog");

  function localizedBadge(title: string, fallback?: string) {
    const slug = CATALOG_SLUG_BY_TITLE[title];
    if (!slug || !fallback) return fallback;
    return tCatalog(`${slug}.badge`);
  }

  function localizedDescription(title: string, fallback: string) {
    const slug = CATALOG_SLUG_BY_TITLE[title];
    if (!slug) return fallback;
    return tCatalog(`${slug}.description`);
  }

  function localizedTag(tag: string) {
    return translateCategoryTag(tHome, tag);
  }

  return { localizedBadge, localizedDescription, localizedTag };
}
