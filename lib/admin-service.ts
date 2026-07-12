import type { SupabaseClient } from "@supabase/supabase-js";
import { deleteGameAndAssets } from "@/lib/game-delete-server";
import { createServerSupabase } from "@/lib/supabase-server";

export type GameApprovalStatus = "pending" | "approved" | "rejected";
export type FeedbackStatus = "unread" | "resolved";

export type AdminGameRecord = {
  id: number;
  title: string;
  description: string;
  category: string;
  cover_url: string;
  creator_id: string | null;
  created_at: string;
  publish_status: "draft" | "public";
  status: GameApprovalStatus;
};

export type FeedbackCategory =
  | "general"
  | "bug"
  | "suggestion"
  | "report"
  | "billing"
  | "other";

export type AdminFeedbackRecord = {
  id: string;
  user_id: string | null;
  email: string | null;
  subject: string;
  message: string;
  status: FeedbackStatus;
  category: FeedbackCategory;
  admin_notes: string | null;
  admin_reply: string | null;
  created_at: string;
  updated_at: string | null;
};

export type AdminLogRecord = {
  id: string;
  admin_id: string;
  action: string;
  details: string | null;
  created_at: string;
};

export async function listAdminGames(
  status: GameApprovalStatus | "all" = "pending"
): Promise<AdminGameRecord[]> {
  const supabase = createServerSupabase();
  let query = supabase
    .from("games")
    .select(
      "id, title, description, category, cover_url, creator_id, created_at, publish_status, status"
    )
    .order("created_at", { ascending: false });

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`讀取遊戲審批列表失敗：${error.message}`);
  }

  return (data ?? []) as AdminGameRecord[];
}

export async function updateGameApproval(
  gameId: number,
  status: "approved" | "rejected",
  details?: string | null
) {
  const supabase = createServerSupabase();
  const updates: Record<string, unknown> = { status };

  if (status === "rejected") {
    updates.publish_status = "draft";
  }

  const { data, error } = await supabase
    .from("games")
    .update(updates)
    .eq("id", gameId)
    .select(
      "id, title, description, category, cover_url, creator_id, created_at, publish_status, status"
    )
    .maybeSingle();

  if (error) {
    throw new Error(`更新遊戲審批狀態失敗：${error.message}`);
  }

  if (!data) {
    throw new Error("找不到此遊戲");
  }

  return { game: data as AdminGameRecord, logDetails: details ?? null };
}

export async function listAdminFeedbacks(
  authClient: SupabaseClient,
  status: FeedbackStatus | "all" = "unread"
): Promise<AdminFeedbackRecord[]> {
  let query = authClient
    .from("player_feedbacks")
    .select(
      "id, user_id, email, subject, message, status, category, admin_notes, admin_reply, created_at, updated_at"
    )
    .order("created_at", { ascending: false });

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`讀取玩家反饋失敗：${error.message}`);
  }

  return (data ?? []) as AdminFeedbackRecord[];
}

export async function resolveFeedback(
  authClient: SupabaseClient,
  feedbackId: string,
  patch?: {
    category?: FeedbackCategory;
    admin_notes?: string | null;
    admin_reply?: string | null;
  }
) {
  const updates: Record<string, unknown> = {
    status: "resolved",
    updated_at: new Date().toISOString(),
  };

  if (patch?.category) updates.category = patch.category;
  if (patch?.admin_notes !== undefined) {
    updates.admin_notes = patch.admin_notes?.trim() || null;
  }
  if (patch?.admin_reply !== undefined) {
    updates.admin_reply = patch.admin_reply?.trim() || null;
  }

  const { data, error } = await authClient
    .from("player_feedbacks")
    .update(updates)
    .eq("id", feedbackId)
    .select(
      "id, user_id, email, subject, message, status, category, admin_notes, admin_reply, created_at, updated_at"
    )
    .maybeSingle();

  if (error) {
    throw new Error(`更新反饋狀態失敗：${error.message}`);
  }

  if (!data) {
    throw new Error("找不到此反饋");
  }

  return data as AdminFeedbackRecord;
}

export async function listAdminLogs(
  authClient: SupabaseClient,
  options: {
    limit?: number;
    action?: string | null;
    offset?: number;
  } = {}
): Promise<AdminLogRecord[]> {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 500);
  const offset = Math.max(options.offset ?? 0, 0);

  let query = authClient
    .from("admin_logs")
    .select("id, admin_id, action, details, created_at")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (options.action && options.action !== "all") {
    query = query.eq("action", options.action);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`讀取操作日誌失敗：${error.message}`);
  }

  return (data ?? []) as AdminLogRecord[];
}

export function adminLogsToCsv(logs: AdminLogRecord[]) {
  const header = ["id", "admin_id", "action", "details", "created_at"];
  const rows = logs.map((log) =>
    [
      log.id,
      log.admin_id,
      log.action,
      (log.details ?? "").replace(/"/g, '""'),
      log.created_at,
    ]
      .map((value) => `"${String(value).replace(/\n/g, " ")}"`)
      .join(",")
  );
  return [header.join(","), ...rows].join("\n");
}

export async function writeAdminLog(
  authClient: SupabaseClient,
  adminId: string,
  action: string,
  details?: string | null
) {
  const { error } = await authClient.from("admin_logs").insert({
    admin_id: adminId,
    action,
    details: details?.trim() || null,
  });

  if (error) {
    throw new Error(`寫入操作日誌失敗：${error.message}`);
  }
}

export async function getAdminStats() {
  const supabase = createServerSupabase();

  const [pendingGames, unreadFeedbacks] = await Promise.all([
    supabase
      .from("games")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("player_feedbacks")
      .select("id", { count: "exact", head: true })
      .eq("status", "unread"),
  ]);

  if (pendingGames.error) {
    throw new Error(`讀取統計失敗：${pendingGames.error.message}`);
  }

  if (unreadFeedbacks.error) {
    throw new Error(`讀取統計失敗：${unreadFeedbacks.error.message}`);
  }

  return {
    pendingGames: pendingGames.count ?? 0,
    unreadFeedbacks: unreadFeedbacks.count ?? 0,
  };
}

export async function deleteGameAsAdmin(
  gameId: number,
  violationReason?: string | null
) {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("games")
    .select("id, title, cover_url, game_url, creator_id")
    .eq("id", gameId)
    .maybeSingle();

  if (error) {
    throw new Error(`讀取遊戲失敗：${error.message}`);
  }

  if (!data) {
    throw new Error("找不到此遊戲");
  }

  await deleteGameAndAssets(supabase, data, { mode: "admin" });

  const reason = violationReason?.trim();
  const logDetails = reason
    ? `違規刪除遊戲 #${gameId}「${data.title}」：${reason}`
    : `違規刪除遊戲 #${gameId}「${data.title}」`;

  return {
    game: data as unknown as AdminGameRecord,
    logDetails,
  };
}
