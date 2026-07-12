import type { AccountStatus } from "@/lib/account-status";
import { createServerSupabase } from "@/lib/supabase-server";

export type AdminUserRecord = {
  id: string;
  displayName: string;
  username: string | null;
  email: string | null;
  role: string | null;
  playerNumber: number | null;
  isAdmin: boolean;
  isSupporter: boolean;
  accountStatus: AccountStatus;
  suspendedUntil: string | null;
  banReason: string | null;
  chatMutedUntil: string | null;
  forumPostingDisabled: boolean;
  creatorBalanceUsd: number;
  createdAt: string | null;
  gamesCount: number;
  tipsCount: number;
  ordersCount: number;
};

export type AdminUserDetail = AdminUserRecord & {
  stripeConnectAccountId: string | null;
  payoutStatus: string | null;
  forumPostsCount: number;
  recentTips: Array<{
    id: string;
    amountUsd: number;
    status: string;
    createdAt: string;
    gameTitle: string;
  }>;
  recentOrders: Array<{
    id: string;
    orderType: string;
    status: string;
    totalAmountCents: number;
    createdAt: string;
    gameTitle: string | null;
  }>;
};

function roundUsd(value: unknown) {
  const numeric =
    typeof value === "number"
      ? value
      : Number.parseFloat(String(value ?? 0)) || 0;
  return Math.round(numeric * 100) / 100;
}

export async function listAdminUsers(params: {
  query?: string;
  limit?: number;
}): Promise<AdminUserRecord[]> {
  const supabase = createServerSupabase();
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 100);
  const query = params.query?.trim().toLowerCase() ?? "";

  let profileQuery = supabase
    .from("profiles")
    .select(
      "id, display_name, username, role, player_number, is_admin, is_supporter, account_status, suspended_until, ban_reason, chat_muted_until, forum_posting_disabled, creator_balance_usd, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (query) {
    profileQuery = profileQuery.or(
      `display_name.ilike.%${query}%,username.ilike.%${query}%`
    );
  }

  const { data: profiles, error } = await profileQuery;
  if (error) throw new Error(error.message);

  const rows: AdminUserRecord[] = [];

  for (const profile of profiles ?? []) {
    const { data: authUser } = await supabase.auth.admin.getUserById(
      profile.id as string
    );
    const email = authUser.user?.email ?? null;

    if (
      query &&
      email &&
      !email.toLowerCase().includes(query) &&
      !String(profile.display_name ?? "")
        .toLowerCase()
        .includes(query) &&
      !String(profile.username ?? "")
        .toLowerCase()
        .includes(query) &&
      !String(profile.player_number ?? "").includes(query)
    ) {
      continue;
    }

    const [gamesCount, tipsCount, ordersCount] = await Promise.all([
      supabase
        .from("games")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", profile.id),
      supabase
        .from("game_tips")
        .select("id", { count: "exact", head: true })
        .eq("payer_id", profile.id),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("buyer_id", profile.id),
    ]);

    rows.push({
      id: profile.id as string,
      displayName: (profile.display_name as string) ?? profile.id.slice(0, 8),
      username: (profile.username as string | null) ?? null,
      email,
      role: (profile.role as string | null) ?? null,
      playerNumber: (profile.player_number as number | null) ?? null,
      isAdmin: profile.is_admin === true,
      isSupporter: profile.is_supporter === true,
      accountStatus: (profile.account_status as AccountStatus) ?? "active",
      suspendedUntil: (profile.suspended_until as string | null) ?? null,
      banReason: (profile.ban_reason as string | null) ?? null,
      chatMutedUntil: (profile.chat_muted_until as string | null) ?? null,
      forumPostingDisabled: profile.forum_posting_disabled === true,
      creatorBalanceUsd: roundUsd(profile.creator_balance_usd),
      createdAt: (profile.created_at as string | null) ?? null,
      gamesCount: gamesCount.count ?? 0,
      tipsCount: tipsCount.count ?? 0,
      ordersCount: ordersCount.count ?? 0,
    });
  }

  return rows;
}

