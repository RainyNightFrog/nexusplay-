import {
  getVirtualDmReplyDelayMs,
  pickVirtualDmReply,
} from "@/lib/virtual-dm-replies";
import type { VirtualContactSummary, VirtualDmMessage } from "@/lib/virtual-dm";
import { VIRTUAL_DM_LIMITS } from "@/lib/virtual-dm";
import { resolveVirtualPlayerAvatarUrl } from "@/lib/virtual-player-avatar";
import { getVirtualPlayerById } from "@/lib/virtual-players";
import { createServerSupabase } from "@/lib/supabase-server";
import type { SupabaseClient } from "@supabase/supabase-js";

function dmHistoryCutoffIso() {
  return new Date(
    Date.now() - VIRTUAL_DM_LIMITS.historyDays * 86_400_000
  ).toISOString();
}

type DmRow = {
  id: string;
  virtual_player_id: string;
  sender: "user" | "virtual";
  content: string;
  created_at: string;
};

function isMissingDmTable(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  if (error.code === "PGRST205") return true;
  const message = error.message ?? "";
  return (
    message.includes("schema cache") &&
    message.includes("chat_virtual_dm_messages")
  );
}

function mapRows(rows: DmRow[]): VirtualDmMessage[] {
  return rows.map((row) => ({
    id: row.id,
    virtual_player_id: row.virtual_player_id,
    sender: row.sender,
    content: row.content,
    created_at: row.created_at,
  }));
}

export async function listVirtualContacts(
  supabase: SupabaseClient,
  userId: string
): Promise<VirtualContactSummary[]> {
  const cutoff = dmHistoryCutoffIso();
  const { data: recent, error } = await supabase
    .from("chat_virtual_dm_messages")
    .select("virtual_player_id, content, created_at, sender")
    .eq("user_id", userId)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    if (isMissingDmTable(error)) {
      return [];
    }
    throw new Error(error.message);
  }

  const lastByPlayer = new Map<
    string,
    { content: string; created_at: string }
  >();

  for (const row of recent ?? []) {
    const playerId = row.virtual_player_id as string;
    if (!lastByPlayer.has(playerId)) {
      lastByPlayer.set(playerId, {
        content: row.content as string,
        created_at: row.created_at as string,
      });
    }
  }

  // 開啟通訊錄時順便派發到期回覆
  await deliverDueVirtualDmRepliesForUser(supabase, userId, [
    ...lastByPlayer.keys(),
  ]);

  return [...lastByPlayer.entries()]
    .map(([playerId, last]) => {
      const player = getVirtualPlayerById(playerId);
      if (!player) return null;
      const contact: VirtualContactSummary = {
        id: player.id,
        displayName: player.displayName,
        locale: player.locale,
        avatarUrl: resolveVirtualPlayerAvatarUrl(player.id),
        lastMessage: last.content,
        lastMessageAt: last.created_at,
        equippedTitle: null,
      };
      return contact;
    })
    .filter((row): row is VirtualContactSummary => row !== null)
    .sort((a, b) => {
      const aTime = a.lastMessageAt ? Date.parse(a.lastMessageAt) : 0;
      const bTime = b.lastMessageAt ? Date.parse(b.lastMessageAt) : 0;
      if (aTime !== bTime) return bTime - aTime;
      return a.displayName.localeCompare(b.displayName, "zh-HK");
    });
}

async function fetchVirtualDmRows(
  supabase: SupabaseClient,
  userId: string,
  virtualPlayerId: string
): Promise<DmRow[]> {
  const cutoff = dmHistoryCutoffIso();
  const { data, error } = await supabase
    .from("chat_virtual_dm_messages")
    .select("id, virtual_player_id, sender, content, created_at")
    .eq("user_id", userId)
    .eq("virtual_player_id", virtualPlayerId)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(VIRTUAL_DM_LIMITS.pageSize);

  if (error) {
    if (isMissingDmTable(error)) return [];
    throw new Error(error.message);
  }

  return (data ?? []) as DmRow[];
}

/**
 * 若上一輪回覆之後用戶已留言，且距「第一則未回覆」已滿本輪延遲（隨機 2～80 分），
 * 則只插入一句口語回覆（對接近期對話）。
 */
