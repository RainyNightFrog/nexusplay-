import type { Metadata } from "next";
import type { Game } from "@/lib/games";
import { defaultLocale, routing, type AppLocale } from "@/i18n/routing";
import { feedAlternateTypes, type FeedAlternateUrls } from "@/lib/feed-discovery";
import { getSiteUrl } from "@/lib/site-url";

export function truncateMetaDescription(text: string, max = 160) {
  const plain = text
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max - 1)}…`;
}

export function localePath(locale: string, path: string) {
  if (locale === defaultLocale) return path;
  return `/${locale}${path}`;
}

export function absoluteUrl(locale: string, path: string) {
  return `${getSiteUrl()}${localePath(locale, path)}`;
}

function buildLanguageAlternates(path: string) {
  const languages: Record<string, string> = {};

  for (const locale of routing.locales) {
    languages[locale] = absoluteUrl(locale, path);
  }

  languages["x-default"] = absoluteUrl(defaultLocale, path);
  return languages;
}

export function resolveOpenGraphImageUrl(
  locale: string,
  path: string,
  customImage?: string | null
) {
  if (customImage) return customImage;

  if (path.startsWith("/game/")) {
    return absoluteUrl(locale, `${path}/opengraph-image`);
  }

  if (path.startsWith("/creator/")) {
    return absoluteUrl(locale, `${path}/opengraph-image`);
  }

  return absoluteUrl(locale, "/opengraph-image");
}

function buildOpenGraph({
  title,
  description,
  url,
  path,
  imageUrl,
  locale,
  feedAlternates,
}: {
  title: string;
  description: string;
  url: string;
  path: string;
  imageUrl?: string | null;
  locale: string;
  feedAlternates?: FeedAlternateUrls;
}): Metadata {
  const resolvedImage = resolveOpenGraphImageUrl(locale, path, imageUrl);
  const images: NonNullable<Metadata["openGraph"]>["images"] = [
    { url: resolvedImage, alt: title },
  ];

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: buildLanguageAlternates(path),
      ...(feedAlternates ? { types: feedAlternateTypes(feedAlternates) } : {}),
    },
    openGraph: {
      type: "website",
      locale: locale.replace("-", "_"),
      url,
      title,
      description,
      siteName: "RainyNightFrog",
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [resolvedImage],
    },
  };
}

export function buildOpenGraphMetadata({
  title,
  description,
  locale,
  path,
  imageUrl,
  feedAlternates,
}: {
  title: string;
  description: string;
  locale: string;
  path: string;
  imageUrl?: string | null;
  feedAlternates?: FeedAlternateUrls;
}) {
  return buildOpenGraph({
    title,
    description,
    url: absoluteUrl(locale, path),
    path,
    imageUrl,
    locale,
    feedAlternates,
  });
}

export function buildGamePageMetadata({
  game,
  locale,
  titleTemplate,
  descriptionTemplate,
  feedAlternates,
}: {
  game: Game;
  locale: string;
  titleTemplate: string;
  descriptionTemplate: string;
  feedAlternates?: FeedAlternateUrls;
}) {
  const title = titleTemplate.replace("{title}", game.title);
  const description = truncateMetaDescription(
    game.description || descriptionTemplate.replace("{title}", game.title)
  );
  const path = `/game/${game.id}`;

  return buildOpenGraph({
    title,
    description,
    url: absoluteUrl(locale, path),
    path,
    locale,
    feedAlternates,
  });
}

export function buildCreatorPageMetadataById({
  displayName,
  gameCount,
  avatarUrl,
  creatorId,
  locale,
  titleTemplate,
  descriptionTemplate,
  feedAlternates,
}: {
  displayName: string;
  gameCount: number;
  avatarUrl: string | null;
  creatorId: string;
  locale: string;
  titleTemplate: string;
  descriptionTemplate: string;
  feedAlternates?: FeedAlternateUrls;
}) {
  const title = titleTemplate.replace("{name}", displayName);
  const description = descriptionTemplate
    .replace("{name}", displayName)
    .replace("{count}", String(gameCount));
  const path = `/creator/${creatorId}`;

  return buildOpenGraph({
    title,
    description,
    url: absoluteUrl(locale, path),
    path,
    locale,
    feedAlternates,
  });
}

export function buildSearchPageMetadata({
  locale,
  query,
  titleDefault,
  titleResults,
  description,
}: {
  locale: AppLocale;
  query?: string;
  titleDefault: string;
  titleResults: string;
  description: string;
}) {
  const title = query
    ? titleResults.replace("{query}", query)
    : titleDefault;
  const path = query
    ? `/search?q=${encodeURIComponent(query)}`
    : "/search";
  const url = absoluteUrl(locale, path);

  return buildOpenGraph({
    title,
    description,
    url,
    path,
    locale,
  });
}

export function notFoundMetadata(title: string): Metadata {
  return {
    title,
    robots: { index: false, follow: false },
  };
}