export async function getAdminUserDetail(userId: string): Promise<AdminUserDetail> {
  const supabase = createServerSupabase();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "id, display_name, username, role, player_number, is_admin, is_supporter, account_status, suspended_until, ban_reason, chat_muted_until, forum_posting_disabled, creator_balance_usd, created_at, stripe_connect_account_id, payout_status"
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!profile) throw new Error("找不到此用戶");

  const { data: authUser } = await supabase.auth.admin.getUserById(userId);
  const email = authUser.user?.email ?? null;

  const [gamesCount, tipsCount, ordersCount, forumPostsCount, tips, orders] =
    await Promise.all([
      supabase
        .from("games")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", userId),
      supabase
        .from("game_tips")
        .select("id", { count: "exact", head: true })
        .eq("payer_id", userId),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("buyer_id", userId),
      supabase
        .from("forum_posts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("game_tips")
        .select("id, amount_usd, status, created_at, game_id")
        .eq("payer_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("orders")
        .select("id, order_type, status, total_amount_cents, created_at, game_id")
        .eq("buyer_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  const gameIds = [
    ...new Set([
      ...(tips.data ?? []).map((row) => row.game_id as number),
      ...(orders.data ?? [])
        .map((row) => row.game_id as number | null)
        .filter(Boolean) as number[],
    ]),
  ];

  const { data: games } =
    gameIds.length > 0
      ? await supabase.from("games").select("id, title").in("id", gameIds)
      : { data: [] };

  const titleMap = new Map(
    (games ?? []).map((game) => [game.id as number, game.title as string])
  );

  return {
    id: profile.id as string,
    displayName: (profile.display_name as string) ?? userId.slice(0, 8),
    username: (profile.username as string | null) ?? null,
    email,
    role: (profile.role as string | null) ?? null,
    playerNumber: (profile.player_number as number | null) ?? null,
    isAdmin: profile.is_admin === true,
    isSupporter: profile.is_supporter === true,
    accountStatus: (profile.account_status as AccountStatus) ?? "active",
    suspendedUntil: (profile.suspended_until as string | null) ?? null,
    banReason: (profile.ban_reason as string | null) ?? null,
    chatMutedUntil: (profile.chat_muted_until as string | null) ?? null,
    forumPostingDisabled: profile.forum_posting_disabled === true,
    creatorBalanceUsd: roundUsd(profile.creator_balance_usd),
    createdAt: (profile.created_at as string | null) ?? null,
    gamesCount: gamesCount.count ?? 0,
    tipsCount: tipsCount.count ?? 0,
    ordersCount: ordersCount.count ?? 0,
    stripeConnectAccountId:
      (profile.stripe_connect_account_id as string | null) ?? null,
    payoutStatus: (profile.payout_status as string | null) ?? null,
    forumPostsCount: forumPostsCount.count ?? 0,
    recentTips: (tips.data ?? []).map((tip) => ({
      id: tip.id as string,
      amountUsd: roundUsd(tip.amount_usd),
      status: tip.status as string,
      createdAt: tip.created_at as string,
      gameTitle: titleMap.get(tip.game_id as number) ?? "",
    })),
    recentOrders: (orders.data ?? []).map((order) => ({
      id: order.id as string,
      orderType: order.order_type as string,
      status: order.status as string,
      totalAmountCents: order.total_amount_cents as number,
      createdAt: order.created_at as string,
      gameTitle: order.game_id
        ? (titleMap.get(order.game_id as number) ?? null)
        : null,
    })),
  };
}

export async function updateAdminUserAccount(params: {
  userId: string;
  action:
    | "suspend"
    | "ban"
    | "unban"
    | "mute_chat"
    | "unmute_chat"
    | "disable_forum"
    | "enable_forum"
    | "set_role"
    | "grant_supporter"
    | "revoke_supporter";
  reason?: string | null;
  suspendedUntil?: string | null;
  chatMutedUntil?: string | null;
  role?: "player" | "creator";
}) {
  const supabase = createServerSupabase();
  const patch: Record<string, unknown> = {};

  switch (params.action) {
    case "suspend":
      patch.account_status = "suspended";
      patch.suspended_until = params.suspendedUntil ?? null;
      patch.ban_reason = params.reason?.trim() || null;
      break;
    case "ban":
      patch.account_status = "banned";
      patch.suspended_until = null;
      patch.ban_reason = params.reason?.trim() || null;
      break;
    case "unban":
      patch.account_status = "active";
      patch.suspended_until = null;
      patch.ban_reason = null;
      patch.chat_muted_until = null;
      patch.forum_posting_disabled = false;
      break;
    case "mute_chat":
      patch.chat_muted_until = params.chatMutedUntil ?? null;
      break;
    case "unmute_chat":
      patch.chat_muted_until = null;
      break;
    case "disable_forum":
      patch.forum_posting_disabled = true;
      break;
    case "enable_forum":
      patch.forum_posting_disabled = false;
      break;
    case "set_role":
      if (!params.role) throw new Error("缺少 role");
      patch.role = params.role;
      break;
    case "grant_supporter":
      patch.is_supporter = true;
      patch.supporter_since = new Date().toISOString();
      patch.supporter_badge = "supporter_v1";
      break;
    case "revoke_supporter":
      patch.is_supporter = false;
      patch.supporter_badge = null;
      break;
  }

  const { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", params.userId);

  if (error) throw new Error(error.message);

  if (params.action === "ban" || params.action === "suspend") {
    await supabase.auth.admin.signOut(params.userId, "global");
  }

  return getAdminUserDetail(params.userId);
}

export async function setAdminFlag(params: {
  userId: string;
  isAdmin: boolean;
  actorEmail?: string | null;
}) {
  const supabase = createServerSupabase();

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ is_admin: params.isAdmin })
    .eq("id", params.userId);

  if (profileError) throw new Error(profileError.message);

  const { data: authUser, error: authError } =
    await supabase.auth.admin.getUserById(params.userId);

  if (authError) throw new Error(authError.message);
  if (!authUser.user) throw new Error("找不到此用戶");

  const nextMetadata = {
    ...(authUser.user.user_metadata ?? {}),
    role: params.isAdmin ? "admin" : "player",
    ...(params.isAdmin ? { developing_games: true } : {}),
  };

  const { error: updateError } = await supabase.auth.admin.updateUserById(
    params.userId,
    { user_metadata: nextMetadata }
  );

  if (updateError) throw new Error(updateError.message);

  return {
    userId: params.userId,
    email: authUser.user.email ?? params.actorEmail ?? null,
    isAdmin: params.isAdmin,
  };
}

export async function listAdminAccounts() {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, username, is_admin, created_at")
    .eq("is_admin", true)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  const rows = [];
  for (const profile of data ?? []) {
    const { data: authUser } = await supabase.auth.admin.getUserById(
      profile.id as string
    );
    rows.push({
      id: profile.id as string,
      displayName: (profile.display_name as string) ?? "",
      username: (profile.username as string | null) ?? null,
      email: authUser.user?.email ?? null,
      metadataAdmin: authUser.user?.user_metadata?.role === "admin",
      createdAt: (profile.created_at as string | null) ?? null,
    });
  }

  return rows;
}
