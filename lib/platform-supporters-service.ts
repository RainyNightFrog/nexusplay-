import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getSupporterDisplayTier,
  type SupporterDisplayTier,
} from "@/lib/supporter-tier";

export type PlatformSupporterPublic = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  supporterBadge: string | null;
  supporterLifetime: boolean;
  supporterSince: string | null;
  tier: SupporterDisplayTier;
};

export type PlatformSupportersResponse = {
  supporters: PlatformSupporterPublic[];
  total: number;
};

const DISPLAY_LIMIT = 24;
const CACHE_TTL_MS = 20_000;

type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  supporter_badge: string | null;
  supporter_lifetime: boolean | null;
  supporter_since: string | null;
};

type SupportersCache = {
  expiresAt: number;
  payload: PlatformSupportersResponse;
};

let supportersCache: SupportersCache | null = null;

function tierRank(tier: SupporterDisplayTier, lifetime: boolean): number {
  if (lifetime || tier === "premium") return 0;
  if (tier === "basic") return 1;
  return 2;
}

function sortSupporters(a: PlatformSupporterPublic, b: PlatformSupporterPublic) {
  const rankDiff =
    tierRank(a.tier, a.supporterLifetime) - tierRank(b.tier, b.supporterLifetime);
  if (rankDiff !== 0) return rankDiff;

  const aSince = a.supporterSince ? Date.parse(a.supporterSince) : Number.POSITIVE_INFINITY;
  const bSince = b.supporterSince ? Date.parse(b.supporterSince) : Number.POSITIVE_INFINITY;
  if (aSince !== bSince) return aSince - bSince;

  return a.displayName.localeCompare(b.displayName, "zh-Hant");
}

function mapRow(row: ProfileRow): PlatformSupporterPublic {
  const supporterBadge = row.supporter_badge?.trim() || null;
  const supporterLifetime = row.supporter_lifetime === true;
  const tier = getSupporterDisplayTier(
    true,
    supporterBadge,
    null,
    supporterLifetime
  );

  return {
    id: row.id,
    displayName: row.display_name?.trim() || "Player",
    avatarUrl: row.avatar_url,
    supporterBadge,
    supporterLifetime,
    supporterSince: row.supporter_since,
    tier,
  };
}

export async function listPlatformSupporters(
  supabase: SupabaseClient
): Promise<PlatformSupportersResponse> {
  const now = Date.now();
  if (supportersCache && supportersCache.expiresAt > now) {
    return supportersCache.payload;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, display_name, avatar_url, supporter_badge, supporter_lifetime, supporter_since"
    )
    .eq("is_supporter", true);

  if (error) {
    throw new Error(`讀取平台支持者失敗：${error.message}`);
  }

  const all = (data as ProfileRow[] | null ?? []).map(mapRow).sort(sortSupporters);
  const payload: PlatformSupportersResponse = {
    supporters: all.slice(0, DISPLAY_LIMIT),
    total: all.length,
  };

  supportersCache = {
    expiresAt: now + CACHE_TTL_MS,
    payload,
  };

  return payload;
}
