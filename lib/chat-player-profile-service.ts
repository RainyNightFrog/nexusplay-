import type { DonationPrivacyTier } from "@/lib/platform-leaderboard";
import { resolvePlayerLeaderboardRanks } from "@/lib/platform-leaderboard-ranks";
import {
  parseProfileShowcaseTags,
  resolveProfileShowcaseTags,
  type ProfileShowcaseTagId,
  type ProfileShowcaseTagPayload,
} from "@/lib/profile-showcase-tags";
import {
  getAmbientUserPlayerMap,
  getAmbientUserIdForVirtualPlayer,
} from "@/lib/ambient-user-index";
import {
  maskDonationTotalForProfile,
  resolveDonationTier,
} from "@/lib/activity-stats-masking";
import {
  getVirtualPlayerActivityStats,
  isVirtualLeaderboardUserId,
  VIRTUAL_LEADERBOARD_USER_PREFIX,
} from "@/lib/platform-leaderboard-virtual";
import { isUserOnline } from "@/lib/platform-leaderboard";
import { getUserContributionHkd } from "@/lib/platform-leaderboard-service";
import { resolveEquippedTitleForUser } from "@/lib/equipped-title-service";
import { resolveVirtualPlayerAvatarUrl } from "@/lib/virtual-player-avatar";
import { getVirtualPlayerSocialStats } from "@/lib/virtual-player-public-profile";
import {
  getCountryCodeFromHeaders,
  getVirtualPlayerCountryCode,
} from "@/lib/request-geo";
import { getVirtualPlayerById } from "@/lib/virtual-players";
import { getVirtualPlayerBio } from "@/lib/virtual-player-bios";
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
  playerNumber: number | null;
  displayName: string;
  avatarUrl: string | null;
  equippedTitle: EquippedTitle | null;
  isCreator: boolean;
  isVirtual: boolean;
  isOnline: boolean;
  bio: string | null;
  website: string | null;
  profilePublic: boolean;
  achievementCount: number;
  achievementHighlights: ChatPlayerAchievementHighlight[];
  forumPostCount: number;
  donatedTotal: number | null;
  donationTier?: DonationPrivacyTier;
  followerCount: number;
  publishedGames: number;
  onlineSeconds: number;
  playSeconds: number;
  lastActiveAt: string | null;
  countryCode: string | null;
  isSupporter: boolean;
  showcaseTags: ProfileShowcaseTagPayload[];
};

function readBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function readOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readCountryCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : null;
}

async function loadRealUserProfile(
  supabase: SupabaseClient,
  userId: string,
  viewer?: { userId?: string | null; isAdmin?: boolean }
): Promise<ChatPlayerPublicProfile | null> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, role, bio, player_number, is_supporter")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) throw new Error(profileError.message);
  if (!profile) return null;

  const { data: authData, error: authError } =
    await supabase.auth.admin.getUserById(userId);
  if (authError) throw new Error(authError.message);

  const metadata = authData.user?.user_metadata ?? {};
  const profilePublic = readBoolean(metadata.profile_public, true);
  const bio = profilePublic
    ? readOptionalString(profile.bio) ?? readOptionalString(metadata.bio)
    : null;
  const website = profilePublic ? readOptionalString(metadata.website) : null;
  const countryCode = readCountryCode(metadata.country_code);

  const [
    activityRes,
    achievementsRes,
    achievementCountRes,
    forumPostsRes,
    publishedGamesRes,
    followerCountRes,
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
      .select("achievement_id", { count: "exact", head: true })
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
      .from("creator_follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("creator_id", userId),
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

  const rawDonated = await getUserContributionHkd(supabase, userId);
  const revealDonation = maskDonationTotalForProfile(rawDonated, {
    isSelf: viewer?.userId === userId,
    isAdmin: viewer?.isAdmin,
  });

  return {
    userId,
    virtualPlayerId: null,
    playerNumber:
      typeof profile.player_number === "number"
        ? profile.player_number
        : profile.player_number != null
          ? Number(profile.player_number) || null
          : null,
    displayName: profile.display_name?.trim() || "匿名玩家",
    avatarUrl: profile.avatar_url ?? null,
    equippedTitle,
    isCreator: profile.role === "creator",
    isVirtual: false,
    isOnline: lastActiveAt ? isUserOnline(lastActiveAt) : false,
    bio,
    website,
    profilePublic,
    achievementCount: achievementCountRes.count ?? achievementHighlights.length,
    achievementHighlights,
    forumPostCount: forumPostsRes.count ?? 0,
    donatedTotal: revealDonation,
    donationTier: resolveDonationTier(rawDonated),
    followerCount: followerCountRes.count ?? 0,
    publishedGames: publishedGamesRes.count ?? 0,
    onlineSeconds: activity?.total_online_time ?? 0,
    playSeconds: activity?.total_play_time ?? 0,
    lastActiveAt,
    countryCode,
    isSupporter: profile.is_supporter === true,
    showcaseTags: [],
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
    playerNumber: null,
    displayName: player.displayName,
    avatarUrl: resolveVirtualPlayerAvatarUrl(virtualPlayerId),
    equippedTitle: null,
    isCreator,
    isVirtual: true,
    isOnline: activity.isOnline,
    bio: getVirtualPlayerBio(virtualPlayerId),
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
    followerCount: social.followerCount,
    publishedGames: social.publishedGames,
    onlineSeconds: activity.onlineSeconds,
    playSeconds: activity.playSeconds,
    lastActiveAt: activity.lastActiveAt,
    countryCode: getVirtualPlayerCountryCode(virtualPlayerId),
    isSupporter: social.donatedTotal > 0,
    showcaseTags: [],
  };
}

async function loadProfileShowcasePreferences(
  supabase: SupabaseClient,
  userId: string | null | undefined
): Promise<ProfileShowcaseTagId[] | null> {
  if (!userId) return null;

  const { data: authData, error: authError } =
    await supabase.auth.admin.getUserById(userId);
  if (authError) throw new Error(authError.message);

  return parseProfileShowcaseTags(
    authData.user?.user_metadata?.profile_showcase_tags
  );
}

async function enrichProfileWithShowcaseTags(
  supabase: SupabaseClient,
  profile: ChatPlayerPublicProfile,
  options: {
    viewerUserId?: string | null;
    viewerIsAdmin?: boolean;
    showcasePreferences?: ProfileShowcaseTagId[] | null;
  }
): Promise<ChatPlayerPublicProfile> {
  const [ranks, showcasePreferences] = await Promise.all([
    resolvePlayerLeaderboardRanks(supabase, {
      userId: profile.userId,
      virtualPlayerId: profile.virtualPlayerId,
      viewerUserId: options.viewerUserId,
      viewerIsAdmin: options.viewerIsAdmin,
    }),
    options.showcasePreferences !== undefined
      ? Promise.resolve(options.showcasePreferences)
      : loadProfileShowcasePreferences(supabase, profile.userId),
  ]);

  const showcaseTags = resolveProfileShowcaseTags(showcasePreferences, {
    ranks,
    isCreator: profile.isCreator,
    isVirtual: profile.isVirtual,
    isSupporter: profile.isSupporter,
    isOnline: profile.isOnline,
    achievementCount: profile.achievementCount,
    forumPostCount: profile.forumPostCount,
    followerCount: profile.followerCount,
    publishedGames: profile.publishedGames,
    countryCode: profile.countryCode,
    donationTier: profile.donationTier,
  });

  return { ...profile, showcaseTags };
}

export async function syncUserCountryFromRequest(
  supabase: SupabaseClient,
  userId: string,
  request: Request
): Promise<string | null> {
  const countryCode = getCountryCodeFromHeaders(request.headers);
  if (!countryCode) return null;

  const { data: authData, error: authError } =
    await supabase.auth.admin.getUserById(userId);
  if (authError) throw new Error(authError.message);

  const currentCode = readCountryCode(authData.user?.user_metadata?.country_code);
  if (currentCode === countryCode) return countryCode;

  const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...(authData.user?.user_metadata ?? {}),
      country_code: countryCode,
    },
  });
  if (updateError) throw new Error(updateError.message);

  return countryCode;
}

