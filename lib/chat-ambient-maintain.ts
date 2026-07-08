import {
  bootstrapAmbientCreatorChat,
  bootstrapAmbientWorldChat,
  postAmbientCreatorChat,
  postAmbientWorldChat,
} from "@/lib/chat-ambient-service";
import { CHAT_LIMITS, type ChatChannel } from "@/lib/chat";
import { createServerSupabase } from "@/lib/supabase-server";

const SEED_COOLDOWN_MS = 10 * 60_000;
const lastSeedAt: Partial<Record<ChatChannel, number>> = {};
const lastDevPostAt: Partial<Record<ChatChannel, number>> = {};

const DEV_POST_INTERVAL_MS: Record<ChatChannel, number> = {
  world: 5 * 60_000,
  creator: 45 * 60_000,
};

function historyCutoffIso() {
  return new Date(
    Date.now() - CHAT_LIMITS.historyDays * 86_400_000
  ).toISOString();
}

function canRun(key: "seed" | "post", channel: ChatChannel, cooldownMs: number) {
  const store = key === "seed" ? lastSeedAt : lastDevPostAt;
  const last = store[channel] ?? 0;
  if (Date.now() - last < cooldownMs) return false;
  store[channel] = Date.now();
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

/** 頻道無訊息時灌入初始對話；本機開發時模擬 cron 持續發言 */
export async function maintainAmbientChat(channel: ChatChannel) {
  const messageCount = await countRecentMessages(channel);

  if (messageCount === 0) {
    if (!canRun("seed", channel, SEED_COOLDOWN_MS)) return;
    if (channel === "world") {
      await bootstrapAmbientWorldChat(14);
    } else {
      await bootstrapAmbientCreatorChat(8);
    }
    return;
  }

  if (process.env.NODE_ENV !== "development") return;

  const interval = DEV_POST_INTERVAL_MS[channel];
  const age = await latestMessageAgeMs(channel);
  if (age < interval) return;
  if (!canRun("post", channel, interval)) return;

  if (channel === "world") {
    await postAmbientWorldChat();
  } else {
    await postAmbientCreatorChat();
  }
}
