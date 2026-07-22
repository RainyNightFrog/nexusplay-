import type { DonationPrivacyTier } from "@/lib/platform-leaderboard";
import { isUserOnline, usdCentsToHkd } from "@/lib/platform-leaderboard";
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
import { resolveEquippedTitleForUser } from "@/lib/equipped-title-service";
import { resolveVirtualPlayerAvatarUrl } from "@/lib/virtual-player-avatar";
import { getVirtualPlayerSocialStats } from "@/lib/virtual-player-public-profile";
import {
  getCountryCodeFromHeaders,
  getVirtualPlayerCountryCode,
} from "@/lib/request-geo";
import { getVirtualPlayerById } from "@/lib/virtual-players";
import {
  getVirtualPlayerEquippedTitle,
  getVirtualPlayerSupporterFlags,
} from "@/lib/virtual-player-supporter";
import { getVirtualPlayerBio } from "@/lib/virtual-player-bios";
import type { EquippedTitle } from "@/lib/titles";
import {
  resolveAdminDisplayRole,
  type AdminDisplayRole,
} from "@/lib/admin-display-role";
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
  adminRole: AdminDisplayRole;
  isVirtual: boolean;
  isOnline: boolean;
  bio: string | null;
  registeredAt: string | null;
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
  supporterBadge: string | null;
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
): Promise<{
  profile: ChatPlayerPublicProfile;
  showcasePreferences: ProfileShowcaseTagId[] | null;
} | null> {
  const [profileRes, authRes] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, display_name, avatar_url, role, bio, player_number, is_supporter, supporter_badge, is_admin, created_at"
      )
      .eq("id", userId)
      .maybeSingle(),
    supabase.auth.admin.getUserById(userId),
  ]);

  if (profileRes.error) throw new Error(profileRes.error.message);
  if (authRes.error) throw new Error(authRes.error.message);
  const profile = profileRes.data;
  if (!profile) return null;

  const metadata = authRes.data.user?.user_metadata ?? {};
  const registeredAt =
    readOptionalString(profile.created_at) ??
    readOptionalString(authRes.data.user?.created_at) ??
    null;
  const profilePublic = readBoolean(metadata.profile_public, true);
  const bio = profilePublic
    ? readOptionalString(profile.bio) ?? readOptionalString(metadata.bio)
    : null;
  const website = profilePublic ? readOptionalString(metadata.website) : null;
  const countryCode = readCountryCode(metadata.country_code);
  const showcasePreferences = parseProfileShowcaseTags(
    metadata.profile_showcase_tags
  );

  const [
    activityRes,
    achievementsRes,
    achievementCountRes,
    forumPostsRes,
    publishedGamesRes,
    followerCountRes,
    equippedTitle,
    ordersRes,
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
    supabase
      .from("orders")
      .select("total_amount_cents")
      .eq("buyer_id", userId)
      .eq("order_type", "supporter_pass")
      .eq("status", "succeeded"),
  ]);

  if (activityRes.error) throw new Error(activityRes.error.message);
  if (ordersRes.error) throw new Error(ordersRes.error.message);

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

  const tipsHkd = Number(activity?.total_donated ?? 0);
  const supporterHkd = (ordersRes.data ?? []).reduce(
    (sum, row) => sum + usdCentsToHkd(Number(row.total_amount_cents ?? 0)),
    0
  );
  const rawDonated = tipsHkd + supporterHkd;
  const revealDonation = maskDonationTotalForProfile(rawDonated, {
    isSelf: viewer?.userId === userId,
    isAdmin: viewer?.isAdmin,
  });

  return {
    profile: {
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
      adminRole: resolveAdminDisplayRole(
        profile.is_admin === true,
        metadata.role === "admin"
      ),
      isVirtual: false,
      isOnline: lastActiveAt ? isUserOnline(lastActiveAt) : false,
      bio,
      registeredAt: registeredAt,
      website: website,
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
      supporterBadge: readOptionalString(profile.supporter_badge),
      showcaseTags: [],
    },
    showcasePreferences,
  };
}

function hashVirtualId(value: string, salt: number) {
  let hash = salt;
  for (const char of value) {
    hash = Math.imul(31, hash) + char.charCodeAt(0);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** Stable join date in Feb 1 – Jul 10, 2026 for virtual / ambient players. */
function getVirtualPlayerRegisteredAt(playerId: string): string {
  const startDay = Date.UTC(2026, 1, 1); // 2026-02-01
  const endDay = Date.UTC(2026, 6, 10); // 2026-07-10
  const totalDays = Math.floor((endDay - startDay) / 86_400_000);
  const dayOffset = hashVirtualId(playerId, 401) % (totalDays + 1);
  const hour = hashVirtualId(playerId, 503) % 24;
  const minute = hashVirtualId(playerId, 607) % 60;
  const second = hashVirtualId(playerId, 701) % 60;
  return new Date(
    startDay + dayOffset * 86_400_000 + hour * 3_600_000 + minute * 60_000 + second * 1_000
  ).toISOString();
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

  const virtualSupporterFlags = getVirtualPlayerSupporterFlags(virtualPlayerId);

  return {
    userId: null,
    virtualPlayerId,
    playerNumber: null,
    displayName: player.displayName,
    avatarUrl: resolveVirtualPlayerAvatarUrl(virtualPlayerId),
    equippedTitle: getVirtualPlayerEquippedTitle(virtualPlayerId),
    isCreator,
    adminRole: "none",
    isVirtual: true,
    isOnline: activity.isOnline,
    bio: getVirtualPlayerBio(virtualPlayerId),
    registeredAt: getVirtualPlayerRegisteredAt(virtualPlayerId),
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
    isSupporter: virtualSupporterFlags?.isSupporter === true,
    supporterBadge: virtualSupporterFlags?.badge ?? null,
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
  let showcasePreferences: ProfileShowcaseTagId[] | null | undefined;

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
      const [virtualProfile, realLoaded] = await Promise.all([
        loadVirtualPlayerProfile(supabase, virtualPlayerId ?? mappedVirtualId),
        loadRealUserProfile(supabase, userId, viewer),
      ]);
      profile = virtualProfile;
      showcasePreferences = realLoaded?.showcasePreferences ?? null;
      if (profile) {
        const ambientUserId = await getAmbientUserIdForVirtualPlayer(
          supabase,
          virtualPlayerId ?? mappedVirtualId,
          { preferCreator: profile.isCreator }
        );
        profile = {
          ...profile,
          userId: ambientUserId ?? userId,
          ...(realLoaded?.profile.bio ? { bio: realLoaded.profile.bio } : {}),
          ...(realLoaded?.profile.registeredAt
            ? { registeredAt: realLoaded.profile.registeredAt }
            : {}),
        };
      }
    } else {
      const loaded = await loadRealUserProfile(supabase, userId, viewer);
      profile = loaded?.profile ?? null;
      showcasePreferences = loaded?.showcasePreferences ?? null;
    }
  }

  if (!profile && virtualPlayerId) {
    profile = await loadVirtualPlayerProfile(supabase, virtualPlayerId);
    showcasePreferences = null;
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
    showcasePreferences,
  });
}
