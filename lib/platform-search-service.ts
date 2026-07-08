import { mapRecordToGame } from "@/lib/games-data";
import type { Game } from "@/lib/games";
import { resolveEquippedTitles } from "@/lib/equipped-title-service";
import type { EquippedTitle } from "@/lib/titles";
import { createServerSupabase } from "@/lib/supabase-server";

export type SearchCreatorResult = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  gameCount: number;
  equippedTitle: EquippedTitle | null;
};

export type PlatformSearchResult = {
  query: string;
  games: Game[];
  creators: SearchCreatorResult[];
};

function escapeIlikePattern(value: string) {
  return value.replace(/[%_\\]/g, "\\$&");
}

function gameMatchesQuery(game: Game, normalized: string) {
  const haystack = [
    game.title,
    game.description,
    game.genre,
    game.creator,
    ...game.tags,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalized);
}

async function fetchGamesMatchingText(
  pattern: string,
  limit: number,
  creatorIds?: string[]
) {
  const supabase = createServerSupabase();
  const gameMap = new Map<number, Game>();

  const base = () =>
    supabase
      .from("games")
      .select("*")
      .eq("publish_status", "public")
      .eq("status", "approved");

  const queries = [
    base().ilike("title", pattern).limit(limit),
    base().ilike("description", pattern).limit(limit),
    base().ilike("category", pattern).limit(limit),
  ];

  if (creatorIds?.length) {
    queries.push(base().in("creator_id", creatorIds).limit(limit));
  }

  const results = await Promise.all(queries);

  for (const result of results) {
    if (result.error) throw new Error(result.error.message);
    for (const row of result.data ?? []) {
      gameMap.set(row.id as number, mapRecordToGame(row));
    }
  }

  return gameMap;
}

export async function searchPlatform(
  rawQuery: string,
  limit = 24
): Promise<PlatformSearchResult> {
  const query = rawQuery.trim().slice(0, 80);
  if (!query) {
    return { query: "", games: [], creators: [] };
  }

  const supabase = createServerSupabase();
  const normalized = query.toLowerCase();
  const pattern = `%${escapeIlikePattern(query)}%`;

  const { data: matchingProfiles } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, role")
    .ilike("display_name", pattern)
    .in("role", ["creator", "admin"])
    .limit(12);

  const creatorIdsFromName = (matchingProfiles ?? []).map((row) => row.id as string);
  const gameMap = await fetchGamesMatchingText(pattern, limit, creatorIdsFromName);

  if (gameMap.size < limit) {
    const { data: recentGames, error: recentError } = await supabase
      .from("games")
      .select("*")
      .eq("publish_status", "public")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(120);

    if (recentError) throw new Error(recentError.message);

    for (const row of recentGames ?? []) {
      if (gameMap.size >= limit) break;
      const game = mapRecordToGame(row);
      if (gameMatchesQuery(game, normalized)) {
        gameMap.set(game.id, game);
      }
    }
  }

  const games = [...gameMap.values()]
    .filter((game) => gameMatchesQuery(game, normalized))
    .slice(0, limit);

  const creatorCounts = new Map<string, number>();
  const { data: publicGames } = await supabase
    .from("games")
    .select("creator_id")
    .eq("publish_status", "public")
    .eq("status", "approved")
    .not("creator_id", "is", null);

  for (const row of publicGames ?? []) {
    const creatorId = row.creator_id as string;
    creatorCounts.set(creatorId, (creatorCounts.get(creatorId) ?? 0) + 1);
  }

  const creators: SearchCreatorResult[] = [];
  const seenCreatorIds = new Set<string>();

  for (const row of matchingProfiles ?? []) {
    const id = row.id as string;
    const gameCount = creatorCounts.get(id) ?? 0;
    if (gameCount === 0) continue;

    creators.push({
      id,
      displayName: row.display_name as string,
      avatarUrl: (row.avatar_url as string | null) ?? null,
      gameCount,
      equippedTitle: null,
    });
    seenCreatorIds.add(id);
  }

  for (const game of games) {
    if (!game.creatorId || seenCreatorIds.has(game.creatorId)) continue;
    if (!game.creator.toLowerCase().includes(normalized)) continue;

    const gameCount = creatorCounts.get(game.creatorId) ?? 0;
    if (gameCount === 0) continue;

    creators.push({
      id: game.creatorId,
      displayName: game.creator,
      avatarUrl: null,
      gameCount,
      equippedTitle: null,
    });
    seenCreatorIds.add(game.creatorId);
  }

  const slicedCreators = creators.slice(0, 8);
  const titleMap = await resolveEquippedTitles(
    supabase,
    slicedCreators.map((creator) => creator.id)
  );

  return {
    query,
    games,
    creators: slicedCreators.map((creator) => ({
      ...creator,
      equippedTitle: titleMap.get(creator.id) ?? null,
    })),
  };
}
