import { GAME_GENRES, type GameGenre } from "@/lib/game-metadata";
import { createServerSupabase } from "@/lib/supabase-server";

export type FeedStats = {
  platformGames: number;
  forumPostsWeek: number;
  categories: Array<{ category: GameGenre; gameCount: number }>;
};

const STATS_FORUM_DAYS = 7;

export async function getFeedStats(): Promise<FeedStats> {
  const supabase = createServerSupabase();
  const since = new Date(
    Date.now() - STATS_FORUM_DAYS * 86_400_000
  ).toISOString();

  const [gamesResult, forumResult, ...categoryResults] = await Promise.all([
    supabase
      .from("games")
      .select("id", { count: "exact", head: true })
      .eq("publish_status", "public")
      .eq("status", "approved"),
    supabase
      .from("forum_posts")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since),
    ...GAME_GENRES.map((category) =>
      supabase
        .from("games")
        .select("id", { count: "exact", head: true })
        .eq("category", category)
        .eq("publish_status", "public")
        .eq("status", "approved")
    ),
  ]);

  if (gamesResult.error) throw new Error(gamesResult.error.message);
  if (forumResult.error) throw new Error(forumResult.error.message);

  const categories = GAME_GENRES.map((category, index) => {
    const result = categoryResults[index];
    if (result.error) throw new Error(result.error.message);
    return {
      category,
      gameCount: result.count ?? 0,
    };
  });

  return {
    platformGames: gamesResult.count ?? 0,
    forumPostsWeek: forumResult.count ?? 0,
    categories,
  };
}
