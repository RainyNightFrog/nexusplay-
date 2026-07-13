import { unstable_cache } from "next/cache";
import { resolveGameRecordByRouteParam } from "@/lib/game-slug";
import { createServerSupabase } from "@/lib/supabase-server";
import { mapRecordToGame } from "@/lib/games-data";
import type { Game, SortOption } from "@/lib/games";
import type { GamePriceFilterParams } from "@/lib/game-price-filter";

export type GetGamesOptions = {
  category?: string;
  sort?: SortOption;
  priceFilter?: GamePriceFilterParams;
  tags?: string[];
};

const VALID_SORTS: SortOption[] = ["latest", "views", "rating"];

/** 首頁列表不需 gallery / devlog / details_html，避免每次刷新拉大量 JSON */
const GAME_LIST_SELECT =
  "id, title, slug, description, category, cover_url, game_url, creator_id, created_at, plays_count, rating_avg, publish_status, tips_enabled, suggested_tip_amount, status, tags, viewport_width, viewport_height, fullscreen_button, ai_disclosed, ai_content_types, price, currency, pricing_type, min_price, on_sale, is_featured, featured_badge, featured_sort";

export function parseSortOption(value: string | null): SortOption {
  if (value && VALID_SORTS.includes(value as SortOption)) {
    return value as SortOption;
  }
  return "latest";
}

function buildGamesCacheKey(options: GetGamesOptions) {
  const { category, sort = "latest", priceFilter = {}, tags = [] } = options;
  return JSON.stringify({ category, sort, priceFilter, tags });
}

/** 開發環境用記憶體快取，避免 unstable_cache 在 HMR 後反覆打 DB */
const devGamesCache = new Map<string, { data: Game[]; expiresAt: number }>();
const DEV_GAMES_CACHE_TTL_MS = 20_000;

async function getGamesWithDevCache(
  cacheKey: string,
  options: GetGamesOptions
): Promise<Game[]> {
  const hit = devGamesCache.get(cacheKey);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.data;
  }

  const data = await queryGamesFromDb(options);
  devGamesCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + DEV_GAMES_CACHE_TTL_MS,
  });
  return data;
}

async function queryGamesFromDb(options: GetGamesOptions = {}): Promise<Game[]> {
  const { category, sort = "latest", priceFilter = {}, tags = [] } = options;
  const supabase = createServerSupabase();

  let query = supabase
    .from("games")
    .select(GAME_LIST_SELECT)
    .eq("publish_status", "public")
    .eq("status", "approved");

  if (category && category !== "全部") {
    query = query.eq("category", category);
  }

  for (const tag of tags) {
    query = query.contains("tags", [tag]);
  }

  if (priceFilter.isFree) {
    query = query.or("pricing_type.eq.free,price.eq.0");
  }

  if (priceFilter.minPrice != null) {
    query = query.gte("price", priceFilter.minPrice);
  }

  if (priceFilter.maxPrice != null) {
    if (priceFilter.excludeFree) {
      const max = priceFilter.maxPrice;
      query = query.or(
        `and(pricing_type.eq.fixed,price.gte.1,price.lte.${max}),and(pricing_type.eq.pwyw,min_price.gte.1,min_price.lte.${max})`
      );
    } else {
      query = query.lte("price", priceFilter.maxPrice);
    }
  }

  if (priceFilter.onSale) {
    query = query.eq("on_sale", true);
  }

  switch (sort) {
    case "views":
      query = query.order("plays_count", { ascending: false });
      break;
    case "rating":
      query = query.order("rating_avg", { ascending: false });
      break;
    default:
      query = query
        .order("is_featured", { ascending: false })
        .order("featured_sort", { ascending: false })
        .order("created_at", { ascending: false });
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

export async function getGames(options: GetGamesOptions = {}): Promise<Game[]> {
  const cacheKey = buildGamesCacheKey(options);

  if (process.env.NODE_ENV === "development") {
    return getGamesWithDevCache(cacheKey, options);
  }

  return unstable_cache(() => queryGamesFromDb(options), ["games-list", cacheKey], {
    revalidate: 60,
    tags: ["games"],
  })();
}

export async function getPublicGameById(id: number): Promise<Game | null> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("id", id)
    .eq("publish_status", "public")
    .eq("status", "approved")
    .maybeSingle();

  if (error) {
    throw new Error(`讀取遊戲失敗：${error.message}`);
  }

  return data ? mapRecordToGame(data) : null;
}

export async function getPublicGameByRouteParam(
  param: string
): Promise<Game | null> {
  const supabase = createServerSupabase();
  const { record } = await resolveGameRecordByRouteParam(supabase, param);

  if (
    !record ||
    record.publish_status !== "public" ||
    record.status !== "approved"
  ) {
    return null;
  }

  return mapRecordToGame(record);
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
  const { error } = await supabase.rpc("increment_game_plays", {
    p_game_id: id,
  });

  if (error) {
    const { data: current } = await supabase
      .from("games")
      .select("plays_count")
      .eq("id", id)
      .maybeSingle();

    if (!current) return;

    const nextCount = (current.plays_count ?? 0) + 1;
    await supabase.from("games").update({ plays_count: nextCount }).eq("id", id);
  }
}
