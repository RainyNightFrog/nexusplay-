import type { GameRecord } from "@/lib/supabase";
import type { Game } from "@/lib/games";

export function mapRecordToGame(record: GameRecord): Game {
  return {
    id: record.id,
    title: record.title,
    tags: [record.category],
    players: "新上架",
    image: record.cover_url,
    creator: "NexusPlay 創作者",
    description: record.description,
    embedUrl: resolvePlayUrl(record.game_url),
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
