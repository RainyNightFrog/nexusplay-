import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SUPPORT_CHAT_LIMITS,
  type AdminSupportThread,
  type CreatorAdminContactSummary,
  type SupportMessage,
  type SupportMessageSenderType,
  type SupportThreadStatus,
  type SupportThreadSummary,
  ADMIN_SUPPORT_CONTACT_ID,
} from "@/lib/support-chat";

type ThreadRow = {
  id: string;
  user_id: string;
  status: SupportThreadStatus;
  last_message_at: string;
  last_message_preview: string | null;
  unread_by_admin: boolean;
  unread_by_user: boolean;
  created_at: string;
};

type MessageRow = {
  id: string;
  thread_id: string;
  sender_type: SupportMessageSenderType;
  sender_user_id: string;
  content: string;
  created_at: string;
};

function historyCutoffIso() {
  return new Date(
    Date.now() - SUPPORT_CHAT_LIMITS.historyDays * 86_400_000
  ).toISOString();
}

function previewContent(content: string) {
  const trimmed = content.trim();
  return trimmed.length > 80 ? `${trimmed.slice(0, 80)}…` : trimmed;
}

function isMissingSupportTable(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    error.message?.includes("support_threads") ||
    error.message?.includes("support_messages") ||
    error.message?.includes("schema cache")
  );
}

export async function isCreatorAccount(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("role, is_admin")
    .eq("id", userId)
    .maybeSingle();

  if (error) return false;
  return data?.role === "creator" || data?.is_admin === true;
}

async function getDisplayName(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();

  return data?.display_name?.trim() || "用戶";
}

export async function getOrCreateSupportThread(
  supabase: SupabaseClient,
  userId: string
): Promise<SupportThreadSummary> {
  const { data: existing, error: readError } = await supabase
    .from("support_threads")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (readError && !isMissingSupportTable(readError)) {
    throw new Error(readError.message);
  }

  if (existing) {
    return existing as ThreadRow;
  }

  const { data: created, error: createError } = await supabase
    .from("support_threads")
    .insert({ user_id: userId })
    .select("*")
    .single();

  if (createError) {
    if (isMissingSupportTable(createError)) {
      throw new Error("支援對話尚未啟用，請聯絡平台管理員");
    }
    throw new Error(createError.message);
  }

  return created as ThreadRow;
}

export async function getCreatorAdminContactSummary(
  supabase: SupabaseClient,
  userId: string
): Promise<CreatorAdminContactSummary> {
  const { data, error } = await supabase
    .from("support_threads")
    .select("last_message_preview, last_message_at, unread_by_user")
    .eq("user_id", userId)
    .maybeSingle();

  if (error && !isMissingSupportTable(error)) {
    throw new Error(error.message);
  }

  return {
    id: ADMIN_SUPPORT_CONTACT_ID,
    displayName: "管理員對話",
    avatarUrl: "/brand-icon.png",
    lastMessage: data?.last_message_preview ?? null,
    lastMessageAt: data?.last_message_at ?? null,
    unread: data?.unread_by_user === true,
    pinned: true,
  };
}

export async function listCreatorSupportMessages(
  supabase: SupabaseClient,
  userId: string
): Promise<{ thread: SupportThreadSummary; messages: SupportMessage[] }> {
  const thread = await getOrCreateSupportThread(supabase, userId);
  const cutoff = historyCutoffIso();

  const { data, error } = await supabase
    .from("support_messages")
    .select("id, thread_id, sender_type, sender_user_id, content, created_at")
    .eq("thread_id", thread.id)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(SUPPORT_CHAT_LIMITS.pageSize);

  if (error) {
    if (isMissingSupportTable(error)) {
      return { thread, messages: [] };
    }
    throw new Error(error.message);
  }

  const rows = (data ?? []) as MessageRow[];
  const nameCache = new Map<string, string>();

  const messages: SupportMessage[] = [];
  for (const row of rows) {
    let senderName = nameCache.get(row.sender_user_id);
    if (!senderName) {
      senderName =
        row.sender_type === "admin"
          ? "平台管理員"
          : await getDisplayName(supabase, row.sender_user_id);
      nameCache.set(row.sender_user_id, senderName);
    }

    messages.push({
      id: row.id,
      thread_id: row.thread_id,
      sender_type: row.sender_type,
      sender_user_id: row.sender_user_id,
      sender_display_name: senderName,
      content: row.content,
      created_at: row.created_at,
      is_own: row.sender_type === "user" && row.sender_user_id === userId,
    });
  }

  await supabase
    .from("support_threads")
    .update({ unread_by_user: false })
    .eq("id", thread.id)
    .eq("user_id", userId);

  return { thread, messages };
}

