import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase-server";

export type QuestPeriodType = "daily" | "weekly";

export type QuestType =
  | "play_games"
  | "post_comment"
  | "leaderboard"
  | "daily_login"
  | "weekly_login_days"
  | "tip_creator"
  | "unlock_achievements";

export type QuestDefinition = {
  id: string;
  code: string;
  periodType: QuestPeriodType;
  questType: QuestType;
  title: string;
  description: string;
  targetCount: number;
  rewardAp: number;
  minCommentLength: number;
  sortOrder: number;
};

export type QuestProgressItem = QuestDefinition & {
  periodKey: string;
  progress: number;
  completed: boolean;
  claimed: boolean;
  claimable: boolean;
};

export type StreakState = {
  streakDays: number;
  longestStreak: number;
  lastLoginDate: string | null;
  calendar: boolean[];
};

export type QuestsDashboard = {
  questDate: string;
  weekKey: string;
  resetsAtDaily: string;
  resetsAtWeekly: string;
  daily: QuestProgressItem[];
  weekly: QuestProgressItem[];
  streak: StreakState;
  claimableCount: number;
};

/** 香港時區日期 YYYY-MM-DD */
export function getQuestDateHongKong(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** 香港時區 ISO 周鍵 YYYY-Www（周一為周首） */
export function getQuestWeekKeyHongKong(now = new Date()): string {
  const dateStr = getQuestDateHongKong(now);
  const [y, m, d] = dateStr.split("-").map(Number);
  const utc = new Date(Date.UTC(y!, m! - 1, d!));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((utc.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7
  );
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function addDaysIso(dateIso: string, delta: number): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  const utc = Date.UTC(y!, m! - 1, d! + delta);
  return new Date(utc).toISOString().slice(0, 10);
}

function nextDailyResetIso(now = new Date()): string {
  const today = getQuestDateHongKong(now);
  const tomorrow = addDaysIso(today, 1);
  return `${tomorrow}T00:00:00+08:00`;
}

function nextWeeklyResetIso(now = new Date()): string {
  const today = getQuestDateHongKong(now);
  const [y, m, d] = today.split("-").map(Number);
  const utc = new Date(Date.UTC(y!, m! - 1, d!));
  const day = utc.getUTCDay() || 7;
  const daysUntilMonday = day === 1 ? 7 : 8 - day;
  const next = addDaysIso(today, daysUntilMonday);
  return `${next}T00:00:00+08:00`;
}

function mapQuest(row: Record<string, unknown>): QuestDefinition {
  return {
    id: row.id as string,
    code: row.code as string,
    periodType: row.period_type as QuestPeriodType,
    questType: row.quest_type as QuestType,
    title: row.title as string,
    description: (row.description as string) ?? "",
    targetCount: Number(row.target_count) || 1,
    rewardAp: Number(row.reward_ap) || 0,
    minCommentLength: Number(row.min_comment_length) || 0,
    sortOrder: Number(row.sort_order) || 100,
  };
}

async function listActiveQuests(
  supabase: SupabaseClient,
  periodType?: QuestPeriodType
) {
  let query = supabase
    .from("quests_dictionary")
    .select(
      "id, code, period_type, quest_type, title, description, target_count, reward_ap, min_comment_length, sort_order"
    )
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (periodType) query = query.eq("period_type", periodType);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapQuest(row as Record<string, unknown>));
}

async function ensureStreakTouch(
  supabase: SupabaseClient,
  userId: string,
  today: string
): Promise<StreakState> {
  const { data: existing, error: readError } = await supabase
    .from("user_streaks")
    .select("streak_days, longest_streak, last_login_date")
    .eq("user_id", userId)
    .maybeSingle();

  if (readError) throw new Error(readError.message);

  let streakDays = Number(existing?.streak_days) || 0;
  let longestStreak = Number(existing?.longest_streak) || 0;
  const lastLoginDate = (existing?.last_login_date as string | null) ?? null;

  if (lastLoginDate !== today) {
    const yesterday = addDaysIso(today, -1);
    streakDays = lastLoginDate === yesterday ? streakDays + 1 : 1;
    longestStreak = Math.max(longestStreak, streakDays);

    const { error: upsertError } = await supabase.from("user_streaks").upsert(
      {
        user_id: userId,
        streak_days: streakDays,
        longest_streak: longestStreak,
        last_login_date: today,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (upsertError) throw new Error(upsertError.message);
  }

  const startOfWindow = addDaysIso(today, -(Math.max(streakDays, 1) - 1));
  const calendar: boolean[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const day = addDaysIso(today, -i);
    calendar.push(streakDays > 0 && day >= startOfWindow && day <= today);
  }

  return {
    streakDays,
    longestStreak,
    lastLoginDate: today,
    calendar,
  };
}

async function ensureProgressRows(
  supabase: SupabaseClient,
  userId: string,
  quests: QuestDefinition[],
  periodKeyByPeriod: Record<QuestPeriodType, string>
) {
  if (quests.length === 0) return;

  const rows = quests.map((quest) => ({
    user_id: userId,
    quest_id: quest.id,
    period_key: periodKeyByPeriod[quest.periodType],
    progress: 0,
    completed: false,
    claimed: false,
    meta: {},
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("user_quest_progress").upsert(rows, {
    onConflict: "user_id,quest_id,period_key",
    ignoreDuplicates: true,
  });
  if (error) throw new Error(error.message);
}

function toProgressItem(
  quest: QuestDefinition,
  periodKey: string,
  state: { progress: number; completed: boolean; claimed: boolean }
): QuestProgressItem {
  const progress = Math.min(state.progress, quest.targetCount);
  const completed = state.completed || progress >= quest.targetCount;
  return {
    ...quest,
    periodKey,
    progress,
    completed,
    claimed: state.claimed,
    claimable: completed && !state.claimed,
  };
}

export async function getQuestsDashboard(
  userId: string,
  supabase?: SupabaseClient
): Promise<QuestsDashboard> {
  const client = supabase ?? createServerSupabase();
  const today = getQuestDateHongKong();
  const weekKey = getQuestWeekKeyHongKong();
  const quests = await listActiveQuests(client);
  const streak = await ensureStreakTouch(client, userId, today);

  const periodKeyByPeriod: Record<QuestPeriodType, string> = {
    daily: today,
    weekly: weekKey,
  };

  await ensureProgressRows(client, userId, quests, periodKeyByPeriod);

  // 每日簽到任務：開啟面板即計進度
  await trackQuestEvent(userId, "daily_login", { supabase: client });
  await trackQuestEvent(userId, "weekly_login_days", {
    supabase: client,
    loginDay: today,
  });

  const periodKeys = [today, weekKey];
  const { data: progressRows, error } = await client
    .from("user_quest_progress")
    .select("quest_id, period_key, progress, completed, claimed")
    .eq("user_id", userId)
    .in("period_key", periodKeys);

  if (error) throw new Error(error.message);

  const progressMap = new Map(
    (progressRows ?? []).map((row) => [
      `${row.quest_id}:${row.period_key}`,
      {
        progress: Number(row.progress) || 0,
        completed: row.completed === true,
        claimed: row.claimed === true,
      },
    ])
  );

  const daily: QuestProgressItem[] = [];
  const weekly: QuestProgressItem[] = [];

  for (const quest of quests) {
    const periodKey = periodKeyByPeriod[quest.periodType];
    const state = progressMap.get(`${quest.id}:${periodKey}`) ?? {
      progress: 0,
      completed: false,
      claimed: false,
    };
    const item = toProgressItem(quest, periodKey, state);
    if (quest.periodType === "daily") daily.push(item);
    else weekly.push(item);
  }

  const claimableCount =
    daily.filter((q) => q.claimable).length +
    weekly.filter((q) => q.claimable).length;

  return {
    questDate: today,
    weekKey,
    resetsAtDaily: nextDailyResetIso(),
    resetsAtWeekly: nextWeeklyResetIso(),
    daily,
    weekly,
    streak,
    claimableCount,
  };
}

type TrackOptions = {
  gameId?: number;
  commentLength?: number;
  loginDay?: string;
  supabase?: SupabaseClient;
};

/**
 * 事件攔截：推進對應任務進度（含去重／長度門檻）。
 * 不信任前端傳入的 AP 數值。
 */
export async function trackQuestEvent(
  userId: string,
  eventType: QuestType,
  options?: TrackOptions
) {
  const client = options?.supabase ?? createServerSupabase();
  const today = getQuestDateHongKong();
  const weekKey = getQuestWeekKeyHongKong();
  const quests = (await listActiveQuests(client)).filter(
    (quest) => quest.questType === eventType
  );
  if (quests.length === 0) return;

  await ensureProgressRows(client, userId, quests, {
    daily: today,
    weekly: weekKey,
  });

  for (const quest of quests) {
    if (
      eventType === "post_comment" &&
      quest.minCommentLength > 0 &&
      (options?.commentLength ?? 0) < quest.minCommentLength
    ) {
      continue;
    }

    const periodKey = quest.periodType === "weekly" ? weekKey : today;

    const { data: row, error: readError } = await client
      .from("user_quest_progress")
      .select("id, progress, completed, claimed, meta")
      .eq("user_id", userId)
      .eq("quest_id", quest.id)
      .eq("period_key", periodKey)
      .maybeSingle();

    if (readError) throw new Error(readError.message);
    if (!row || row.claimed) continue;

    const meta = (row.meta as Record<string, unknown>) ?? {};
    let nextProgress = Number(row.progress) || 0;
    let nextMeta = meta;

    if (eventType === "play_games" && options?.gameId != null) {
      const gameIds = Array.isArray(meta.gameIds)
        ? (meta.gameIds as unknown[])
            .map(Number)
            .filter((n) => !Number.isNaN(n))
        : [];
      if (gameIds.includes(options.gameId)) continue;
      gameIds.push(options.gameId);
      nextProgress = Math.min(gameIds.length, quest.targetCount);
      nextMeta = { ...meta, gameIds };
    } else if (eventType === "weekly_login_days") {
      const day = options?.loginDay ?? today;
      const days = Array.isArray(meta.days)
        ? (meta.days as unknown[]).map(String)
        : [];
      if (days.includes(day)) continue;
      days.push(day);
      nextProgress = Math.min(days.length, quest.targetCount);
      nextMeta = { ...meta, days };
    } else if (eventType === "daily_login") {
      nextProgress = Math.min(Math.max(nextProgress, 1), quest.targetCount);
    } else {
      nextProgress = Math.min(nextProgress + 1, quest.targetCount);
    }

    const completed = nextProgress >= quest.targetCount;

    const { error: updateError } = await client
      .from("user_quest_progress")
      .update({
        progress: nextProgress,
        completed,
        meta: nextMeta,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    if (updateError) throw new Error(updateError.message);
  }
}

export async function claimQuestReward(
  userId: string,
  questId: string,
  supabase?: SupabaseClient
) {
  const client = supabase ?? createServerSupabase();
  const dashboard = await getQuestsDashboard(userId, client);
  const quest =
    dashboard.daily.find((q) => q.id === questId) ??
    dashboard.weekly.find((q) => q.id === questId);

  if (!quest) throw new Error("找不到此任務");
  if (!quest.claimable) {
    throw new Error(quest.claimed ? "獎勵已領取" : "任務尚未完成，無法領取");
  }

  const { data, error } = await client.rpc("claim_quest_reward", {
    p_user_id: userId,
    p_quest_id: questId,
    p_period_key: quest.periodKey,
  });

  if (error) throw new Error(error.message);

  const result = data as { ok?: boolean; error?: string; reward_ap?: number };
  if (!result?.ok) {
    const code = result?.error ?? "claim_failed";
    if (code === "already_claimed") throw new Error("獎勵已領取");
    if (code === "not_completed") throw new Error("任務尚未完成，無法領取");
    throw new Error("領取失敗");
  }

  return getQuestsDashboard(userId, client);
}

export async function claimAllQuestRewards(
  userId: string,
  supabase?: SupabaseClient
) {
  const client = supabase ?? createServerSupabase();
  let dashboard = await getQuestsDashboard(userId, client);
  const claimedIds: string[] = [];
  let totalAp = 0;

  const claimable = [...dashboard.daily, ...dashboard.weekly].filter(
    (q) => q.claimable
  );

  for (const quest of claimable) {
    dashboard = await claimQuestReward(userId, quest.id, client);
    claimedIds.push(quest.id);
    totalAp += quest.rewardAp;
  }

  return { dashboard, claimedIds, totalAp };
}
