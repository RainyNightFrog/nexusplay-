"use client";

import { useMessages, useTranslations } from "next-intl";
import {
  CATALOG_SLUG_BY_TITLE,
  translateCategoryTagFromMessages,
  type HomeCategoryMessages,
} from "@/lib/game-i18n";

export function useGameI18n() {
  const messages = useMessages() as HomeCategoryMessages;
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
    return translateCategoryTagFromMessages(messages, tag);
  }

  return { localizedBadge, localizedDescription, localizedTag };
}
