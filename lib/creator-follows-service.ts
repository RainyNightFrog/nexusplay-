import { mapRecordToGame } from "@/lib/games-data";
import type { Game } from "@/lib/games";
import { resolveEquippedTitles } from "@/lib/equipped-title-service";
import type { EquippedTitle } from "@/lib/titles";
import { createServerSupabase } from "@/lib/supabase-server";
import type { SupabaseClient } from "@supabase/supabase-js";

export type FollowedCreator = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  followedAt: string;
  equippedTitle: EquippedTitle | null;
};

export async function readCreatorFollowerCount(creatorId: string) {
  const supabase = createServerSupabase();
  const { count, error } = await supabase
    .from("creator_follows")
    .select("*", { count: "exact", head: true })
    .eq("creator_id", creatorId);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function isFollowingCreator(
  supabase: SupabaseClient,
  followerId: string,
  creatorId: string
) {
  const { data, error } = await supabase
    .from("creator_follows")
    .select("creator_id")
    .eq("follower_id", followerId)
    .eq("creator_id", creatorId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function followCreator(
  supabase: SupabaseClient,
  followerId: string,
  creatorId: string
) {
  if (followerId === creatorId) {
    throw new Error("無法追蹤自己");
  }

  const { error } = await supabase.from("creator_follows").upsert({
    follower_id: followerId,
    creator_id: creatorId,
  });

  if (error) throw new Error(error.message);
}

export async function unfollowCreator(
  supabase: SupabaseClient,
  followerId: string,
  creatorId: string
) {
  const { error } = await supabase
    .from("creator_follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("creator_id", creatorId);

  if (error) throw new Error(error.message);
}

export async function listFollowedCreators(
  followerId: string
): Promise<FollowedCreator[]> {
  const supabase = createServerSupabase();

  const { data: follows, error: followsError } = await supabase
    .from("creator_follows")
    .select("creator_id, created_at")
    .eq("follower_id", followerId)
    .order("created_at", { ascending: false });

  if (followsError) throw new Error(followsError.message);
  if (!follows?.length) return [];

  const creatorIds = follows.map((row) => row.creator_id as string);
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", creatorIds);

  if (profilesError) throw new Error(profilesError.message);

  const profileMap = new Map(
    (profiles ?? []).map((profile) => [profile.id as string, profile])
  );

  const titleMap = await resolveEquippedTitles(supabase, creatorIds);

  return follows
    .map((row) => {
      const profile = profileMap.get(row.creator_id as string);
      if (!profile) return null;
      return {
        id: profile.id as string,
        displayName: profile.display_name as string,
        avatarUrl: (profile.avatar_url as string | null) ?? null,
        followedAt: row.created_at as string,
        equippedTitle: titleMap.get(profile.id as string) ?? null,
      };
    })
    .filter((item): item is FollowedCreator => Boolean(item));
}

export async function listFollowedCreatorRecentGames(
  followerId: string,
  limit = 8
): Promise<Game[]> {
  const supabase = createServerSupabase();

  const { data: follows, error: followsError } = await supabase
    .from("creator_follows")
    .select("creator_id")
    .eq("follower_id", followerId);

  if (followsError) throw new Error(followsError.message);
  if (!follows?.length) return [];

  const creatorIds = follows.map((row) => row.creator_id as string);

  const { data: games, error: gamesError } = await supabase
    .from("games")
    .select("*")
    .in("creator_id", creatorIds)
    .eq("publish_status", "public")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (gamesError) throw new Error(gamesError.message);

  return (games ?? []).map((game) => mapRecordToGame(game));
}
