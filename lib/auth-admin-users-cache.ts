import type { SupabaseClient, User } from "@supabase/supabase-js";

const CACHE_TTL_MS = 5 * 60_000;

type AuthUsersCache = {
  expiresAt: number;
  users: User[];
};

let authUsersCache: AuthUsersCache | null = null;
let authUsersInflight: Promise<User[]> | null = null;

/**
 * 共用 Auth Admin listUsers 快取，避免排行榜／聊天／玩家卡各自冷啟動各打一輪。
 */
export async function listAuthAdminUsers(
  supabase: SupabaseClient,
  options?: { perPage?: number }
): Promise<User[]> {
  const now = Date.now();
  if (authUsersCache && authUsersCache.expiresAt > now) {
    return authUsersCache.users;
  }

  if (authUsersInflight) {
    return authUsersInflight;
  }

  authUsersInflight = (async () => {
    const { data, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: options?.perPage ?? 1000,
    });

    if (error) {
      if (authUsersCache) return authUsersCache.users;
      throw new Error(error.message);
    }

    const users = data.users ?? [];
    authUsersCache = {
      expiresAt: Date.now() + CACHE_TTL_MS,
      users,
    };
    return users;
  })();

  try {
    return await authUsersInflight;
  } finally {
    authUsersInflight = null;
  }
}
