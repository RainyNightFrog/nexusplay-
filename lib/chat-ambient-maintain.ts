import {
  bootstrapAmbientCreatorChat,
  bootstrapAmbientWorldChat,
  postAmbientCreatorChat,
  postAmbientWorldChat,
} from "@/lib/chat-ambient-service";
import {
  AMBIENT_POST_INTERVAL_MS,
  AMBIENT_SEED_COOLDOWN_MS,
} from "@/lib/chat-ambient-schedule";
import { CHAT_LIMITS, type ChatChannel } from "@/lib/chat";
import { createServerSupabase } from "@/lib/supabase-server";

const lastSeedAt: Partial<Record<ChatChannel, number>> = {};

function historyCutoffIso() {
  return new Date(
    Date.now() - CHAT_LIMITS.historyDays * 86_400_000
  ).toISOString();
}

function canSeed(channel: ChatChannel) {
  const last = lastSeedAt[channel] ?? 0;
  if (Date.now() - last < AMBIENT_SEED_COOLDOWN_MS) return false;
  lastSeedAt[channel] = Date.now();
  return true;
}

async function countRecentMessages(channel: ChatChannel) {
  const supabase = createServerSupabase();
  const { count, error } = await supabase
    .from("chat_messages")
    .select("id", { count: "exact", head: true })
    .eq("channel", channel)
    .gte("created_at", historyCutoffIso());

  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function latestMessageAgeMs(channel: ChatChannel) {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("chat_messages")
    .select("created_at")
    .eq("channel", channel)
    .gte("created_at", historyCutoffIso())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data?.created_at) return Number.POSITIVE_INFINITY;
  return Date.now() - new Date(data.created_at).getTime();
}

/** 頻道無訊息時灌入初始對話；依資料庫時間間隔持續發言（本機與正式環境皆適用） */
export async function maintainAmbientChat(channel: ChatChannel) {
  const messageCount = await countRecentMessages(channel);

  if (messageCount === 0) {
    if (!canSeed(channel)) return;
    if (channel === "world") {
      await bootstrapAmbientWorldChat(14);
    } else {
      await bootstrapAmbientCreatorChat(8);
    }
    return;
  }

  const interval = AMBIENT_POST_INTERVAL_MS[channel];
  const age = await latestMessageAgeMs(channel);
  if (age < interval) return;

  if (channel === "world") {
    await postAmbientWorldChat();
  } else {
    await postAmbientCreatorChat();
  }
}
