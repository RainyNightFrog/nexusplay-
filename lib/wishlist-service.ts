import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase-server";
import { mapRecordToGame } from "@/lib/games-data";
import type { Game } from "@/lib/games";

export async function isGameWishlisted(
  supabase: SupabaseClient,
  userId: string,
  gameId: number
) {
  const { data, error } = await supabase
    .from("game_wishlists")
    .select("game_id")
    .eq("user_id", userId)
    .eq("game_id", gameId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function addGameWishlist(
  supabase: SupabaseClient,
  userId: string,
  gameId: number
) {
  const { error } = await supabase.from("game_wishlists").upsert({
    user_id: userId,
    game_id: gameId,
  });

  if (error) throw new Error(error.message);
}

export async function removeGameWishlist(
  supabase: SupabaseClient,
  userId: string,
  gameId: number
) {
  const { error } = await supabase
    .from("game_wishlists")
    .delete()
    .eq("user_id", userId)
    .eq("game_id", gameId);

  if (error) throw new Error(error.message);
}

export async function toggleGameWishlist(
  supabase: SupabaseClient,
  userId: string,
  gameId: number
) {
  const wishlisted = await isGameWishlisted(supabase, userId, gameId);
  if (wishlisted) {
    await removeGameWishlist(supabase, userId, gameId);
    return { wishlisted: false };
  }
  await addGameWishlist(supabase, userId, gameId);
  return { wishlisted: true };
}

export async function listWishlistGames(userId: string): Promise<Game[]> {
  const supabase = createServerSupabase();

  const { data: rows, error } = await supabase
    .from("game_wishlists")
    .select("game_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!rows?.length) return [];

  const gameIds = rows.map((row) => row.game_id as number);
  const { data: games, error: gamesError } = await supabase
    .from("games")
    .select("*")
    .in("id", gameIds);

  if (gamesError) throw new Error(gamesError.message);

  const gameMap = new Map(
    (games ?? []).map((game) => [game.id as number, mapRecordToGame(game)])
  );

  return gameIds
    .map((id) => gameMap.get(id))
    .filter((game): game is Game => Boolean(game));
}

export async function listWishlistUserIdsForGame(gameId: number) {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("game_wishlists")
    .select("user_id")
    .eq("game_id", gameId);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.user_id as string);
}

export async function readGameWishlistCount(gameId: number) {
  const supabase = createServerSupabase();
  const { count, error } = await supabase
    .from("game_wishlists")
    .select("*", { count: "exact", head: true })
    .eq("game_id", gameId);

  if (error) throw new Error(error.message);
  return count ?? 0;
}
