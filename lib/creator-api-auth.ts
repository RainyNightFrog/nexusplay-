import { hasCreatorDashboardAccess, resolveUserRole } from "@/lib/auth-profile";
import {
  authenticateApiKey,
  extractApiKeyFromRequest,
} from "@/lib/api-key-service";
import type { CreatorGameRecord } from "@/lib/creator-games";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";

export const CREATOR_GAME_FIELDS =
  "id, title, description, category, cover_url, game_url, creator_id, created_at, plays_count, rating_avg, publish_status, tips_enabled, suggested_tip_amount, platform_fee_percent";

export async function listCreatorGamesForUser(
  userId: string,
  options?: { ownedOnly?: boolean }
): Promise<CreatorGameRecord[]> {
  const supabase = createServerSupabase();

  const { data: owned, error: ownedError } = await supabase
    .from("games")
    .select(CREATOR_GAME_FIELDS)
    .eq("creator_id", userId)
    .order("created_at", { ascending: false });

  if (ownedError) {
    throw new Error(`讀取創作者遊戲失敗：${ownedError.message}`);
  }

  const ownedGames = (owned ?? []).map((game) => ({
    ...(game as CreatorGameRecord),
    isUnclaimed: false,
  }));

  if (options?.ownedOnly) {
    return ownedGames;
  }

  const { data: unclaimed, error: unclaimedError } = await supabase
    .from("games")
    .select(CREATOR_GAME_FIELDS)
    .is("creator_id", null)
    .order("created_at", { ascending: false });

  if (unclaimedError) {
    throw new Error(`讀取未綁定遊戲失敗：${unclaimedError.message}`);
  }

  const unclaimedGames = (unclaimed ?? []).map((game) => ({
    ...(game as CreatorGameRecord),
    isUnclaimed: true,
  }));

  return [...ownedGames, ...unclaimedGames];
}

export type CreatorApiAuthResult =
  | { ok: true; userId: string; via: "session" | "api_key" }
  | { ok: false; status: 401 | 403; error: string };

export async function authorizeCreatorApiRequest(
  request: Request,
  options?: { apiKeyOnly?: boolean }
): Promise<CreatorApiAuthResult> {
  const apiKeySecret = extractApiKeyFromRequest(request);

  if (apiKeySecret) {
    const auth = await authenticateApiKey(apiKeySecret);
    if (!auth) {
      return { ok: false, status: 401, error: "API 金鑰無效或已撤銷" };
    }
    return { ok: true, userId: auth.userId, via: "api_key" };
  }

  if (options?.apiKeyOnly) {
    return { ok: false, status: 401, error: "需要有效的 API 金鑰" };
  }

  const authClient = await createAuthServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return { ok: false, status: 401, error: "請先登入或提供 API 金鑰" };
  }

  const role = await resolveUserRole(authClient, user);
  if (!hasCreatorDashboardAccess(user, role)) {
    return { ok: false, status: 403, error: "需要創作者身分" };
  }

  return { ok: true, userId: user.id, via: "session" };
}
