import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase-server";
import { shouldSendPushNotification } from "@/lib/notification-prefs-service";
import { sendWebPushToUser } from "@/lib/web-push-service";

export type UserNotificationKind =
  | "tip_received"
  | "forum_reply"
  | "followed_new_game"
  | "wishlist_devlog";

export type UserNotification = {
  id: string;
  kind: UserNotificationKind;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  createdAt: string;
};

export async function createUserNotification(
  input: {
    userId: string;
    kind: UserNotificationKind;
    title: string;
    body: string;
    href?: string | null;
  },
  supabase?: SupabaseClient
) {
  const client = supabase ?? createServerSupabase();
  const { error } = await client.from("user_notifications").insert({
    user_id: input.userId,
    kind: input.kind,
    title: input.title.trim(),
    body: input.body.trim(),
    href: input.href?.trim() || null,
  });

  if (error) throw new Error(error.message);

  void maybeSendWebPush(input).catch(() => undefined);
}

async function maybeSendWebPush(input: {
  userId: string;
  kind: UserNotificationKind;
  title: string;
  body: string;
  href?: string | null;
}) {
  const allowed = await shouldSendPushNotification(input.userId, input.kind);
  if (!allowed) return;

  await sendWebPushToUser(input.userId, {
    title: input.title,
    body: input.body,
    url: input.href ?? null,
  });
}

export async function listUserNotifications(
  userId: string,
  options?: { limit?: number; kind?: UserNotificationKind }
): Promise<UserNotification[]> {
  const supabase = createServerSupabase();
  const limit = options?.limit ?? 40;

  let query = supabase
    .from("user_notifications")
    .select("id, kind, title, body, href, read, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options?.kind) {
    query = query.eq("kind", options.kind);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    kind: row.kind as UserNotificationKind,
    title: row.title as string,
    body: row.body as string,
    href: (row.href as string | null) ?? null,
    read: row.read === true,
    createdAt: row.created_at as string,
  }));
}

export async function readUserUnreadNotificationCount(userId: string) {
  const supabase = createServerSupabase();
  const { count, error } = await supabase
    .from("user_notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function readUserUnreadNotificationCountsByKind(userId: string) {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("user_notifications")
    .select("kind")
    .eq("user_id", userId)
    .eq("read", false);

  if (error) throw new Error(error.message);

  const counts: Record<UserNotificationKind, number> = {
    tip_received: 0,
    forum_reply: 0,
    followed_new_game: 0,
    wishlist_devlog: 0,
  };

  for (const row of data ?? []) {
    const kind = row.kind as UserNotificationKind;
    if (kind in counts) {
      counts[kind] += 1;
    }
  }

  return counts;
}

export async function markAllUserNotificationsRead(userId: string) {
  const supabase = createServerSupabase();
  const { error } = await supabase
    .from("user_notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);

  if (error) throw new Error(error.message);
}

export async function markUserNotificationsReadByKind(
  userId: string,
  kind: UserNotificationKind
) {
  const supabase = createServerSupabase();
  const { error } = await supabase
    .from("user_notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("kind", kind)
    .eq("read", false);

  if (error) throw new Error(error.message);
}

export async function markUserNotificationRead(userId: string, id: string) {
  const supabase = createServerSupabase();
  const { error } = await supabase
    .from("user_notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("id", id);

  if (error) throw new Error(error.message);
}
