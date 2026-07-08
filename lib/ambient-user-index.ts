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

  const map = new Map<string, string>();
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) throw new Error(error.message);

  for (const user of data.users ?? []) {
    const playerId = parseAmbientPlayerIdFromEmail(user.email);
    if (playerId) {
      map.set(user.id, playerId);
    }
  }

  cachedMap = map;
  cachedAt = Date.now();
  return map;
}
