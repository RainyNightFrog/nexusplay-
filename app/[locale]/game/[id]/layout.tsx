import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/seo/json-ld";
import { gameFeedAlternates } from "@/lib/feed-discovery";
import {
  buildGamePageMetadata,
  notFoundMetadata,
} from "@/lib/page-metadata";
import { buildVideoGameJsonLd } from "@/lib/structured-data";
import { getPublicGameByRouteParam } from "@/lib/games-service";

type Props = {
  params: Promise<{ locale: string; id: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations("seo");

  try {
    const game = await getPublicGameByRouteParam(id);
    if (!game) {
      return notFoundMetadata(t("gameNotFound"));
    }

    return buildGamePageMetadata({
      game,
      locale,
      titleTemplate: t.raw("gameTitle"),
      descriptionTemplate: t.raw("gameDescription"),
      feedAlternates: gameFeedAlternates(game.id),
    });
  } catch {
    return notFoundMetadata(t("gameNotFound"));
  }
}

export default async function GameLayout({ params, children }: Props) {
  const { locale, id } = await params;
  let jsonLd = null;

  try {
    const game = await getPublicGameByRouteParam(id);
    if (game) {
      jsonLd = buildVideoGameJsonLd({ game, locale });
    }
  } catch {
    jsonLd = null;
  }

  return (
    <>
      {jsonLd ? <JsonLd data={jsonLd} /> : null}
      {children}
    </>
  );
}
