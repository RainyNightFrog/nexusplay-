import { pickVirtualDmReply } from "@/lib/virtual-dm-replies";
import type { VirtualContactSummary, VirtualDmMessage } from "@/lib/virtual-dm";
import { getVirtualPlayerAvatarUrl } from "@/lib/virtual-player-avatar";
import { getVirtualPlayerById } from "@/lib/virtual-players";
import type { SupabaseClient } from "@supabase/supabase-js";

const DM_LIMIT = 80;

type DmRow = {
  id: string;
  virtual_player_id: string;
  sender: "user" | "virtual";
  content: string;
  created_at: string;
};

function isMissingDmTable(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    error.message?.includes("chat_virtual_dm_messages") ||
    error.message?.includes("schema cache")
  );
}

export async function listVirtualContacts(
  supabase: SupabaseClient,
  userId: string
): Promise<VirtualContactSummary[]> {
  const { data: recent, error } = await supabase
    .from("chat_virtual_dm_messages")
    .select("virtual_player_id, content, created_at, sender")
    .eq("user_id", userId)
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

  return [...lastByPlayer.entries()]
    .map(([playerId, last]) => {
      const player = getVirtualPlayerById(playerId);
      if (!player) return null;
      return {
        id: player.id,
        displayName: player.displayName,
        locale: player.locale,
        avatarUrl: getVirtualPlayerAvatarUrl(player.id),
        lastMessage: last.content,
        lastMessageAt: last.created_at,
      };
    })
    .filter((row): row is VirtualContactSummary => Boolean(row))
    .sort((a, b) => {
      const aTime = a.lastMessageAt ? Date.parse(a.lastMessageAt) : 0;
      const bTime = b.lastMessageAt ? Date.parse(b.lastMessageAt) : 0;
      if (aTime !== bTime) return bTime - aTime;
      return a.displayName.localeCompare(b.displayName, "zh-HK");
    });
}

export async function listVirtualDmMessages(
  supabase: SupabaseClient,
  userId: string,
  virtualPlayerId: string
): Promise<VirtualDmMessage[]> {
  const player = getVirtualPlayerById(virtualPlayerId);
  if (!player) {
    throw new Error("找不到此虛擬玩家");
  }

  const { data, error } = await supabase
    .from("chat_virtual_dm_messages")
    .select("id, virtual_player_id, sender, content, created_at")
    .eq("user_id", userId)
    .eq("virtual_player_id", virtualPlayerId)
    .order("created_at", { ascending: true })
    .limit(DM_LIMIT);

  if (error) {
    if (isMissingDmTable(error)) return [];
    throw new Error(error.message);
  }

  return ((data ?? []) as DmRow[]).map((row) => ({
    id: row.id,
    virtual_player_id: row.virtual_player_id,
    sender: row.sender,
    content: row.content,
    created_at: row.created_at,
  }));
}

export async function sendVirtualDmMessage(
  supabase: SupabaseClient,
  userId: string,
  virtualPlayerId: string,
  content: string
): Promise<VirtualDmMessage[]> {
  const player = getVirtualPlayerById(virtualPlayerId);
  if (!player) {
    throw new Error("找不到此虛擬玩家");
  }

  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error("訊息不可為空");
  }
  if (trimmed.length > 500) {
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
      throw new Error("通訊錄尚未初始化，請執行 npm run db:chat-contacts");
    }
    throw new Error(insertUserError.message);
  }

  const reply = pickVirtualDmReply(player, trimmed);
  const replyDelayMs = 800 + Math.floor(Math.random() * 1200);

  await new Promise((resolve) => setTimeout(resolve, replyDelayMs));

  const { error: insertReplyError } = await supabase
    .from("chat_virtual_dm_messages")
    .insert({
      user_id: userId,
      virtual_player_id: virtualPlayerId,
      sender: "virtual",
      content: reply,
    });

  if (insertReplyError) {
    throw new Error(insertReplyError.message);
  }

  return listVirtualDmMessages(supabase, userId, virtualPlayerId);
}
