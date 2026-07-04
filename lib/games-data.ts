import {
  enrichGameRecord,
  getPlatformGameMeta,
} from "@/lib/platform-catalog";
import type { GameRecord } from "@/lib/supabase";
import type { Game } from "@/lib/games";

function resolveCoverUrl(coverUrl: string) {
  if (!coverUrl) return coverUrl;
  if (coverUrl.startsWith("http://") || coverUrl.startsWith("https://")) {
    return coverUrl;
  }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (siteUrl) {
    return `${siteUrl}${coverUrl.startsWith("/") ? coverUrl : `/${coverUrl}`}`;
  }
  return coverUrl;
}

export function mapRecordToGame(record: GameRecord): Game {
  const enriched = enrichGameRecord(record);
  const meta = getPlatformGameMeta(enriched.title);

  return {
    id: enriched.id,
    title: enriched.title,
    tags: meta?.categories ?? [enriched.category],
    players: enriched.plays_count ?? 0,
    likes: meta?.likesCount ?? 0,
    shares: meta?.sharesCount ?? 0,
    image: resolveCoverUrl(enriched.cover_url),
    creator: meta?.creator ?? "",
    description: enriched.description,
    embedUrl: resolvePlayUrl(enriched.game_url || meta?.demoUrl || ""),
    featured: meta?.featured,
    featuredBadge: meta?.featuredBadge,
    featuredAccent: meta?.featuredAccent,
    ratingAvg: meta?.ratingAvg ?? Number(enriched.rating_avg),
  };
}

export function resolvePlayUrl(gameUrl: string) {
  if (gameUrl.toLowerCase().endsWith(".zip")) {
    return gameUrl;
  }
  return gameUrl;
}

export function isDirectlyPlayable(gameUrl: string) {
  return !gameUrl.toLowerCase().endsWith(".zip");
}