export async function getChatPlayerPublicProfile(
  supabase: SupabaseClient,
  options: {
    userId?: string | null;
    virtualPlayerId?: string | null;
    fallbackEquippedTitle?: EquippedTitle | null;
    viewerUserId?: string | null;
    viewerIsAdmin?: boolean;
  }
): Promise<ChatPlayerPublicProfile | null> {
  const viewer = {
    userId: options.viewerUserId,
    isAdmin: options.viewerIsAdmin,
  };
  let profile: ChatPlayerPublicProfile | null = null;

  let userId = options.userId?.trim() || null;
  let virtualPlayerId = options.virtualPlayerId?.trim() || null;

  if (userId && isVirtualLeaderboardUserId(userId)) {
    virtualPlayerId = virtualPlayerId ?? userId.slice(VIRTUAL_LEADERBOARD_USER_PREFIX.length);
    userId = null;
  }

  if (userId) {
    const ambientMap = await getAmbientUserPlayerMap(supabase);
    const mappedVirtualId = ambientMap.get(userId);
    if (mappedVirtualId) {
      profile = await loadVirtualPlayerProfile(
        supabase,
        virtualPlayerId ?? mappedVirtualId
      );
      const realProfile = await loadRealUserProfile(
        supabase,
        userId,
        viewer
      );
      if (profile) {
        const ambientUserId = await getAmbientUserIdForVirtualPlayer(
          supabase,
          virtualPlayerId ?? mappedVirtualId,
          { preferCreator: profile.isCreator }
        );
        profile = {
          ...profile,
          userId: ambientUserId ?? userId,
          ...(realProfile?.bio ? { bio: realProfile.bio } : {}),
        };
      }
    } else {
      profile = await loadRealUserProfile(supabase, userId, viewer);
    }
  }

  if (!profile && virtualPlayerId) {
    profile = await loadVirtualPlayerProfile(supabase, virtualPlayerId);
  }

  if (!profile) return null;

  if (profile.isVirtual && profile.virtualPlayerId && !profile.userId) {
    const ambientUserId = await getAmbientUserIdForVirtualPlayer(
      supabase,
      profile.virtualPlayerId,
      { preferCreator: profile.isCreator }
    );
    if (ambientUserId) {
      profile = { ...profile, userId: ambientUserId };
    }
  }

  if (!profile.equippedTitle && options.fallbackEquippedTitle) {
    profile = {
      ...profile,
      equippedTitle: options.fallbackEquippedTitle,
    };
  }

  return enrichProfileWithShowcaseTags(supabase, profile, {
    viewerUserId: options.viewerUserId,
    viewerIsAdmin: options.viewerIsAdmin,
  });
}
