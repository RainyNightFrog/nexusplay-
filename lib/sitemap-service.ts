import { createServerSupabase } from "@/lib/supabase-server";

export type SitemapGameEntry = {
  id: number;
  updatedAt: string | null;
};

export async function listPublicSitemapGames(): Promise<SitemapGameEntry[]> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("games")
    .select("id, updated_at")
    .eq("publish_status", "public")
    .eq("status", "approved")
    .order("updated_at", { ascending: false })
    .limit(500);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id as number,
    updatedAt: (row.updated_at as string | null) ?? null,
  }));
}

export async function listPublicSitemapCreatorIds(): Promise<string[]> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("games")
    .select("creator_id")
    .eq("publish_status", "public")
    .eq("status", "approved")
    .not("creator_id", "is", null);

  if (error) throw new Error(error.message);

  return [...new Set((data ?? []).map((row) => row.creator_id as string))];
}
