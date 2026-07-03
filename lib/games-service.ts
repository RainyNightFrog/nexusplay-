import { createServerSupabase } from "@/lib/supabase-server";
import { mapRecordToGame } from "@/lib/games-data";
import type { Game } from "@/lib/games";

export async function getGames(): Promise<Game[]> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`讀取遊戲列表失敗：${error.message}`);
  }

  return (data ?? []).map(mapRecordToGame);
}

export async function getGameById(id: number): Promise<Game | null> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`讀取遊戲失敗：${error.message}`);
  }

  return data ? mapRecordToGame(data) : null;
}
