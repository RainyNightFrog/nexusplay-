import type { SupabaseClient } from "@supabase/supabase-js";
import { VIRTUAL_LEADERBOARD_USER_PREFIX } from "@/lib/platform-leaderboard-virtual";
import {
  getSupporterDisplayTier,
  type SupporterDisplayTier,
} from "@/lib/supporter-tier";
import { resolveVirtualPlayerAvatarUrl } from "@/lib/virtual-player-avatar";
import {
  VIRTUAL_SVIP_PLAYER_IDS,
  VIRTUAL_VIP_PLAYER_IDS,
  VIRTUAL_LIFETIME_PLAYER_IDS,
  getVirtualPlayerSupporterBadge,
  isVirtualPlayerLifetimeSupporter,
} from "@/lib/virtual-player-supporter";
import { getVirtualPlayerById } from "@/lib/virtual-players";
import {
  SERVER_QUERY_TIMEOUT_MS,
  isTimeoutError,
  withTimeout,
} from "@/lib/with-timeout";

export type PlatformSupporterPublic = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  supporterBadge: string | null;
  supporterLifetime: boolean;
  supporterSince: string | null;
  tier: SupporterDisplayTier;
  /** 僅內部辨識用，前端不顯示「虛擬」 */
  virtualPlayerId?: string | null;
};

export type PlatformSupportersResponse = {
  supporters: PlatformSupporterPublic[];
  total: number;
};

const DISPLAY_LIMIT = 36;
const CACHE_TTL_MS = 8_000;

type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  supporter_badge: string | null;
  supporter_lifetime: boolean | null;
  supporter_since: string | null;
  is_admin: boolean | null;
};

type SupportersCache = {
  expiresAt: number;
  payload: PlatformSupportersResponse;
};

let supportersCache: SupportersCache | null = null;

/** 授予／撤銷／管理員旗標變更後呼叫，避免牆面卡住舊資料 */
export function invalidatePlatformSupportersCache() {
  supportersCache = null;
}

function tierRank(tier: SupporterDisplayTier, lifetime: boolean): number {
  if (lifetime || tier === "lifetime") return -1;
  if (tier === "premium") return 0;
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
  const isSuperAdmin = row.is_admin === true;
  const supporterBadge = row.supporter_badge?.trim() || null;
  const supporterLifetime =
    row.supporter_lifetime === true || isSuperAdmin;
  const tier = getSupporterDisplayTier(
    true,
    supporterBadge,
    null,
    supporterLifetime,
    isSuperAdmin
  );

  return {
    id: row.id,
    displayName: row.display_name?.trim() || "Player",
    avatarUrl: row.avatar_url,
    supporterBadge,
    supporterLifetime,
    supporterSince: row.supporter_since,
    tier,
    virtualPlayerId: null,
  };
}

function hashString(value: string, salt: number) {
  let hash = salt;
  for (const char of value) {
    hash = Math.imul(31, hash) + char.charCodeAt(0);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** 穩定假「加入日」，避免每次刷新順序亂跳 */
function virtualSupporterSince(playerId: string): string {
  const daysAgo = 45 + (hashString(playerId, 59) % 420);
  const base = Date.UTC(2026, 0, 15);
  return new Date(base - daysAgo * 86_400_000).toISOString();
}

function buildVirtualSupporterEntries(): PlatformSupporterPublic[] {
  const ids = [
    ...VIRTUAL_LIFETIME_PLAYER_IDS,
    ...VIRTUAL_SVIP_PLAYER_IDS,
    ...VIRTUAL_VIP_PLAYER_IDS,
  ];
  const entries: PlatformSupporterPublic[] = [];

  for (const playerId of ids) {
    const player = getVirtualPlayerById(playerId);
    if (!player) continue;

    const supporterBadge = getVirtualPlayerSupporterBadge(playerId);
    if (!supporterBadge) continue;

    const supporterLifetime = isVirtualPlayerLifetimeSupporter(playerId);
    const tier = getSupporterDisplayTier(
      true,
      supporterBadge,
      null,
      supporterLifetime
    );
    entries.push({
      id: `${VIRTUAL_LEADERBOARD_USER_PREFIX}${playerId}`,
      displayName: player.displayName,
      avatarUrl: resolveVirtualPlayerAvatarUrl(playerId),
      supporterBadge,
      supporterLifetime,
      supporterSince: virtualSupporterSince(playerId),
      tier,
      virtualPlayerId: playerId,
    });
  }

  return entries;
}

export async function listPlatformSupporters(
  supabase: SupabaseClient
): Promise<PlatformSupportersResponse> {
  const now = Date.now();
  if (supportersCache && supportersCache.expiresAt > now) {
    return supportersCache.payload;
  }

  try {
    // 含 is_admin：超管顯示為 LEGEND，即使 DB 未標 is_supporter
    const { data, error } = await withTimeout(
      Promise.resolve(
        supabase
          .from("profiles")
          .select(
            "id, display_name, avatar_url, supporter_badge, supporter_lifetime, supporter_since, is_admin"
          )
          .or("is_supporter.eq.true,is_admin.eq.true")
      ),
      SERVER_QUERY_TIMEOUT_MS,
      "listPlatformSupporters"
    );

    if (error) {
      if (supportersCache) return supportersCache.payload;
      throw new Error(`讀取平台支持者失敗：${error.message}`);
    }

    const real = (data as ProfileRow[] | null ?? []).map(mapRow);
    const realNames = new Set(
      real.map((item) => item.displayName.trim().toLowerCase())
    );

    // 若真實會員已用同名，略過虛擬條目，避免牆上看起來像重複帳號
    const virtual = buildVirtualSupporterEntries().filter(
      (item) => !realNames.has(item.displayName.trim().toLowerCase())
    );

    const all = [...real, ...virtual].sort(sortSupporters);
    const payload: PlatformSupportersResponse = {
      supporters: all.slice(0, DISPLAY_LIMIT),
      total: all.length,
    };

    supportersCache = {
      expiresAt: Date.now() + CACHE_TTL_MS,
      payload,
    };

    return payload;
  } catch (error) {
    if (supportersCache) {
      if (isTimeoutError(error)) {
        console.warn("[supporters] query timed out; using stale cache");
      }
      return supportersCache.payload;
    }
    throw error;
  }
}
