import type { SupabaseClient } from "@supabase/supabase-js";
import { mapRecordToGame } from "@/lib/games-data";
import type { Game } from "@/lib/games";
import { createServerSupabase } from "@/lib/supabase-server";

export async function isGameFavorited(
  supabase: SupabaseClient,
  userId: string,
  gameId: number
) {
  const { data, error } = await supabase
    .from("user_game_favorites")
    .select("game_id")
    .eq("user_id", userId)
    .eq("game_id", gameId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function addGameFavorite(
  supabase: SupabaseClient,
  userId: string,
  gameId: number
) {
  const { error } = await supabase.from("user_game_favorites").upsert({
    user_id: userId,
    game_id: gameId,
  });

  if (error) throw new Error(error.message);
}

export async function removeGameFavorite(
  supabase: SupabaseClient,
  userId: string,
  gameId: number
) {
  const { error } = await supabase
    .from("user_game_favorites")
    .delete()
    .eq("user_id", userId)
    .eq("game_id", gameId);

  if (error) throw new Error(error.message);
}

export async function listFavoriteGames(userId: string): Promise<Game[]> {
  const supabase = createServerSupabase();

  const { data: favorites, error: favoritesError } = await supabase
    .from("user_game_favorites")
    .select("game_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (favoritesError) throw new Error(favoritesError.message);
  if (!favorites?.length) return [];

  const gameIds = favorites.map((row) => row.game_id as number);
  const { data: games, error: gamesError } = await supabase
    .from("games")
    .select("*")
    .in("id", gameIds)
    .eq("publish_status", "public")
    .eq("status", "approved");

  if (gamesError) throw new Error(gamesError.message);

  const gameMap = new Map(
    (games ?? []).map((game) => [game.id as number, mapRecordToGame(game)])
  );

  return gameIds
    .map((id) => gameMap.get(id))
    .filter((game): game is Game => Boolean(game));
}

export async function readGameFavoriteCount(gameId: number) {
  const supabase = createServerSupabase();
  const { count, error } = await supabase
    .from("user_game_favorites")
    .select("*", { count: "exact", head: true })
    .eq("game_id", gameId);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function readGameFavoriteCounts(gameIds: number[]) {
  const counts: Record<number, number> = {};
  if (gameIds.length === 0) return counts;

  for (const id of gameIds) {
    counts[id] = 0;
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("user_game_favorites")
    .select("game_id")
    .in("game_id", gameIds);

  if (error) throw new Error(error.message);

  for (const row of data ?? []) {
    const gameId = row.game_id as number;
    counts[gameId] = (counts[gameId] ?? 0) + 1;
  }

  return counts;
}
