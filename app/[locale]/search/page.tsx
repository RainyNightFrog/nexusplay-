import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SearchPageClient } from "@/components/search/search-page-client";
import { buildSearchPageMetadata } from "@/lib/page-metadata";
import { routing, type AppLocale } from "@/i18n/routing";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  const { q } = await searchParams;
  const query = q?.trim();
  const t = await getTranslations("seo");

  const safeLocale = routing.locales.includes(locale as AppLocale)
    ? (locale as AppLocale)
    : routing.defaultLocale;

  return buildSearchPageMetadata({
    locale: safeLocale,
    query,
    titleDefault: t("searchTitle"),
    titleResults: t("searchResultsTitle"),
    description: t("searchDescription"),
  });
}

export default function SearchPage() {
  return <SearchPageClient />;
}
