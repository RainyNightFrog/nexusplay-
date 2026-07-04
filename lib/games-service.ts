import { createServerSupabase } from "@/lib/supabase-server";
import { mapRecordToGame } from "@/lib/games-data";
import type { Game, SortOption } from "@/lib/games";

export type GetGamesOptions = {
  category?: string;
  sort?: SortOption;
};

const VALID_SORTS: SortOption[] = ["latest", "views", "rating"];

export function parseSortOption(value: string | null): SortOption {
  if (value && VALID_SORTS.includes(value as SortOption)) {
    return value as SortOption;
  }
  return "latest";
}

export async function getGames(options: GetGamesOptions = {}): Promise<Game[]> {
  const { category, sort = "latest" } = options;
  const supabase = createServerSupabase();

  let query = supabase.from("games").select("*").eq("publish_status", "public");

  if (category && category !== "全部") {
    query = query.eq("category", category);
  }

  switch (sort) {
    case "views":
      query = query.order("plays_count", { ascending: false });
      break;
    case "rating":
      query = query.order("rating_avg", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`讀取遊戲列表失敗：${error.message}`);
  }

  return (data ?? []).map(mapRecordToGame).sort((a, b) => {
    const aFeatured = a.featured ? 1 : 0;
    const bFeatured = b.featured ? 1 : 0;
    if (aFeatured !== bFeatured) return bFeatured - aFeatured;
    return 0;
  });
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

export async function incrementGamePlays(id: number): Promise<void> {
  const supabase = createServerSupabase();
  const { data: current, error: readError } = await supabase
    .from("games")
    .select("plays_count")
    .eq("id", id)
    .maybeSingle();

  if (readError || !current) {
    return;
  }

  const nextCount = (current.plays_count ?? 0) + 1;
  await supabase.from("games").update({ plays_count: nextCount }).eq("id", id);
}