export async function sendCreatorSupportMessage(
  supabase: SupabaseClient,
  userId: string,
  content: string
): Promise<SupportMessage> {
  const trimmed = content.trim();
  if (
    trimmed.length < 1 ||
    trimmed.length > SUPPORT_CHAT_LIMITS.content
  ) {
    throw new Error("訊息長度不符合限制");
  }

  const thread = await getOrCreateSupportThread(supabase, userId);
  const now = new Date().toISOString();

  const { data: inserted, error: insertError } = await supabase
    .from("support_messages")
    .insert({
      thread_id: thread.id,
      sender_type: "user",
      sender_user_id: userId,
      content: trimmed,
    })
    .select("id, thread_id, sender_type, sender_user_id, content, created_at")
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  const { error: updateError } = await supabase
    .from("support_threads")
    .update({
      status: "open",
      last_message_at: now,
      last_message_preview: previewContent(trimmed),
      unread_by_admin: true,
      unread_by_user: false,
    })
    .eq("id", thread.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const row = inserted as MessageRow;
  return {
    id: row.id,
    thread_id: row.thread_id,
    sender_type: row.sender_type,
    sender_user_id: row.sender_user_id,
    sender_display_name: await getDisplayName(supabase, userId),
    content: row.content,
    created_at: row.created_at,
    is_own: true,
  };
}

export async function listAdminSupportThreads(
  supabase: SupabaseClient
): Promise<AdminSupportThread[]> {
  const { data, error } = await supabase
    .from("support_threads")
    .select("*")
    .order("last_message_at", { ascending: false })
    .limit(200);

  if (error) {
    if (isMissingSupportTable(error)) return [];
    throw new Error(error.message);
  }

  const threads = (data ?? []) as ThreadRow[];
  const results: AdminSupportThread[] = [];

  for (const thread of threads) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, role")
      .eq("id", thread.user_id)
      .maybeSingle();

    results.push({
      ...thread,
      creator_display_name: profile?.display_name?.trim() || "創作者",
      creator_role: profile?.role ?? "creator",
    });
  }

  return results;
}

export async function listAdminSupportMessages(
  supabase: SupabaseClient,
  threadId: string,
  adminUserId: string
): Promise<SupportMessage[]> {
  const cutoff = historyCutoffIso();
  const { data, error } = await supabase
    .from("support_messages")
    .select("id, thread_id, sender_type, sender_user_id, content, created_at")
    .eq("thread_id", threadId)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(SUPPORT_CHAT_LIMITS.pageSize);

  if (error) {
    if (isMissingSupportTable(error)) return [];
    throw new Error(error.message);
  }

  await supabase
    .from("support_threads")
    .update({ unread_by_admin: false })
    .eq("id", threadId);

  const rows = (data ?? []) as MessageRow[];
  const nameCache = new Map<string, string>();
  const messages: SupportMessage[] = [];

  for (const row of rows) {
    let senderName = nameCache.get(row.sender_user_id);
    if (!senderName) {
      senderName =
        row.sender_type === "admin"
          ? "平台管理員"
          : await getDisplayName(supabase, row.sender_user_id);
      nameCache.set(row.sender_user_id, senderName);
    }

    messages.push({
      id: row.id,
      thread_id: row.thread_id,
      sender_type: row.sender_type,
      sender_user_id: row.sender_user_id,
      sender_display_name: senderName,
      content: row.content,
      created_at: row.created_at,
      is_own: row.sender_user_id === adminUserId,
    });
  }

  return messages;
}

export async function sendAdminSupportMessage(
  supabase: SupabaseClient,
  threadId: string,
  adminUserId: string,
  content: string
): Promise<SupportMessage> {
  const trimmed = content.trim();
  if (
    trimmed.length < 1 ||
    trimmed.length > SUPPORT_CHAT_LIMITS.content
  ) {
    throw new Error("訊息長度不符合限制");
  }

  const now = new Date().toISOString();

  const { data: inserted, error: insertError } = await supabase
    .from("support_messages")
    .insert({
      thread_id: threadId,
      sender_type: "admin",
      sender_user_id: adminUserId,
      content: trimmed,
    })
    .select("id, thread_id, sender_type, sender_user_id, content, created_at")
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  const { error: updateError } = await supabase
    .from("support_threads")
    .update({
      status: "open",
      last_message_at: now,
      last_message_preview: previewContent(trimmed),
      unread_by_admin: false,
      unread_by_user: true,
    })
    .eq("id", threadId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const row = inserted as MessageRow;
  return {
    id: row.id,
    thread_id: row.thread_id,
    sender_type: row.sender_type,
    sender_user_id: row.sender_user_id,
    sender_display_name: "平台管理員",
    content: row.content,
    created_at: row.created_at,
    is_own: true,
  };
}

export async function updateAdminSupportThread(
  supabase: SupabaseClient,
  threadId: string,
  patch: { status?: SupportThreadStatus }
) {
  const { error } = await supabase
    .from("support_threads")
    .update(patch)
    .eq("id", threadId);

  if (error) {
    throw new Error(error.message);
  }
}
