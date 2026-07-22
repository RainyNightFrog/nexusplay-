import {
  assertCanPostChat,
  getAccountStatusRecord,
  isAccountRestricted,
} from "@/lib/account-status";
import { getAmbientUserPlayerMap } from "@/lib/ambient-user-index";
import {
  PLAYER_DM_LIMITS,
  type PlayerDmContact,
  type PlayerDmMessage,
  type PlayerDmThreadSummary,
} from "@/lib/player-dm";
import { resolveUserAvatarUrl } from "@/lib/resolve-user-avatar";
import { resolveSupporterProfiles } from "@/lib/supporter-profile";
import {
  getSupporterDisplayTier,
  type SupporterDisplayTier,
} from "@/lib/supporter-tier";
import type { SupabaseClient } from "@supabase/supabase-js";

type ThreadRow = {
  id: string;
  user_low: string;
  user_high: string;
  last_message_at: string;
  last_message_preview: string | null;
  unread_by_low: boolean;
  unread_by_high: boolean;
  created_at: string;
};

type MessageRow = {
  id: string;
  thread_id: string;
  sender_user_id: string;
  content: string;
  created_at: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function historyCutoffIso() {
  return new Date(
    Date.now() - PLAYER_DM_LIMITS.historyDays * 86_400_000
  ).toISOString();
}

function previewContent(content: string) {
  const trimmed = content.trim();
  return trimmed.length > 80 ? `${trimmed.slice(0, 80)}…` : trimmed;
}

/** 僅容忍「表尚未建立／不在 schema cache」；勿把含表名的 RLS／FK 錯誤當缺表 */
function isMissingDmTable(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  if (error.code === "PGRST205") return true;
  const message = error.message ?? "";
  if (!message.includes("schema cache")) return false;
  return (
    message.includes("dm_threads") || message.includes("dm_messages")
  );
}

function orderedPair(a: string, b: string) {
  return a < b
    ? { userLow: a, userHigh: b }
    : { userLow: b, userHigh: a };
}

function peerIdFromThread(thread: ThreadRow, viewerId: string) {
  return thread.user_low === viewerId ? thread.user_high : thread.user_low;
}

function isUnreadForViewer(thread: ThreadRow, viewerId: string) {
  return thread.user_low === viewerId
    ? thread.unread_by_low
    : thread.unread_by_high;
}

async function getProfileBrief(
  supabase: SupabaseClient,
  userId: string
): Promise<{ displayName: string; avatarUrl: string | null }> {
  const { data } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  let metadata: Record<string, unknown> = {};
  try {
    const authRes = await supabase.auth.admin.getUserById(userId);
    metadata = (authRes.data?.user?.user_metadata ?? {}) as Record<
      string,
      unknown
    >;
  } catch {
    metadata = {};
  }

  const avatarUrl = resolveUserAvatarUrl(data?.avatar_url, metadata);

  // profiles 缺頭像但 metadata 有時，補寫回去，之後聊天／私訊可直接讀到
  if (!data?.avatar_url && avatarUrl) {
    void supabase
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", userId);
  }

  return {
    displayName: data?.display_name?.trim() || "玩家",
    avatarUrl,
  };
}

async function assertCanDmPeer(
  supabase: SupabaseClient,
  viewerId: string,
  peerUserId: string
) {
  if (!UUID_RE.test(peerUserId)) {
    throw new Error("無效的玩家");
  }
  if (peerUserId === viewerId) {
    throw new Error("不能私訊自己");
  }

  const ambientMap = await getAmbientUserPlayerMap(supabase);
  if (ambientMap.has(peerUserId) || ambientMap.has(viewerId)) {
    throw new Error("無法與此玩家私訊");
  }

  const [viewerStatus, peerStatus, peerProfile] = await Promise.all([
    getAccountStatusRecord(viewerId),
    getAccountStatusRecord(peerUserId),
    supabase
      .from("profiles")
      .select("id")
      .eq("id", peerUserId)
      .maybeSingle(),
  ]);

  if (viewerStatus && isAccountRestricted(viewerStatus)) {
    throw new Error("帳號已被停權，暫時無法使用此功能");
  }
  if (!peerProfile.data) {
    throw new Error("找不到此玩家");
  }
  if (peerStatus && isAccountRestricted(peerStatus)) {
    throw new Error("無法與此玩家私訊");
  }
}

export async function listPlayerDmContacts(
  supabase: SupabaseClient,
  viewerId: string
): Promise<PlayerDmContact[]> {
  const { data, error } = await supabase
    .from("dm_threads")
    .select("*")
    .or(`user_low.eq.${viewerId},user_high.eq.${viewerId}`)
    .order("last_message_at", { ascending: false })
    .limit(100);

  if (error) {
    if (isMissingDmTable(error)) return [];
    throw new Error(error.message);
  }

  const threads = (data ?? []) as ThreadRow[];
  const contacts: PlayerDmContact[] = [];

  for (const thread of threads) {
    const peerUserId = peerIdFromThread(thread, viewerId);
    const peer = await getProfileBrief(supabase, peerUserId);
    contacts.push({
      threadId: thread.id,
      peerUserId,
      displayName: peer.displayName,
      avatarUrl: peer.avatarUrl,
      lastMessage: thread.last_message_preview,
      lastMessageAt: thread.last_message_at,
      unread: isUnreadForViewer(thread, viewerId),
    });
  }

  return contacts;
}

export async function getOrCreatePlayerDmThread(
  supabase: SupabaseClient,
  viewerId: string,
  peerUserId: string
): Promise<PlayerDmThreadSummary> {
  await assertCanDmPeer(supabase, viewerId, peerUserId);

  const { userLow, userHigh } = orderedPair(viewerId, peerUserId);

  const { data: existing, error: readError } = await supabase
    .from("dm_threads")
    .select("*")
    .eq("user_low", userLow)
    .eq("user_high", userHigh)
    .maybeSingle();

  if (readError && !isMissingDmTable(readError)) {
    throw new Error(readError.message);
  }

  let thread = existing as ThreadRow | null;

  if (!thread) {
    const { data: created, error: createError } = await supabase
      .from("dm_threads")
      .insert({
        user_low: userLow,
        user_high: userHigh,
      })
      .select("*")
      .single();

    if (createError) {
      if (isMissingDmTable(createError)) {
        throw new Error("私訊功能尚未啟用，請稍後再試");
      }
      // 競態：另一端同時建立
      if (createError.code === "23505") {
        const { data: raced } = await supabase
          .from("dm_threads")
          .select("*")
          .eq("user_low", userLow)
          .eq("user_high", userHigh)
          .maybeSingle();
        thread = (raced as ThreadRow | null) ?? null;
      } else {
        throw new Error(createError.message);
      }
    } else {
      thread = created as ThreadRow;
    }
  }

  if (!thread) {
    throw new Error("無法建立私訊對話");
  }

  const peer = await getProfileBrief(supabase, peerUserId);
  return {
    id: thread.id,
    peerUserId,
    peerDisplayName: peer.displayName,
    peerAvatarUrl: peer.avatarUrl,
    lastMessageAt: thread.last_message_at,
    lastMessagePreview: thread.last_message_preview,
    unread: isUnreadForViewer(thread, viewerId),
  };
}

async function resolveDmSupporterTiers(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<Map<string, SupporterDisplayTier>> {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  const tiers = new Map<string, SupporterDisplayTier>();
  if (uniqueIds.length === 0) return tiers;

  const [flags, lifetimeRes] = await Promise.all([
    resolveSupporterProfiles(supabase, uniqueIds),
    supabase
      .from("profiles")
      .select("id, supporter_lifetime")
      .in("id", uniqueIds),
  ]);

  const lifetimeById = new Map(
    (lifetimeRes.data ?? []).map((row) => [
      row.id as string,
      row.supporter_lifetime === true,
    ])
  );

  for (const userId of uniqueIds) {
    const flag = flags.get(userId);
    tiers.set(
      userId,
      getSupporterDisplayTier(
        flag?.isSupporter === true,
        flag?.badge ?? null,
        null,
        lifetimeById.get(userId) === true
      )
    );
  }

  return tiers;
}

/** 確認瀏覽者屬於此私訊對話後回傳 thread */
async function getThreadForViewer(
  supabase: SupabaseClient,
  threadId: string,
  viewerId: string
): Promise<ThreadRow> {
  const { data, error } = await supabase
    .from("dm_threads")
    .select("*")
    .eq("id", threadId)
    .maybeSingle();

  if (error) {
    if (isMissingDmTable(error)) {
      throw new Error("私訊功能尚未啟用，請稍後再試");
    }
    throw new Error(error.message);
  }

  const thread = data as ThreadRow | null;
  if (
    !thread ||
    (thread.user_low !== viewerId && thread.user_high !== viewerId)
  ) {
    throw new Error("找不到此對話");
  }

  return thread;
}

export async function listPlayerDmMessages(
  supabase: SupabaseClient,
  viewerId: string,
  threadId: string
): Promise<{
  thread: PlayerDmThreadSummary;
  messages: PlayerDmMessage[];
}> {
  const thread = await getThreadForViewer(supabase, threadId, viewerId);
  const peerUserId = peerIdFromThread(thread, viewerId);
  const peer = await getProfileBrief(supabase, peerUserId);
  const cutoff = historyCutoffIso();

  const { data, error } = await supabase
    .from("dm_messages")
    .select("id, thread_id, sender_user_id, content, created_at")
    .eq("thread_id", threadId)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(PLAYER_DM_LIMITS.pageSize);

  if (error) {
    if (isMissingDmTable(error)) {
      return {
        thread: {
          id: thread.id,
          peerUserId,
          peerDisplayName: peer.displayName,
          peerAvatarUrl: peer.avatarUrl,
          lastMessageAt: thread.last_message_at,
          lastMessagePreview: thread.last_message_preview,
          unread: false,
        },
        messages: [],
      };
    }
    throw new Error(error.message);
  }

  const clearUnread =
    thread.user_low === viewerId
      ? { unread_by_low: false }
      : { unread_by_high: false };

  await supabase.from("dm_threads").update(clearUnread).eq("id", threadId);

  const nameCache = new Map<string, string>([
    [viewerId, "你"],
    [peerUserId, peer.displayName],
  ]);

  const tierMap = await resolveDmSupporterTiers(supabase, [
    viewerId,
    peerUserId,
  ]);

  const messages: PlayerDmMessage[] = ((data ?? []) as MessageRow[]).map(
    (row) => ({
      id: row.id,
      thread_id: row.thread_id,
      sender_user_id: row.sender_user_id,
      sender_display_name:
        nameCache.get(row.sender_user_id) ??
        (row.sender_user_id === viewerId ? "你" : peer.displayName),
      content: row.content,
      created_at: row.created_at,
      is_own: row.sender_user_id === viewerId,
      sender_supporter_tier: tierMap.get(row.sender_user_id) ?? "none",
    })
  );

  return {
    thread: {
      id: thread.id,
      peerUserId,
      peerDisplayName: peer.displayName,
      peerAvatarUrl: peer.avatarUrl,
      lastMessageAt: thread.last_message_at,
      lastMessagePreview: thread.last_message_preview,
      unread: false,
    },
    messages,
  };
}

export async function sendPlayerDmMessage(
  supabase: SupabaseClient,
  viewerId: string,
  threadId: string,
  content: string
): Promise<PlayerDmMessage> {
  const trimmed = content.trim();
  if (
    trimmed.length < 1 ||
    trimmed.length > PLAYER_DM_LIMITS.content
  ) {
    throw new Error("訊息長度不符合限制");
  }

  await assertCanPostChat(viewerId);

  const thread = await getThreadForViewer(supabase, threadId, viewerId);
  const peerUserId = peerIdFromThread(thread, viewerId);
  await assertCanDmPeer(supabase, viewerId, peerUserId);

  const now = new Date().toISOString();

  const { data: inserted, error: insertError } = await supabase
    .from("dm_messages")
    .insert({
      thread_id: threadId,
      sender_user_id: viewerId,
      content: trimmed,
    })
    .select("id, thread_id, sender_user_id, content, created_at")
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  const unreadPatch =
    thread.user_low === viewerId
      ? { unread_by_low: false, unread_by_high: true }
      : { unread_by_high: false, unread_by_low: true };

  const { error: updateError } = await supabase
    .from("dm_threads")
    .update({
      last_message_at: now,
      last_message_preview: previewContent(trimmed),
      ...unreadPatch,
    })
    .eq("id", threadId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const row = inserted as MessageRow;
  const tierMap = await resolveDmSupporterTiers(supabase, [viewerId]);
  return {
    id: row.id,
    thread_id: row.thread_id,
    sender_user_id: row.sender_user_id,
    sender_display_name: "你",
    content: row.content,
    created_at: row.created_at,
    is_own: true,
    sender_supporter_tier: tierMap.get(viewerId) ?? "none",
  };
}

export async function cleanupExpiredPlayerDmMessages() {
  const supabase = (await import("@/lib/supabase-server")).createServerSupabase();
  const cutoff = historyCutoffIso();
  const { error, count } = await supabase
    .from("dm_messages")
    .delete({ count: "exact" })
    .lt("created_at", cutoff);

  if (error && !isMissingDmTable(error)) {
    throw new Error(error.message);
  }

  return { deleted: count ?? 0 };
}