export async function maybeDeliverVirtualDmReply(
  supabase: SupabaseClient,
  userId: string,
  virtualPlayerId: string
): Promise<boolean> {
  const player = getVirtualPlayerById(virtualPlayerId);
  if (!player) return false;

  const rows = await fetchVirtualDmRows(supabase, userId, virtualPlayerId);
  if (rows.length === 0) return false;

  let lastVirtualIndex = -1;
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    if (rows[i]!.sender === "virtual") {
      lastVirtualIndex = i;
      break;
    }
  }

  const unanswered = rows
    .slice(lastVirtualIndex + 1)
    .filter((row) => row.sender === "user");
  if (unanswered.length === 0) return false;

  const firstUnanswered = unanswered[0]!;
  const firstUnansweredAt = Date.parse(firstUnanswered.created_at);
  if (!Number.isFinite(firstUnansweredAt)) return false;

  const delayMs = getVirtualDmReplyDelayMs(
    userId,
    virtualPlayerId,
    firstUnanswered.id || firstUnanswered.created_at
  );
  if (Date.now() - firstUnansweredAt < delayMs) return false;

  const recentVirtual = rows
    .filter((row) => row.sender === "virtual")
    .slice(-5)
    .map((row) => row.content);
  const reply = pickVirtualDmReply(
    player,
    unanswered.map((row) => row.content),
    recentVirtual
  );

  const { error } = await supabase.from("chat_virtual_dm_messages").insert({
    user_id: userId,
    virtual_player_id: virtualPlayerId,
    sender: "virtual",
    content: reply,
  });

  if (error) {
    if (isMissingDmTable(error)) return false;
    throw new Error(error.message);
  }

  return true;
}

async function deliverDueVirtualDmRepliesForUser(
  supabase: SupabaseClient,
  userId: string,
  playerIds: string[]
) {
  for (const playerId of playerIds) {
    try {
      await maybeDeliverVirtualDmReply(supabase, userId, playerId);
    } catch {
      // 單一路徑失敗不阻斷其他對話
    }
  }
}

export async function listVirtualDmMessages(
  supabase: SupabaseClient,
  userId: string,
  virtualPlayerId: string
): Promise<VirtualDmMessage[]> {
  const player = getVirtualPlayerById(virtualPlayerId);
  if (!player) {
    throw new Error("找不到此玩家");
  }

  await maybeDeliverVirtualDmReply(supabase, userId, virtualPlayerId);
  const rows = await fetchVirtualDmRows(supabase, userId, virtualPlayerId);
  return mapRows(rows);
}

export async function sendVirtualDmMessage(
  supabase: SupabaseClient,
  userId: string,
  virtualPlayerId: string,
  content: string
): Promise<VirtualDmMessage[]> {
  const player = getVirtualPlayerById(virtualPlayerId);
  if (!player) {
    throw new Error("找不到此玩家");
  }

  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error("訊息不可為空");
  }
  if (trimmed.length > VIRTUAL_DM_LIMITS.content) {
    throw new Error("訊息過長");
  }

  const { error: insertUserError } = await supabase
    .from("chat_virtual_dm_messages")
    .insert({
      user_id: userId,
      virtual_player_id: virtualPlayerId,
      sender: "user",
      content: trimmed,
    });

  if (insertUserError) {
    if (isMissingDmTable(insertUserError)) {
      throw new Error("私訊功能尚未啟用，請稍後再試");
    }
    throw new Error(insertUserError.message);
  }

  // 不即時回覆：2～80 分鐘後由 list／cron 派發一句口語回覆
  await maybeDeliverVirtualDmReply(supabase, userId, virtualPlayerId);
  return listVirtualDmMessages(supabase, userId, virtualPlayerId);
}

/** Cron：掃描近期有用戶訊息的對話，派發到期回覆 */
export async function deliverDueVirtualDmReplies() {
  const supabase = createServerSupabase();
  const since = new Date(Date.now() - 3 * 24 * 60 * 60_000).toISOString();

  const { data, error } = await supabase
    .from("chat_virtual_dm_messages")
    .select("user_id, virtual_player_id")
    .eq("sender", "user")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(400);

  if (error) {
    if (isMissingDmTable(error)) return { delivered: 0 };
    throw new Error(error.message);
  }

  const pairs = new Map<string, { userId: string; playerId: string }>();
  for (const row of data ?? []) {
    const userId = row.user_id as string;
    const playerId = row.virtual_player_id as string;
    pairs.set(`${userId}:${playerId}`, { userId, playerId });
  }

  let delivered = 0;
  for (const pair of pairs.values()) {
    try {
      const ok = await maybeDeliverVirtualDmReply(
        supabase,
        pair.userId,
        pair.playerId
      );
      if (ok) delivered += 1;
    } catch {
      // continue
    }
  }

  return { delivered, checked: pairs.size };
}

export async function cleanupExpiredVirtualDmMessages() {
  const supabase = createServerSupabase();
  const cutoff = dmHistoryCutoffIso();

  const { data, error } = await supabase
    .from("chat_virtual_dm_messages")
    .delete()
    .lt("created_at", cutoff)
    .select("id");

  if (error) throw new Error(error.message);
  return { deleted: data?.length ?? 0, cutoff };
}
