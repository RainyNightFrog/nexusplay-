import type { Game } from "@/lib/games";
import { absoluteUrl } from "@/lib/page-metadata";
import { getSiteUrl } from "@/lib/site-url";

type JsonLdObject = Record<string, unknown>;

export function buildWebSiteJsonLd(locale: string): JsonLdObject {
  const siteUrl = getSiteUrl();
  const searchUrl = absoluteUrl(locale, "/search?q={search_term_string}");

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "RainyNightFrog",
    url: absoluteUrl(locale, "/"),
    publisher: {
      "@type": "Organization",
      name: "RainyNightFrog",
      logo: `${siteUrl}/brand/rainynightfrog-logo.png`,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: searchUrl,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildVideoGameJsonLd({
  game,
  locale,
}: {
  game: Game;
  locale: string;
}): JsonLdObject {
  const data: JsonLdObject = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: game.title,
    description: game.description,
    url: absoluteUrl(locale, `/game/${game.id}`),
    genre: game.genre,
    gamePlatform: "Web browser",
    applicationCategory: "Game",
  };

  if (game.image) {
    data.image = game.image;
  }

  if (game.creator) {
    data.author = {
      "@type": "Person",
      name: game.creator,
    };
  }

  if (game.ratingAvg != null && game.ratingAvg > 0) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: game.ratingAvg,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return data;
}

export function buildPersonJsonLd({
  displayName,
  avatarUrl,
  website,
  creatorId,
  locale,
}: {
  displayName: string;
  avatarUrl: string | null;
  website: string | null;
  creatorId: string;
  locale: string;
}): JsonLdObject {
  const data: JsonLdObject = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: displayName,
    url: absoluteUrl(locale, `/creator/${creatorId}`),
  };

  if (avatarUrl) {
    data.image = avatarUrl;
  }

  if (website) {
    data.sameAs = [website];
  }

  return data;
}

export function buildOrganizationJsonLd(): JsonLdObject {
  const siteUrl = getSiteUrl();

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "RainyNightFrog",
    url: siteUrl,
    logo: `${siteUrl}/brand/rainynightfrog-logo.png`,
  };
}
