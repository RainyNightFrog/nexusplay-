import { createServerSupabase } from "@/lib/supabase-server";

export type AdminChatMessageRecord = {
  id: string;
  channel: string;
  userId: string;
  authorName: string;
  content: string;
  recalledAt: string | null;
  createdAt: string;
};

export async function listAdminChatMessages(params: {
  channel?: "world" | "creator" | "all";
  userId?: string;
  limit?: number;
}): Promise<AdminChatMessageRecord[]> {
  const supabase = createServerSupabase();
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 100);

  let query = supabase
    .from("chat_messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (params.channel && params.channel !== "all") {
    query = query.eq("channel", params.channel);
  }

  if (params.userId) {
    query = query.eq("user_id", params.userId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const records = data ?? [];
  const userIds = [...new Set(records.map((row) => row.user_id as string))];
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, display_name").in("id", userIds)
    : { data: [] };

  const profileMap = new Map(
    (profiles ?? []).map((profile) => [
      profile.id as string,
      (profile.display_name as string) ?? "",
    ])
  );

  return records.map((message) => ({
    id: message.id as string,
    channel: message.channel as string,
    userId: message.user_id as string,
    authorName:
      profileMap.get(message.user_id as string) ??
      (message.user_id as string).slice(0, 8),
    content: message.content as string,
    recalledAt: (message.recalled_at as string | null) ?? null,
    createdAt: message.created_at as string,
  }));
}

export async function deleteAdminChatMessage(messageId: string) {
  const supabase = createServerSupabase();
  const { error } = await supabase
    .from("chat_messages")
    .delete()
    .eq("id", messageId);

  if (error) throw new Error(error.message);
  return { messageId, deleted: true };
}

export async function recallAdminChatMessage(messageId: string) {
  const supabase = createServerSupabase();
  const { error } = await supabase
    .from("chat_messages")
    .update({
      content: "[管理員已移除]",
      recalled_at: new Date().toISOString(),
    })
    .eq("id", messageId);

  if (error) throw new Error(error.message);
  return { messageId, recalled: true };
}
