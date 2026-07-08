import { getAmbientUserPlayerMap } from "@/lib/ambient-user-index";
import { getVirtualPlayerActivityStats } from "@/lib/platform-leaderboard-virtual";
import { isUserOnline } from "@/lib/platform-leaderboard";
import { resolveEquippedTitleForUser } from "@/lib/equipped-title-service";
import { getVirtualPlayerAvatarUrl } from "@/lib/virtual-player-avatar";
import { getVirtualPlayerSocialStats } from "@/lib/virtual-player-public-profile";
import { getVirtualPlayerById } from "@/lib/virtual-players";
import type { EquippedTitle } from "@/lib/titles";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ChatPlayerAchievementHighlight = {
  id: string;
  title: string;
  badge_icon: string;
};

export type ChatPlayerPublicProfile = {
  userId: string | null;
  virtualPlayerId: string | null;
  displayName: string;
  avatarUrl: string | null;
  equippedTitle: EquippedTitle | null;
  isCreator: boolean;
  isVirtual: boolean;
  isOnline: boolean;
  website: string | null;
  profilePublic: boolean;
  achievementCount: number;
  achievementHighlights: ChatPlayerAchievementHighlight[];
  forumPostCount: number;
  donatedTotal: number;
  tipsReceivedCount: number;
  publishedGames: number;
  onlineSeconds: number;
  playSeconds: number;
  lastActiveAt: string | null;
};

function readBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function readOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function loadRealUserProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<ChatPlayerPublicProfile | null> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, role")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) throw new Error(profileError.message);
  if (!profile) return null;

  const { data: authData, error: authError } =
    await supabase.auth.admin.getUserById(userId);
  if (authError) throw new Error(authError.message);

  const metadata = authData.user?.user_metadata ?? {};
  const profilePublic = readBoolean(metadata.profile_public, true);
  const website = profilePublic ? readOptionalString(metadata.website) : null;

  const [
    activityRes,
    achievementsRes,
    achievementCountRes,
    forumPostsRes,
    publishedGamesRes,
    tipsReceivedRes,
    equippedTitle,
  ] = await Promise.all([
    supabase
      .from("user_activity_stats")
      .select(
        "total_online_time, total_play_time, total_donated, last_active_at"
      )
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("user_achievements")
      .select("achievement_id, unlocked_at")
      .eq("user_id", userId)
      .order("unlocked_at", { ascending: false })
      .limit(5),
    supabase
      .from("user_achievements")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("forum_posts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("games")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", userId)
      .eq("publish_status", "public")
      .eq("status", "approved"),
    supabase
      .from("game_tips")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", userId)
      .eq("status", "succeeded"),
    resolveEquippedTitleForUser(supabase, userId),
  ]);

  const activity = activityRes.data;
  const lastActiveAt = activity?.last_active_at ?? null;
  const achievementRows = achievementsRes.data ?? [];
  const achievementIds = achievementRows.map((row) => row.achievement_id as string);

  let achievementHighlights: ChatPlayerAchievementHighlight[] = [];
  if (achievementIds.length > 0) {
    const { data: achievementMeta } = await supabase
      .from("achievements")
      .select("id, title, badge_icon")
      .in("id", achievementIds);

    const metaMap = new Map(
      (achievementMeta ?? []).map((row) => [row.id as string, row])
    );
    achievementHighlights = achievementIds
      .map((id) => metaMap.get(id))
      .filter((row): row is { id: string; title: string; badge_icon: string } =>
        Boolean(row)
      )
      .map((row) => ({
        id: row.id,
        title: row.title,
        badge_icon: row.badge_icon,
      }));
  }

  return {
    userId,
    virtualPlayerId: null,
    displayName: profile.display_name?.trim() || "匿名玩家",
    avatarUrl: profile.avatar_url ?? null,
    equippedTitle,
    isCreator: profile.role === "creator",
    isVirtual: false,
    isOnline: lastActiveAt ? isUserOnline(lastActiveAt) : false,
    website,
    profilePublic,
    achievementCount: achievementCountRes.count ?? achievementHighlights.length,
    achievementHighlights,
    forumPostCount: forumPostsRes.count ?? 0,
    donatedTotal: Number(activity?.total_donated ?? 0),
    tipsReceivedCount: tipsReceivedRes.count ?? 0,
    publishedGames: publishedGamesRes.count ?? 0,
    onlineSeconds: activity?.total_online_time ?? 0,
    playSeconds: activity?.total_play_time ?? 0,
    lastActiveAt,
  };
}

async function loadVirtualPlayerProfile(
  supabase: SupabaseClient,
  virtualPlayerId: string
): Promise<ChatPlayerPublicProfile | null> {
  const player = getVirtualPlayerById(virtualPlayerId);
  if (!player) return null;

  const activity = getVirtualPlayerActivityStats(virtualPlayerId);
  const social = getVirtualPlayerSocialStats(virtualPlayerId);
  if (!activity || !social) return null;

  const ambientMap = await getAmbientUserPlayerMap(supabase);
  let isCreator = social.isCreator;
  for (const [userId, playerId] of ambientMap.entries()) {
    if (playerId !== virtualPlayerId) continue;
    const { data: row } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    if (row?.role === "creator") {
      isCreator = true;
      break;
    }
  }

  return {
    userId: null,
    virtualPlayerId,
    displayName: player.displayName,
    avatarUrl: getVirtualPlayerAvatarUrl(virtualPlayerId),
    equippedTitle: null,
    isCreator,
    isVirtual: true,
    isOnline: activity.isOnline,
    website: social.website,
    profilePublic: true,
    achievementCount: social.achievementCount,
    achievementHighlights: social.achievementHighlights.map((title, index) => ({
      id: `virtual-${virtualPlayerId}-${index}`,
      title,
      badge_icon: "🏅",
    })),
    forumPostCount: social.forumPostCount,
    donatedTotal: social.donatedTotal,
    tipsReceivedCount: social.tipsReceivedCount,
    publishedGames: social.publishedGames,
    onlineSeconds: activity.onlineSeconds,
    playSeconds: activity.playSeconds,
    lastActiveAt: activity.lastActiveAt,
  };
}

export async function getChatPlayerPublicProfile(
  supabase: SupabaseClient,
  options: { userId?: string | null; virtualPlayerId?: string | null }
): Promise<ChatPlayerPublicProfile | null> {
  if (options.virtualPlayerId) {
    return loadVirtualPlayerProfile(supabase, options.virtualPlayerId);
  }

  if (options.userId) {
    const ambientMap = await getAmbientUserPlayerMap(supabase);
    const virtualPlayerId = ambientMap.get(options.userId);
    if (virtualPlayerId) {
      return loadVirtualPlayerProfile(supabase, virtualPlayerId);
    }
    return loadRealUserProfile(supabase, options.userId);
  }

  return null;
}
