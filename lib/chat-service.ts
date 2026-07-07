import {
  CHAT_LIMITS,
  type ChatChannel,
  type ChatMessage,
  type ChatMessageRecord,
  isValidChatChannel,
} from "@/lib/chat";
import { formatForumAuthor } from "@/lib/forum";
import { createServerSupabase } from "@/lib/supabase-server";
import type { SupabaseClient } from "@supabase/supabase-js";

type AuthorProfile = {
  display_name: string | null;
  avatar_url: string | null;
  role: string | null;
};

function historyCutoffIso() {
  return new Date(
    Date.now() - CHAT_LIMITS.historyDays * 86_400_000
  ).toISOString();
}

async function resolveAuthorProfiles(userIds: string[]) {
  const supabase = createServerSupabase();
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  const profileMap = new Map<string, AuthorProfile>();

  if (uniqueIds.length === 0) return profileMap;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, role")
    .in("id", uniqueIds);

  for (const userId of uniqueIds) {
    const profile = profiles?.find((row) => row.id === userId);
    profileMap.set(userId, {
      display_name: profile?.display_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
      role: profile?.role ?? null,
    });
  }

  return profileMap;
}

function mapChatMessage(
  record: ChatMessageRecord,
  profileMap: Map<string, AuthorProfile>,
  viewerId?: string
): ChatMessage {
  const profile = profileMap.get(record.user_id);
  const displayName = profile?.display_name ?? null;

  return {
    ...record,
    author_name: formatForumAuthor(record.user_id, displayName),
    author_avatar_url: profile?.avatar_url ?? null,
    is_creator: profile?.role === "creator",
    is_own: viewerId ? record.user_id === viewerId : false,
  };
}

export async function listChatMessages(
  channel: ChatChannel,
  viewerId?: string,
  options?: { before?: string; limit?: number }
): Promise<ChatMessage[]> {
  const supabase = createServerSupabase();
  const limit = Math.min(options?.limit ?? CHAT_LIMITS.pageSize, 100);
  const cutoff = historyCutoffIso();

  let query = supabase
    .from("chat_messages")
    .select("*")
    .eq("channel", channel)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options?.before) {
    query = query.lt("created_at", options.before);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const records = (data ?? []) as ChatMessageRecord[];
  const profileMap = await resolveAuthorProfiles(records.map((row) => row.user_id));

  return records
    .map((record) => mapChatMessage(record, profileMap, viewerId))
    .reverse();
}

export async function assertCanPostInChannel(
  supabase: SupabaseClient,
  userId: string,
  channel: ChatChannel
) {
  if (channel !== "creator") return;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (profile?.role !== "creator") {
    throw new Error("僅創作者可在創作者頻道發言");
  }
}

export async function checkChatRateLimit(
  supabase: SupabaseClient,
  userId: string,
  content: string
) {
  const sinceMinute = new Date(Date.now() - 60_000).toISOString();
  const sinceDuplicate = new Date(
    Date.now() - CHAT_LIMITS.duplicateWindowMs
  ).toISOString();

  const { data: recent, error } = await supabase
    .from("chat_messages")
    .select("content, created_at")
    .eq("user_id", userId)
    .gte("created_at", sinceMinute)
    .order("created_at", { ascending: false })
    .limit(CHAT_LIMITS.maxPerMinute);

  if (error) throw new Error(error.message);

  const messages = recent ?? [];
  const latest = messages[0];

  if (latest) {
    const elapsed = Date.now() - new Date(latest.created_at).getTime();
    if (elapsed < CHAT_LIMITS.minIntervalMs) {
      throw new Error("發言過快，請稍候再試");
    }
  }

  if (messages.length >= CHAT_LIMITS.maxPerMinute) {
    throw new Error("發言過於頻繁，請稍後再試");
  }

  const duplicate = messages.find(
    (row) =>
      row.content === content &&
      new Date(row.created_at).getTime() >=
        Date.now() - CHAT_LIMITS.duplicateWindowMs
  );

  if (duplicate) {
    throw new Error("請勿重複發送相同內容");
  }

  const { data: olderDuplicate } = await supabase
    .from("chat_messages")
    .select("id")
    .eq("user_id", userId)
    .eq("content", content)
    .gte("created_at", sinceDuplicate)
    .limit(1)
    .maybeSingle();

  if (olderDuplicate) {
    throw new Error("請勿重複發送相同內容");
  }
}

export async function createChatMessage(
  input: {
    channel: ChatChannel;
    userId: string;
    content: string;
  },
  supabase: SupabaseClient
): Promise<ChatMessage> {
  if (!isValidChatChannel(input.channel)) {
    throw new Error("無效的聊天頻道");
  }

  await assertCanPostInChannel(supabase, input.userId, input.channel);
  await checkChatRateLimit(supabase, input.userId, input.content);

  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      channel: input.channel,
      user_id: input.userId,
      content: input.content,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  const record = data as ChatMessageRecord;
  const profileMap = await resolveAuthorProfiles([record.user_id]);
  return mapChatMessage(record, profileMap, input.userId);
}

export async function recallChatMessage(
  messageId: string,
  userId: string,
  supabase: SupabaseClient
): Promise<ChatMessage> {
  const { data: existing, error: readError } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("id", messageId)
    .maybeSingle();

  if (readError) throw new Error(readError.message);
  if (!existing) throw new Error("訊息不存在");
  if (existing.user_id !== userId) throw new Error("只能回收自己的訊息");
  if (existing.recalled_at) throw new Error("訊息已回收");

  const age = Date.now() - new Date(existing.created_at).getTime();
  if (age > CHAT_LIMITS.recallWindowMs) {
    throw new Error("超過可回收時間（2 分鐘）");
  }

  const { data, error } = await supabase
    .from("chat_messages")
    .update({ recalled_at: new Date().toISOString() })
    .eq("id", messageId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  const record = data as ChatMessageRecord;
  const profileMap = await resolveAuthorProfiles([record.user_id]);
  return mapChatMessage(record, profileMap, userId);
}

export async function cleanupExpiredChatMessages() {
  const supabase = createServerSupabase();
  const cutoff = historyCutoffIso();

  const { data, error } = await supabase
    .from("chat_messages")
    .delete()
    .lt("created_at", cutoff)
    .select("id");

  if (error) throw new Error(error.message);
  return { deleted: data?.length ?? 0, cutoff };
}
