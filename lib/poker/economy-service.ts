/**
 * 撲克積分經濟服務（簽到／在線／任務／破產補碼）
 * 金額一律由伺服器計算，不信任前端。
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  BANKRUPTCY_MAX_REBUYS_PER_DAY,
  BANKRUPTCY_REBUY_AMOUNT,
  BANKRUPTCY_THRESHOLD,
  checkinRewardForStreakDay,
  PLAYTIME_MAX_TICKS_PER_DAY,
  PLAYTIME_MIN_HANDS_PER_INTERVAL,
  PLAYTIME_REWARD_POINTS,
} from "./economy";
import { listPokerVirtualLeaderRows } from "./virtual-roster";

/** 香港日界（與平台任務一致） */
export function pokerDateHongKong(now = new Date()): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(now);
}

function yesterdayHongKong(today: string): string {
  const [y, m, d] = today.split("-").map(Number);
  const utc = Date.UTC(y!, m! - 1, d!);
  const prev = new Date(utc - 86400000);
  return pokerDateHongKong(prev);
}

/** 香港週一日期（YYYY-MM-DD），作為每週任務 period key */
export function pokerWeekStartHongKong(now = new Date()): string {
  const today = pokerDateHongKong(now);
  const [y, m, d] = today.split("-").map(Number);
  // 用正午 UTC 對齊該曆日，再取 HK weekday
  const probe = new Date(Date.UTC(y!, m! - 1, d!, 4, 0, 0));
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Hong_Kong",
    weekday: "short",
  }).format(probe);
  const offsetMap: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  const back = offsetMap[weekday] ?? 0;
  const mondayUtc = Date.UTC(y!, m! - 1, d!) - back * 86400000;
  return pokerDateHongKong(new Date(mondayUtc));
}

function questPeriodDate(isDaily: boolean, now = new Date()): string {
  return isDaily ? pokerDateHongKong(now) : pokerWeekStartHongKong(now);
}

export type PokerUserRow = {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  points_balance: number;
  bankruptcy_rebuys_today: number;
  bankruptcy_rebuy_date: string | null;
};

