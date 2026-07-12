import { createServerSupabase } from "@/lib/supabase-server";

export type AdminCurationGameRecord = {
  id: number;
  title: string;
  coverUrl: string;
  category: string;
  publishStatus: string;
  status: string;
  isFeatured: boolean;
  featuredBadge: string | null;
  featuredSort: number;
  playsCount: number;
};

export async function listAdminCurationGames(): Promise<AdminCurationGameRecord[]> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("games")
    .select(
      "id, title, cover_url, category, publish_status, status, is_featured, featured_badge, featured_sort, plays_count"
    )
    .eq("status", "approved")
    .order("is_featured", { ascending: false })
    .order("featured_sort", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((game) => ({
    id: game.id as number,
    title: game.title as string,
    coverUrl: game.cover_url as string,
    category: game.category as string,
    publishStatus: game.publish_status as string,
    status: game.status as string,
    isFeatured: game.is_featured === true,
    featuredBadge: (game.featured_badge as string | null) ?? null,
    featuredSort: (game.featured_sort as number) ?? 0,
    playsCount: (game.plays_count as number) ?? 0,
  }));
}

export async function updateAdminGameCuration(params: {
  gameId: number;
  isFeatured?: boolean;
  featuredBadge?: string | null;
  featuredSort?: number;
  publishStatus?: "draft" | "public";
}) {
  const supabase = createServerSupabase();
  const patch: Record<string, unknown> = {};

  if (params.isFeatured != null) patch.is_featured = params.isFeatured;
  if (params.featuredBadge !== undefined) {
    patch.featured_badge = params.featuredBadge?.trim() || null;
  }
  if (params.featuredSort != null) patch.featured_sort = params.featuredSort;
  if (params.publishStatus) patch.publish_status = params.publishStatus;

  const { data, error } = await supabase
    .from("games")
    .update(patch)
    .eq("id", params.gameId)
    .select(
      "id, title, cover_url, category, publish_status, status, is_featured, featured_badge, featured_sort, plays_count"
    )
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("找不到此遊戲");

  return {
    id: data.id as number,
    title: data.title as string,
    coverUrl: data.cover_url as string,
    category: data.category as string,
    publishStatus: data.publish_status as string,
    status: data.status as string,
    isFeatured: data.is_featured === true,
    featuredBadge: (data.featured_badge as string | null) ?? null,
    featuredSort: (data.featured_sort as number) ?? 0,
    playsCount: (data.plays_count as number) ?? 0,
  };
}
