import { createServerSupabase } from "@/lib/supabase-server";
import { GAME_GENRES, GAME_TAGS } from "@/lib/game-metadata";

const STATIC_FALLBACK = [...GAME_GENRES.slice(0, 6), ...GAME_TAGS.slice(0, 6)];

function parseTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export async function getPopularSearchTerms(limit = 12): Promise<string[]> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("games")
    .select("title, category, tags, plays_count")
    .eq("publish_status", "public")
    .eq("status", "approved")
    .order("plays_count", { ascending: false })
    .limit(40);

  if (error) {
    console.error("[popular-search]", error.message);
    return STATIC_FALLBACK.slice(0, limit);
  }

  const scores = new Map<string, number>();

  for (const row of data ?? []) {
    const weight = Math.max(1, Number(row.plays_count ?? 0));
    const category = typeof row.category === "string" ? row.category.trim() : "";
    if (category) {
      scores.set(category, (scores.get(category) ?? 0) + weight * 2);
    }

    for (const tag of parseTags(row.tags)) {
      scores.set(tag, (scores.get(tag) ?? 0) + weight);
    }

    const title = typeof row.title === "string" ? row.title.trim() : "";
    if (title) {
      scores.set(title, (scores.get(title) ?? 0) + weight * 0.5);
    }
  }

  const ranked = [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([term]) => term);

  if (ranked.length >= limit) {
    return ranked.slice(0, limit);
  }

  const merged = [...ranked];
  for (const fallback of STATIC_FALLBACK) {
    if (merged.length >= limit) break;
    if (!merged.includes(fallback)) merged.push(fallback);
  }

  return merged.slice(0, limit);
}
