import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/seo/json-ld";
import { creatorFeedAlternates } from "@/lib/feed-discovery";
import {
  buildCreatorPageMetadataById,
  notFoundMetadata,
} from "@/lib/page-metadata";
import { buildPersonJsonLd } from "@/lib/structured-data";
import { loadPublicCreatorProfile } from "@/lib/creator-public-service";

type Props = {
  params: Promise<{ locale: string; id: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations("seo");

  if (!id.trim()) {
    return notFoundMetadata(t("creatorNotFound"));
  }

  try {
    const creator = await loadPublicCreatorProfile(id);
    if (!creator) {
      return notFoundMetadata(t("creatorNotFound"));
    }

    return buildCreatorPageMetadataById({
      displayName: creator.displayName,
      gameCount: creator.games.length,
      avatarUrl: creator.avatarUrl,
      creatorId: creator.id,
      locale,
      titleTemplate: t("creatorTitle"),
      descriptionTemplate: t("creatorDescription"),
      feedAlternates: creatorFeedAlternates(creator.id),
    });
  } catch {
    return notFoundMetadata(t("creatorNotFound"));
  }
}

export default async function CreatorLayout({ params, children }: Props) {
  const { locale, id } = await params;
  let jsonLd = null;

  if (id.trim()) {
    try {
      const creator = await loadPublicCreatorProfile(id);
      if (creator) {
        jsonLd = buildPersonJsonLd({
          displayName: creator.displayName,
          avatarUrl: creator.avatarUrl,
          website: creator.website,
          creatorId: creator.id,
          locale,
        });
      }
    } catch {
      jsonLd = null;
    }
  }

  return (
    <>
      {jsonLd ? <JsonLd data={jsonLd} /> : null}
      {children}
    </>
  );
}
