import { createServerSupabase } from "@/lib/supabase-server";

export type PublicCreatorProfile = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  website: string | null;
  twitter: string | null;
  createdAt: string;
  games: Array<{
    id: number;
    title: string;
    description: string;
    category: string;
    coverUrl: string;
    playsCount: number;
    ratingAvg: number;
    tipsEnabled: boolean;
  }>;
};

function readOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function loadPublicCreatorProfile(
  creatorId: string
): Promise<PublicCreatorProfile | null> {
  const supabase = createServerSupabase();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, role, created_at")
    .eq("id", creatorId)
    .maybeSingle();

  if (profileError) throw new Error(profileError.message);
  if (!profile) return null;

  const { data: authData, error: authError } =
    await supabase.auth.admin.getUserById(creatorId);

  if (authError) throw new Error(authError.message);

  const metadata = authData.user?.user_metadata ?? {};
  const profilePublic = metadata.profile_public !== false;
  const developingGames =
    metadata.developing_games === true || profile.role === "creator";

  if (!profilePublic || !developingGames) return null;

  const { data: games, error: gamesError } = await supabase
    .from("games")
    .select(
      "id, title, description, category, cover_url, plays_count, rating_avg, tips_enabled, publish_status, status"
    )
    .eq("creator_id", creatorId)
    .eq("publish_status", "public")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (gamesError) throw new Error(gamesError.message);

  return {
    id: profile.id,
    displayName: profile.display_name,
    avatarUrl: profile.avatar_url,
    website: readOptionalString(metadata.website),
    twitter: readOptionalString(metadata.twitter),
    createdAt: profile.created_at,
    games: (games ?? []).map((game) => ({
      id: game.id,
      title: game.title,
      description: game.description,
      category: game.category,
      coverUrl: game.cover_url,
      playsCount: game.plays_count ?? 0,
      ratingAvg: Number(game.rating_avg ?? 0),
      tipsEnabled: game.tips_enabled === true,
    })),
  };
}
