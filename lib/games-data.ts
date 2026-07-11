import {
  enrichGameRecord,
  getPlatformGameMeta,
} from "@/lib/platform-catalog";
import {
  resolveDevlogEntries,
  resolveGalleryUrls,
} from "@/lib/game-page-content";
import { metadataFromGameRecord } from "@/lib/game-metadata";
import { normalizeAppAssetUrl } from "@/lib/site-url";
import type { GameRecord } from "@/lib/supabase";
import type { Game } from "@/lib/games";

function resolveTags(record: GameRecord, category: string): string[] {
  const metadata = metadataFromGameRecord(record);
  const primary = category.trim();

  if (metadata.tags.length > 0) {
    const extraTags = metadata.tags
      .map((tag) => tag.trim())
      .filter(Boolean)
      .filter((tag) => tag !== primary);

    return primary ? [primary, ...extraTags] : extraTags;
  }

  return primary ? [primary] : [];
}

function resolveCoverUrl(coverUrl: string) {
  return normalizeAppAssetUrl(coverUrl);
}

export function mapRecordToGame(record: GameRecord): Game {
  const enriched = enrichGameRecord(record);
  const meta = getPlatformGameMeta(enriched.title);

  const publishMetadata = metadataFromGameRecord(enriched);

  return {
    id: enriched.id,
    title: enriched.title,
    tags: meta?.categories ?? resolveTags(enriched, enriched.category),
    genre: enriched.category,
    players: enriched.plays_count ?? 0,
    likes: meta?.likesCount ?? 0,
    shares: meta?.sharesCount ?? 0,
    image: resolveCoverUrl(enriched.cover_url),
    creator: meta?.creator ?? "",
    creatorId: enriched.creator_id ?? null,
    description: enriched.description,
    embedUrl: resolvePlayUrl(
      enriched.game_url || meta?.demoUrl || "",
      enriched.id
    ),
    galleryUrls: resolveGalleryUrls(enriched),
    devlogs: resolveDevlogEntries(enriched),
    detailsHtml: publishMetadata.detailsHtml || undefined,
    viewportWidth: meta?.viewportWidth ?? publishMetadata.viewportWidth,
    viewportHeight: meta?.viewportHeight ?? publishMetadata.viewportHeight,
    fullscreenButton: publishMetadata.fullscreenButton,
    aiDisclosed: publishMetadata.aiDisclosed,
    aiContentTypes: publishMetadata.aiContentTypes,
    featured: meta?.platformStar ?? meta?.featured,
    featuredBadge: meta?.platformStar ? meta?.featuredBadge : undefined,
    featuredAccent: meta?.platformStar ? meta?.featuredAccent : undefined,
    ratingAvg: meta?.ratingAvg ?? Number(enriched.rating_avg),
    tipsEnabled: enriched.tips_enabled ?? false,
    suggestedTipAmount: enriched.suggested_tip_amount ?? null,
    price: enriched.price ?? 0,
    pricingType: enriched.pricing_type ?? "free",
    currency: enriched.currency ?? "USD",
    minPrice: enriched.min_price ?? 0,
    onSale: enriched.on_sale ?? false,
  };
}

export function resolvePlayUrl(gameUrl: string, gameId?: number) {
  if (gameUrl.toLowerCase().endsWith(".zip")) {
    return gameUrl;
  }
  if (
    gameId &&
    gameUrl.includes("/storage/v1/object/public/game-files/builds/")
  ) {
    return `/api/games/${gameId}/embed/index.html`;
  }
  return gameUrl;
}

export function isDirectlyPlayable(gameUrl: string) {
  return !gameUrl.toLowerCase().endsWith(".zip");
}
