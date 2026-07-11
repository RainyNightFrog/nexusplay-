import type { DonationPrivacyTier } from "@/lib/platform-leaderboard";

export type ProfileShowcaseTagId =
  | "online_rank"
  | "play_time_rank"
  | "donated_rank"
  | "achievement_count"
  | "forum_posts"
  | "supporter"
  | "follower_count"
  | "published_games"
  | "online_status"
  | "country";

export const PROFILE_SHOWCASE_TAG_IDS: ProfileShowcaseTagId[] = [
  "online_rank",
  "play_time_rank",
  "donated_rank",
  "achievement_count",
  "forum_posts",
  "supporter",
  "follower_count",
  "published_games",
  "online_status",
  "country",
];

/** Legacy tag ids stripped from saved preferences (shown elsewhere on player card). */
const DEPRECATED_PROFILE_SHOWCASE_TAG_IDS = new Set(["creator"]);

export const DEFAULT_PROFILE_SHOWCASE_TAGS: ProfileShowcaseTagId[] = [
  "online_rank",
  "play_time_rank",
  "donated_rank",
];

export const MAX_PROFILE_SHOWCASE_TAGS = 4;

export type LeaderboardRanks = {
  online: number | null;
  playTime: number | null;
  donated: number | null;
};

export type ProfileShowcaseTagPayload = {
  id: ProfileShowcaseTagId;
  rank?: number;
  count?: number;
  countryCode?: string;
};

export type ProfileShowcaseTagContext = {
  ranks: LeaderboardRanks;
  isCreator: boolean;
  isVirtual: boolean;
  isSupporter: boolean;
  isOnline: boolean;
  achievementCount: number;
  forumPostCount: number;
  followerCount: number;
  publishedGames: number;
  countryCode: string | null;
  donationTier?: DonationPrivacyTier;
};

const TAG_ID_SET = new Set<string>(PROFILE_SHOWCASE_TAG_IDS);

export function isProfileShowcaseTagId(
  value: string
): value is ProfileShowcaseTagId {
  return TAG_ID_SET.has(value);
}

export function parseProfileShowcaseTags(value: unknown): ProfileShowcaseTagId[] {
  if (!Array.isArray(value)) return [...DEFAULT_PROFILE_SHOWCASE_TAGS];

  const parsed = value.filter(
    (item): item is ProfileShowcaseTagId =>
      typeof item === "string" &&
      !DEPRECATED_PROFILE_SHOWCASE_TAG_IDS.has(item) &&
      isProfileShowcaseTagId(item)
  );

  return normalizeProfileShowcaseTags(parsed);
}

export function normalizeProfileShowcaseTags(
  tags: ProfileShowcaseTagId[]
): ProfileShowcaseTagId[] {
  const seen = new Set<ProfileShowcaseTagId>();
  const normalized: ProfileShowcaseTagId[] = [];

  for (const tag of tags) {
    if (seen.has(tag)) continue;
    seen.add(tag);
    normalized.push(tag);
    if (normalized.length >= MAX_PROFILE_SHOWCASE_TAGS) break;
  }

  return normalized;
}

function isTagAvailable(
  id: ProfileShowcaseTagId,
  context: ProfileShowcaseTagContext
): boolean {
  switch (id) {
    case "online_rank":
      return context.ranks.online != null && context.ranks.online > 0;
    case "play_time_rank":
      return context.ranks.playTime != null && context.ranks.playTime > 0;
    case "donated_rank":
      return context.ranks.donated != null && context.ranks.donated > 0;
    case "achievement_count":
      return context.achievementCount > 0;
    case "forum_posts":
      return context.forumPostCount > 0;
    case "supporter":
      return context.isSupporter;
    case "follower_count":
      return context.isCreator && context.followerCount > 0;
    case "published_games":
      return context.isCreator && context.publishedGames > 0;
    case "online_status":
      return context.isOnline;
    case "country":
      return Boolean(context.countryCode);
    default:
      return false;
  }
}

function buildTagPayload(
  id: ProfileShowcaseTagId,
  context: ProfileShowcaseTagContext
): ProfileShowcaseTagPayload | null {
  if (!isTagAvailable(id, context)) return null;

  switch (id) {
    case "online_rank":
      return { id, rank: context.ranks.online ?? undefined };
    case "play_time_rank":
      return { id, rank: context.ranks.playTime ?? undefined };
    case "donated_rank":
      return { id, rank: context.ranks.donated ?? undefined };
    case "achievement_count":
      return { id, count: context.achievementCount };
    case "forum_posts":
      return { id, count: context.forumPostCount };
    case "supporter":
      return { id };
    case "follower_count":
      return { id, count: context.followerCount };
    case "published_games":
      return { id, count: context.publishedGames };
    case "online_status":
      return { id };
    case "country":
      return { id, countryCode: context.countryCode ?? undefined };
    default:
      return null;
  }
}

export function resolveProfileShowcaseTags(
  preferences: ProfileShowcaseTagId[] | null | undefined,
  context: ProfileShowcaseTagContext
): ProfileShowcaseTagPayload[] {
  const preferred = normalizeProfileShowcaseTags(
    preferences?.length ? preferences : DEFAULT_PROFILE_SHOWCASE_TAGS
  );

  const resolved: ProfileShowcaseTagPayload[] = [];
  const used = new Set<ProfileShowcaseTagId>();

  for (const id of preferred) {
    const payload = buildTagPayload(id, context);
    if (!payload) continue;
    resolved.push(payload);
    used.add(id);
    if (resolved.length >= MAX_PROFILE_SHOWCASE_TAGS) break;
  }

  if (resolved.length >= MAX_PROFILE_SHOWCASE_TAGS) {
    return resolved;
  }

  for (const id of DEFAULT_PROFILE_SHOWCASE_TAGS) {
    if (used.has(id)) continue;
    const payload = buildTagPayload(id, context);
    if (!payload) continue;
    resolved.push(payload);
    used.add(id);
    if (resolved.length >= MAX_PROFILE_SHOWCASE_TAGS) break;
  }

  for (const id of PROFILE_SHOWCASE_TAG_IDS) {
    if (used.has(id)) continue;
    const payload = buildTagPayload(id, context);
    if (!payload) continue;
    resolved.push(payload);
    if (resolved.length >= MAX_PROFILE_SHOWCASE_TAGS) break;
  }

  return resolved;
}
