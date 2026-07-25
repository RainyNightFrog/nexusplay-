import {
  bootstrapAmbientCreatorChat,
  bootstrapAmbientWorldChat,
  postAmbientCreatorChat,
  postAmbientWorldChat,
} from "@/lib/chat-ambient-service";
import {
  AMBIENT_CATCH_UP_MAX_ROUNDS,
  AMBIENT_POST_INTERVAL_MS,
  AMBIENT_SEED_COOLDOWN_MS,
} from "@/lib/chat-ambient-schedule";
import { CHAT_LIMITS, type ChatChannel } from "@/lib/chat";
import { createServerSupabase } from "@/lib/supabase-server";
import { AMBIENT_BOOTSTRAP_BUDGET_MS } from "@/lib/with-timeout";

const lastSeedAt: Partial<Record<ChatChannel, number>> = {};

function historyCutoffIso() {
  return new Date(
    Date.now() - CHAT_LIMITS.historyDays * 86_400_000
  ).toISOString();
}

function canSeed(channel: ChatChannel) {
  const last = lastSeedAt[channel] ?? 0;
  if (Date.now() - last < AMBIENT_SEED_COOLDOWN_MS) return false;
  return true;
}

function markSeeded(channel: ChatChannel) {
  lastSeedAt[channel] = Date.now();
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
    markSeeded(channel);
    return;
  }

  const interval = AMBIENT_POST_INTERVAL_MS[channel];
  const age = await latestMessageAgeMs(channel);
  if (age < interval) return;

  // 閒置越久補越多輪，時間戳錯開，頻道看起來更持續有人說話
  const maxRounds = AMBIENT_CATCH_UP_MAX_ROUNDS[channel];
  const rounds = Math.min(
    maxRounds,
    Math.max(1, Math.floor(age / interval))
  );
  const staggerMs = Math.max(25_000, Math.floor(interval * 0.4));
  const deadline = Date.now() + AMBIENT_BOOTSTRAP_BUDGET_MS;

  for (let i = 0; i < rounds; i += 1) {
    if (Date.now() >= deadline) break;
    const at = new Date(Date.now() - (rounds - 1 - i) * staggerMs);
    if (channel === "world") {
      await postAmbientWorldChat({ at });
    } else {
      await postAmbientCreatorChat({ at });
    }
  }
}
