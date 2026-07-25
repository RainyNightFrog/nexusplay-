import { ambientEmailAliases } from "@/lib/ambient-local-email";
import { listAuthAdminUsers } from "@/lib/auth-admin-users-cache";
import { parseAmbientPlayerIdFromEmail } from "@/lib/virtual-players";
import type { SupabaseClient } from "@supabase/supabase-js";

const ENTRY_TTL_MS = 10 * 60_000;
const REVERSE_FULL_TTL_MS = 15 * 60_000;

type CacheEntry = {
  playerId: string | null;
  expiresAt: number;
};

const forwardCache = new Map<string, CacheEntry>();
let reverseFullCache: Map<string, string> | null = null;
let reverseFullCachedAt = 0;
let reverseFullInflight: Promise<Map<string, string>> | null = null;

function readAmbientIdFromUser(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}): string | null {
  const fromEmail = parseAmbientPlayerIdFromEmail(user.email);
  if (fromEmail) return fromEmail;
  const metaId = user.user_metadata?.ambient_id;
  return typeof metaId === "string" && metaId.trim() ? metaId.trim() : null;
}

function rememberForward(userId: string, playerId: string | null) {
  forwardCache.set(userId, {
    playerId,
    expiresAt: Date.now() + ENTRY_TTL_MS,
  });
}

async function resolveAmbientPlayerIdForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const cached = forwardCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.playerId;
  }

  try {
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error || !data.user) {
      rememberForward(userId, null);
      return null;
    }
    const playerId = readAmbientIdFromUser(data.user);
    rememberForward(userId, playerId);
    return playerId;
  } catch {
    rememberForward(userId, null);
    return null;
  }
}

/**
 * userId → virtualPlayerId。
 * 請傳入本頁訊息相關的 userIds，避免每次冷啟動 listUsers(1000)。
 */
export async function getAmbientUserPlayerMap(
  supabase: SupabaseClient,
  userIds?: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const uniqueIds = [...new Set((userIds ?? []).filter(Boolean))];

  if (uniqueIds.length === 0) {
    for (const [userId, entry] of forwardCache.entries()) {
      if (entry.expiresAt > Date.now() && entry.playerId) {
        map.set(userId, entry.playerId);
      }
    }
    return map;
  }

  await Promise.all(
    uniqueIds.map(async (userId) => {
      const playerId = await resolveAmbientPlayerIdForUser(supabase, userId);
      if (playerId) map.set(userId, playerId);
    })
  );

  return map;
}

async function loadFullAmbientReverseMap(
  supabase: SupabaseClient
): Promise<Map<string, string>> {
  if (
    reverseFullCache &&
    Date.now() - reverseFullCachedAt < REVERSE_FULL_TTL_MS
  ) {
    return reverseFullCache;
  }
  if (reverseFullInflight) return reverseFullInflight;

  reverseFullInflight = (async () => {
    const users = await listAuthAdminUsers(supabase);
    const map = new Map<string, string>();
    for (const user of users) {
      const playerId = readAmbientIdFromUser(user);
      if (!playerId) continue;
      map.set(user.id, playerId);
      rememberForward(user.id, playerId);
    }
    reverseFullCache = map;
    reverseFullCachedAt = Date.now();
    return map;
  })();

  try {
    return await reverseFullInflight;
  } finally {
    reverseFullInflight = null;
  }
}

/** virtualPlayerId → ambient userId（較少用；必要時才全量掃描並快取） */
export async function getAmbientUserIdForVirtualPlayer(
  supabase: SupabaseClient,
  virtualPlayerId: string,
  options?: { preferCreator?: boolean }
): Promise<string | null> {
  for (const [userId, entry] of forwardCache.entries()) {
    if (entry.expiresAt > Date.now() && entry.playerId === virtualPlayerId) {
      if (!options?.preferCreator) return userId;
    }
  }

  const full = await loadFullAmbientReverseMap(supabase);
  const matches: string[] = [];
  for (const [userId, playerId] of full.entries()) {
    if (playerId === virtualPlayerId) matches.push(userId);
  }
  if (matches.length === 0) return null;
  if (!options?.preferCreator) return matches[0] ?? null;

  for (const userId of matches) {
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    if (data?.role === "creator") return userId;
  }

  // 偏好創作者帳時，優先比對 email 前綴（與 ensureAmbientPlayer 一致）
  const creatorEmails = new Set(
    ambientEmailAliases(`ambient.creator.${virtualPlayerId}`)
  );
  for (const userId of matches) {
    try {
      const { data } = await supabase.auth.admin.getUserById(userId);
      if (data.user?.email && creatorEmails.has(data.user.email)) {
        return userId;
      }
    } catch {
      // ignore
    }
  }

  return matches[0] ?? null;
}

/** 快速判斷單一 user 是否為 ambient bot（私訊擋擋用） */
export async function isAmbientBotUserId(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const playerId = await resolveAmbientPlayerIdForUser(supabase, userId);
  return Boolean(playerId);
}
