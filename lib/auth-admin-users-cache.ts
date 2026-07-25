import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  AUTH_ADMIN_TIMEOUT_MS,
  isTimeoutError,
  withTimeout,
} from "@/lib/with-timeout";

const CACHE_TTL_MS = 5 * 60_000;

type AuthUsersCache = {
  expiresAt: number;
  users: User[];
};

let authUsersCache: AuthUsersCache | null = null;
let authUsersInflight: Promise<User[]> | null = null;

function isTransientAuthAdminError(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes("invalid jwt") ||
    lower.includes("jwt kid") ||
    lower.includes("unrecognized jwt") ||
    lower.includes("unable to parse or verify") ||
    lower.includes("rate limit") ||
    lower.includes("timeout") ||
    lower.includes("timed out")
  );
}

function staleOrEmpty(): User[] {
  return authUsersCache?.users ?? [];
}

/**
 * 共用 Auth Admin listUsers 快取，避免排行榜／聊天／玩家卡各自冷啟動各打一輪。
 * 含 9 秒逾時；失敗時回傳舊快取或空陣列，不向上拋錯。
 */
export async function listAuthAdminUsers(
  supabase: SupabaseClient,
  options?: { perPage?: number; force?: boolean }
): Promise<User[]> {
  const now = Date.now();
  if (
    !options?.force &&
    authUsersCache &&
    authUsersCache.expiresAt > now
  ) {
    return authUsersCache.users;
  }

  if (authUsersInflight) {
    return authUsersInflight;
  }

  authUsersInflight = (async () => {
    try {
      const result = await withTimeout(
        supabase.auth.admin.listUsers({
          page: 1,
          perPage: options?.perPage ?? 1000,
        }),
        AUTH_ADMIN_TIMEOUT_MS,
        "auth.admin.listUsers"
      );

      const { data, error } = result;

      if (error) {
        if (isTransientAuthAdminError(error.message)) {
          return staleOrEmpty();
        }
        console.warn(`[auth-admin] listUsers failed: ${error.message}`);
        return staleOrEmpty();
      }

      const users = data.users ?? [];
      authUsersCache = {
        expiresAt: Date.now() + CACHE_TTL_MS,
        users,
      };
      return users;
    } catch (error) {
      if (isTimeoutError(error) || authUsersCache) {
        if (isTimeoutError(error)) {
          console.warn("[auth-admin] listUsers timed out; using stale cache");
        }
        return staleOrEmpty();
      }
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[auth-admin] listUsers exception: ${message}`);
      return [];
    }
  })();

  try {
    return await authUsersInflight;
  } finally {
    authUsersInflight = null;
  }
}
