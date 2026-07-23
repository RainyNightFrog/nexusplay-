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
    const key = `${slug}.badge`;
    if (!tCatalog.has(key)) return fallback;
    const value = tCatalog(key);
    if (!value || value === key || value.startsWith("catalog.")) return fallback;
    return value;
  }

  function localizedDescription(title: string, fallback: string) {
    const slug = CATALOG_SLUG_BY_TITLE[title];
    if (!slug) return fallback;
    const key = `${slug}.description`;
    if (!tCatalog.has(key)) return fallback;
    const value = tCatalog(key);
    if (!value || value === key || value.startsWith("catalog.")) return fallback;
    return value;
  }

  function localizedTag(tag: string) {
    return translateCategoryTagFromMessages(messages, tag);
  }

  return { localizedBadge, localizedDescription, localizedTag };
}