export async function ensurePokerUser(
  supabase: SupabaseClient,
  userId: string,
  profile?: { displayName?: string; avatarUrl?: string | null },
): Promise<PokerUserRow> {
  const { data: existing } = await supabase
    .from("poker_users")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  /* 與網站右上角一致：優先用 profiles.display_name */
  const { data: siteProfile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  const displayName =
    profile?.displayName?.trim() ||
    siteProfile?.display_name?.trim() ||
    (existing as PokerUserRow | null)?.display_name ||
    `Player_${userId.slice(0, 6)}`;
  const avatarUrl =
    profile?.avatarUrl !== undefined
      ? profile.avatarUrl
      : ((siteProfile?.avatar_url as string | null | undefined) ??
        (existing as PokerUserRow | null)?.avatar_url ??
        null);

  if (existing) {
    const row = existing as PokerUserRow;
    const needSync =
      row.display_name !== displayName ||
      (avatarUrl != null && row.avatar_url !== avatarUrl);
    if (needSync) {
      const { data: updated, error: upErr } = await supabase
        .from("poker_users")
        .update({
          display_name: displayName,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id)
        .select("*")
        .single();
      if (!upErr && updated) return updated as PokerUserRow;
    }
    return row;
  }

  const { data, error } = await supabase
    .from("poker_users")
    .insert({
      user_id: userId,
      display_name: displayName,
      avatar_url: avatarUrl,
      points_balance: 5000,
    })
    .select("*")
    .single();

  if (error) {
    // 競態：再讀一次
    const { data: again } = await supabase
      .from("poker_users")
      .select("*")
      .eq("user_id", userId)
      .single();
    if (again) return again as PokerUserRow;
    throw new Error(error.message);
  }

  // 開戶流水
  await supabase.from("poker_points_ledger").insert({
    poker_user_id: data.id,
    delta: 5000,
    balance_after: 5000,
    reason: "ADMIN_ADJUST",
    ref_type: "signup_grant",
    metadata: { note: "welcome_grant" },
  });

  return data as PokerUserRow;
}

async function creditViaRpc(
  supabase: SupabaseClient,
  userId: string,
  delta: number,
  reason: string,
  refType?: string,
  refId?: string,
  metadata?: Record<string, unknown>,
): Promise<number> {
  const { data, error } = await supabase.rpc("poker_credit_points", {
    p_user_id: userId,
    p_delta: delta,
    p_reason: reason,
    p_ref_type: refType ?? null,
    p_ref_id: refId ?? null,
    p_metadata: metadata ?? null,
  });
  if (error) throw new Error(error.message);
  return data as number;
}

export async function getBalance(
  supabase: SupabaseClient,
  userId: string,
): Promise<PokerUserRow> {
  return ensurePokerUser(supabase, userId);
}

export type CheckinResult = {
  alreadyClaimed: boolean;
  streakDay: number;
  pointsAwarded: number;
  balance: number;
  checkinDate: string;
};

export async function claimDailyCheckin(
  supabase: SupabaseClient,
  userId: string,
): Promise<CheckinResult> {
  const pokerUser = await ensurePokerUser(supabase, userId);
  const today = pokerDateHongKong();

  const { data: todayRow } = await supabase
    .from("poker_daily_checkins")
    .select("*")
    .eq("poker_user_id", pokerUser.id)
    .eq("checkin_date", today)
    .maybeSingle();

  if (todayRow) {
    return {
      alreadyClaimed: true,
      streakDay: todayRow.streak_day,
      pointsAwarded: todayRow.points_awarded,
      balance: pokerUser.points_balance,
      checkinDate: today,
    };
  }

  const yday = yesterdayHongKong(today);
  const { data: yRow } = await supabase
    .from("poker_daily_checkins")
    .select("streak_day")
    .eq("poker_user_id", pokerUser.id)
    .eq("checkin_date", yday)
    .maybeSingle();

  const prevStreak = yRow?.streak_day ?? 0;
  const streakDay = prevStreak >= 7 ? 1 : prevStreak + 1 || 1;
  const points = checkinRewardForStreakDay(streakDay);

  const { error: insErr } = await supabase.from("poker_daily_checkins").insert({
    poker_user_id: pokerUser.id,
    checkin_date: today,
    streak_day: streakDay,
    points_awarded: points,
  });
  if (insErr) throw new Error(insErr.message);

  const balance = await creditViaRpc(
    supabase,
    userId,
    points,
    "DAILY_CHECKIN",
    "checkin",
    today,
    { streakDay },
  );

  return {
    alreadyClaimed: false,
    streakDay,
    pointsAwarded: points,
    balance,
    checkinDate: today,
  };
}

export type PlaytimeClaimInput = {
  /** 此區間內完成的手牌數（由遊戲伺服器／客戶端心跳帶上，仍需 >=1） */
  handsInWindow: number;
};

export type PlaytimeResult = {
  awarded: boolean;
  reason?: string;
  tickIndex?: number;
  pointsAwarded?: number;
  ticksToday: number;
  balance: number;
};

export async function claimPlaytimeTick(
  supabase: SupabaseClient,
  userId: string,
  input: PlaytimeClaimInput,
): Promise<PlaytimeResult> {
  const pokerUser = await ensurePokerUser(supabase, userId);
  const today = pokerDateHongKong();

  const { data: logs } = await supabase
    .from("poker_playtime_ticker_logs")
    .select("tick_index")
    .eq("poker_user_id", pokerUser.id)
    .eq("tick_date", today)
    .order("tick_index", { ascending: true });

  const ticksToday = logs?.length ?? 0;
  if (ticksToday >= PLAYTIME_MAX_TICKS_PER_DAY) {
    return {
      awarded: false,
      reason: "今日在線獎勵已達上限",
      ticksToday,
      balance: pokerUser.points_balance,
    };
  }

  if (input.handsInWindow < PLAYTIME_MIN_HANDS_PER_INTERVAL) {
    return {
      awarded: false,
      reason: "此區間需至少完成 1 手牌（防掛機）",
      ticksToday,
      balance: pokerUser.points_balance,
    };
  }

  const tickIndex = ticksToday + 1;
  const { error: insErr } = await supabase
    .from("poker_playtime_ticker_logs")
    .insert({
      poker_user_id: pokerUser.id,
      tick_date: today,
      tick_index: tickIndex,
      points_awarded: PLAYTIME_REWARD_POINTS,
      hands_in_window: input.handsInWindow,
    });

  if (insErr) {
    if (insErr.code === "23505") {
      return {
        awarded: false,
        reason: "此時段已領取",
        ticksToday,
        balance: pokerUser.points_balance,
      };
    }
    throw new Error(insErr.message);
  }

  const balance = await creditViaRpc(
    supabase,
    userId,
    PLAYTIME_REWARD_POINTS,
    "PLAYTIME_TICKER",
    "playtime",
    `${today}#${tickIndex}`,
    { handsInWindow: input.handsInWindow },
  );

  return {
    awarded: true,
    tickIndex,
    pointsAwarded: PLAYTIME_REWARD_POINTS,
    ticksToday: tickIndex,
    balance,
  };
}

export type QuestProgressView = {
  questId: string;
  slug: string;
  kind: string;
  titleKey: string;
  descriptionKey: string;
  targetValue: number;
  rewardPoints: number;
  currentValue: number;
  completed: boolean;
  claimed: boolean;
  /** daily = 每日；weekly = 每週（週一重置） */
  cadence: "daily" | "weekly";
  periodDate: string;
};

export async function listQuestProgress(
  supabase: SupabaseClient,
  userId: string,
): Promise<QuestProgressView[]> {
  const pokerUser = await ensurePokerUser(supabase, userId);

  const { data: quests, error } = await supabase
    .from("poker_quests")
    .select("*")
    .eq("active", true)
    .order("is_daily", { ascending: false })
    .order("reward_points", { ascending: true });
  if (error) throw new Error(error.message);

  const views: QuestProgressView[] = [];
  for (const q of quests ?? []) {
    const isDaily = q.is_daily !== false;
    const periodDate = questPeriodDate(isDaily);
    let { data: prog } = await supabase
      .from("poker_quest_progress")
      .select("*")
      .eq("poker_user_id", pokerUser.id)
      .eq("quest_id", q.id)
      .eq("progress_date", periodDate)
      .maybeSingle();

    if (!prog) {
      const { data: created, error: cErr } = await supabase
        .from("poker_quest_progress")
        .insert({
          poker_user_id: pokerUser.id,
          quest_id: q.id,
          progress_date: periodDate,
          current_value: 0,
        })
        .select("*")
        .single();
      if (cErr) throw new Error(cErr.message);
      prog = created;
    }

    views.push({
      questId: q.id,
      slug: q.slug,
      kind: q.kind,
      titleKey: q.title_key,
      descriptionKey: q.description_key,
      targetValue: q.target_value,
      rewardPoints: q.reward_points,
      currentValue: prog.current_value,
      completed: prog.completed,
      claimed: prog.claimed,
      cadence: isDaily ? "daily" : "weekly",
      periodDate,
    });
  }
  return views;
}

export type QuestEventKind =
  | "PLAY_HANDS"
  | "WIN_HAND_PAIR_OR_BETTER"
  | "FOLD_PREFLOP"
  | "WIN_POTS"
  | "ALL_IN_COUNT";

export async function trackPokerQuestEvent(
  supabase: SupabaseClient,
  userId: string,
  kind: QuestEventKind,
  amount = 1,
): Promise<void> {
  const pokerUser = await ensurePokerUser(supabase, userId);

  const { data: quests } = await supabase
    .from("poker_quests")
    .select("*")
    .eq("kind", kind)
    .eq("active", true);

  for (const q of quests ?? []) {
    const isDaily = q.is_daily !== false;
    const periodDate = questPeriodDate(isDaily);
    const { data: prog } = await supabase
      .from("poker_quest_progress")
      .select("*")
      .eq("poker_user_id", pokerUser.id)
      .eq("quest_id", q.id)
      .eq("progress_date", periodDate)
      .maybeSingle();

    const current = (prog?.current_value ?? 0) + amount;
    const completed = current >= q.target_value;

    if (prog) {
      if (prog.claimed) continue;
      await supabase
        .from("poker_quest_progress")
        .update({
          current_value: Math.min(current, q.target_value * 2),
          completed,
          updated_at: new Date().toISOString(),
        })
        .eq("id", prog.id);
    } else {
      await supabase.from("poker_quest_progress").insert({
        poker_user_id: pokerUser.id,
        quest_id: q.id,
        progress_date: periodDate,
        current_value: current,
        completed,
      });
    }
  }
}

export async function claimQuestReward(
  supabase: SupabaseClient,
  userId: string,
  questId: string,
): Promise<{ balance: number; pointsAwarded: number }> {
  const pokerUser = await ensurePokerUser(supabase, userId);

  const { data: quest } = await supabase
    .from("poker_quests")
    .select("reward_points, is_daily")
    .eq("id", questId)
    .single();
  if (!quest) throw new Error("找不到任務");

  const periodDate = questPeriodDate(quest.is_daily !== false);

  const { data: prog } = await supabase
    .from("poker_quest_progress")
    .select("*")
    .eq("poker_user_id", pokerUser.id)
    .eq("quest_id", questId)
    .eq("progress_date", periodDate)
    .maybeSingle();

  if (!prog) throw new Error("找不到任務進度");
  if (!prog.completed) throw new Error("任務尚未完成");
  if (prog.claimed) throw new Error("獎勵已領取");

  const reward = quest.reward_points as number;

  const { error } = await supabase
    .from("poker_quest_progress")
    .update({
      claimed: true,
      claimed_at: new Date().toISOString(),
    })
    .eq("id", prog.id)
    .eq("claimed", false);
  if (error) throw new Error(error.message);

  const balance = await creditViaRpc(
    supabase,
    userId,
    reward,
    "QUEST_REWARD",
    "quest",
    questId,
  );

  return { balance, pointsAwarded: reward };
}

export type PokerLeaderboardEntry = {
  rank: number;
  displayName: string;
  avatarUrl: string | null;
  pointsBalance: number;
  isYou: boolean;
};

export async function listPointsLeaderboard(
  supabase: SupabaseClient,
  userId: string | null,
  limit = 20,
): Promise<{ entries: PokerLeaderboardEntry[]; you: PokerLeaderboardEntry | null }> {
  const fetchLimit = Math.min(Math.max(limit, 5), 50);
  const { data, error } = await supabase
    .from("poker_users")
    .select("user_id, display_name, avatar_url, points_balance")
    .order("points_balance", { ascending: false })
    .limit(fetchLimit);

  if (error) throw new Error(error.message);

  type Row = {
    displayName: string;
    avatarUrl: string | null;
    pointsBalance: number;
    isYou: boolean;
  };

  const realRows: Row[] = (data ?? []).map((row) => ({
    displayName: row.display_name as string,
    avatarUrl: (row.avatar_url as string | null) ?? null,
    pointsBalance: row.points_balance as number,
    isYou: Boolean(userId && row.user_id === userId),
  }));

  const virtualRows: Row[] = listPokerVirtualLeaderRows().map((v) => ({
    displayName: v.displayName,
    avatarUrl: v.avatarUrl,
    pointsBalance: v.pointsBalance,
    isYou: false,
  }));

  const merged = [...realRows, ...virtualRows].sort(
    (a, b) => b.pointsBalance - a.pointsBalance,
  );

  const entries: PokerLeaderboardEntry[] = merged
    .slice(0, fetchLimit)
    .map((row, index) => ({
      rank: index + 1,
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
      pointsBalance: row.pointsBalance,
      isYou: row.isYou,
    }));

  let you: PokerLeaderboardEntry | null =
    entries.find((e) => e.isYou) ?? null;

  if (userId && !you) {
    const { data: self } = await supabase
      .from("poker_users")
      .select("user_id, display_name, avatar_url, points_balance")
      .eq("user_id", userId)
      .maybeSingle();
    if (self) {
      const selfPoints = self.points_balance as number;
      const above =
        merged.filter((r) => r.pointsBalance > selfPoints).length;
      you = {
        rank: above + 1,
        displayName: self.display_name as string,
        avatarUrl: (self.avatar_url as string | null) ?? null,
        pointsBalance: selfPoints,
        isYou: true,
      };
    }
  }

  return { entries, you };
}

export type BankruptcyResult = {
  granted: boolean;
  reason?: string;
  rebuysUsed: number;
  maxRebuys: number;
  pointsAwarded?: number;
  balance: number;
};

export async function claimBankruptcyRebuy(
  supabase: SupabaseClient,
  userId: string,
): Promise<BankruptcyResult> {
  const pokerUser = await ensurePokerUser(supabase, userId);
  const today = pokerDateHongKong();

  if (pokerUser.points_balance >= BANKRUPTCY_THRESHOLD) {
    return {
      granted: false,
      reason: `餘額仍 ≥ ${BANKRUPTCY_THRESHOLD}，無法使用破產保護`,
      rebuysUsed: pokerUser.bankruptcy_rebuys_today,
      maxRebuys: BANKRUPTCY_MAX_REBUYS_PER_DAY,
      balance: pokerUser.points_balance,
    };
  }

  let used = pokerUser.bankruptcy_rebuys_today;
  if (pokerUser.bankruptcy_rebuy_date !== today) {
    used = 0;
  }

  if (used >= BANKRUPTCY_MAX_REBUYS_PER_DAY) {
    return {
      granted: false,
      reason: "今日破產補碼次數已用完",
      rebuysUsed: used,
      maxRebuys: BANKRUPTCY_MAX_REBUYS_PER_DAY,
      balance: pokerUser.points_balance,
    };
  }

  await supabase
    .from("poker_users")
    .update({
      bankruptcy_rebuys_today: used + 1,
      bankruptcy_rebuy_date: today,
      updated_at: new Date().toISOString(),
    })
    .eq("id", pokerUser.id);

  const balance = await creditViaRpc(
    supabase,
    userId,
    BANKRUPTCY_REBUY_AMOUNT,
    "BANKRUPTCY_REBUY",
    "bankruptcy",
    today,
    { rebuyIndex: used + 1 },
  );

  return {
    granted: true,
    rebuysUsed: used + 1,
    maxRebuys: BANKRUPTCY_MAX_REBUYS_PER_DAY,
    pointsAwarded: BANKRUPTCY_REBUY_AMOUNT,
    balance,
  };
}

/** 買入：從錢包扣點進桌（遊戲伺服器／API 呼叫） */
export async function debitBuyIn(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  roomId: string,
): Promise<number> {
  if (amount <= 0) throw new Error("買入金額無效");
  return creditViaRpc(
    supabase,
    userId,
    -amount,
    "HAND_BUY_IN",
    "room",
    roomId,
  );
}

/** 離桌兌現 */
export async function creditCashOut(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  roomId: string,
): Promise<number> {
  if (amount <= 0) return (await ensurePokerUser(supabase, userId)).points_balance;
  return creditViaRpc(
    supabase,
    userId,
    amount,
    "HAND_CASH_OUT",
    "room",
    roomId,
  );
}

/**
 * 對帳修復：
 * - 不再把「買入 − 兌現」差額當 stranded 退回（那會把桌上輸贏退成白拿積分）
 * - 僅回收先前錯誤退款造成的多餘 ADMIN_ADJUST（stranded-buyin）
 * 真正離桌／斷線必須由牌桌伺服器即時 creditCashOut(實際籌碼)。
 */
export async function repairStrandedBuyIns(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ refunded: number; clawedBack: number; balance: number }> {
  const pokerUser = await ensurePokerUser(supabase, userId);
  const { data: rows, error } = await supabase
    .from("poker_points_ledger")
    .select("delta, reason, ref_type, ref_id")
    .eq("poker_user_id", pokerUser.id)
    .in("reason", ["HAND_BUY_IN", "HAND_CASH_OUT", "ADMIN_ADJUST"]);

  if (error) throw new Error(error.message);

  let buyInTotal = 0;
  let cashOutTotal = 0;
  let repairedTotal = 0;
  for (const row of rows ?? []) {
    const delta = Number(row.delta) || 0;
    if (row.reason === "HAND_BUY_IN") {
      buyInTotal += Math.abs(delta);
    } else if (row.reason === "HAND_CASH_OUT") {
      cashOutTotal += Math.max(0, delta);
    } else if (
      row.reason === "ADMIN_ADJUST" &&
      row.ref_type === "repair" &&
      row.ref_id === "stranded-buyin"
    ) {
      repairedTotal += delta;
    }
  }

  /*
   * 正確經濟：買入後桌上輸贏靠「兌現實際 stack」結算。
   * 不再把 buyIn−cashOut 當 stranded 補發。
   * 僅回收帳上仍為正的 stranded-buyin 錯誤補發。
   */
  const overRefund = Math.max(0, repairedTotal);
  if (overRefund <= 0) {
    return {
      refunded: 0,
      clawedBack: 0,
      balance: pokerUser.points_balance,
    };
  }

  const claw = Math.min(overRefund, pokerUser.points_balance);
  if (claw <= 0) {
    return {
      refunded: 0,
      clawedBack: 0,
      balance: pokerUser.points_balance,
    };
  }
  const balance = await creditViaRpc(
    supabase,
    userId,
    -claw,
    "ADMIN_ADJUST",
    "repair",
    "stranded-buyin",
    { buyInTotal, cashOutTotal, repairedTotal, clawback: claw },
  );
  return { refunded: 0, clawedBack: claw, balance };
}
