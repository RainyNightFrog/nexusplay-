import { listAuthAdminUsers } from "@/lib/auth-admin-users-cache";
import { parseAmbientPlayerIdFromEmail } from "@/lib/virtual-players";
import type { SupabaseClient } from "@supabase/supabase-js";

const CACHE_TTL_MS = 5 * 60_000;

let cachedMap: Map<string, string> | null = null;
let cachedAt = 0;

export async function getAmbientUserPlayerMap(
  supabase: SupabaseClient
): Promise<Map<string, string>> {
  if (cachedMap && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedMap;
  }

  const users = await listAuthAdminUsers(supabase);
  const map = new Map<string, string>();

  for (const user of users) {
    const playerId = parseAmbientPlayerIdFromEmail(user.email);
    if (playerId) {
      map.set(user.id, playerId);
    }
  }

  cachedMap = map;
  cachedAt = Date.now();
  return map;
}

export async function getAmbientUserIdForVirtualPlayer(
  supabase: SupabaseClient,
  virtualPlayerId: string,
  options?: { preferCreator?: boolean }
): Promise<string | null> {
  const map = await getAmbientUserPlayerMap(supabase);
  const matches: string[] = [];
  for (const [userId, playerId] of map.entries()) {
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

  return matches[0] ?? null;
}
