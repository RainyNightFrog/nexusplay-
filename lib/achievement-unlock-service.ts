import type { SupabaseClient } from "@supabase/supabase-js";
import { isGamePubliclyLive } from "@/lib/game-live-service";

export const ACHIEVEMENT_CODES = {
  firstWin: "first_win",
  bigTipper: "big_tipper",
  bigTipper500: "big_tipper_500",
  donationStarter: "donation_starter",
  creatorDebut: "creator_debut",
  nightOwl: "night_owl",
  nightOwl50h: "night_owl_50h",
} as const;

export const BIG_TIPPER_HKD = 100;
export const BIG_TIPPER_500_HKD = 500;
export const NIGHT_OWL_SECONDS = 10 * 3600;
export const NIGHT_OWL_50H_SECONDS = 50 * 3600;
/** 打賞 USD → HKD 估算（與平台 HKD 顯示一致） */
export const TIP_USD_TO_HKD = 7.8;

function isMissingGamification(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    error.message?.includes("achievements") ||
    error.message?.includes("grant_achievement") ||
    error.message?.includes("schema cache")
  );
}

export async function grantAchievement(
  supabase: SupabaseClient,
  userId: string,
  code: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc("grant_achievement", {
    p_user_id: userId,
    p_code: code,
  });

  if (error) {
    if (isMissingGamification(error)) return false;
    throw new Error(`授予成就失敗：${error.message}`);
  }

  return data === true;
}

export function isWinLeaderboardSubmission(
  grade: string | null | undefined,
  meta: Record<string, unknown>
): boolean {
  if (meta.won === true || meta.win === true || meta.victory === true) {
    return true;
  }

  const result = meta.result ?? meta.outcome ?? meta.status;
  if (typeof result === "string" && /^(win|victory|cleared|success)$/i.test(result.trim())) {
    return true;
  }

  if (!grade?.trim()) return false;

  return /^(S{1,3}|WIN|VICTORY|勝利|獲勝|全勝|通關)$/i.test(grade.trim());
}

export async function checkFirstWinAchievement(
  supabase: SupabaseClient,
  userId: string,
  grade: string | null | undefined,
  meta: Record<string, unknown>
): Promise<boolean> {
  if (!isWinLeaderboardSubmission(grade, meta)) {
    return false;
  }

  return grantAchievement(supabase, userId, ACHIEVEMENT_CODES.firstWin);
}

/** 排行榜提交後：檢查勝利／S 級相關成就（可領取進度仍以 claim 為準，此處補即時授予關鍵項） */
export async function checkLeaderboardAchievements(
  supabase: SupabaseClient,
  userId: string,
  grade: string | null | undefined,
  meta: Record<string, unknown>
): Promise<void> {
  if (isWinLeaderboardSubmission(grade, meta)) {
    await grantAchievement(supabase, userId, ACHIEVEMENT_CODES.firstWin);
  }

  if (grade?.trim() && /^(S{1,3}|SSS\+?)$/i.test(grade.trim())) {
    await grantAchievement(supabase, userId, "s_rank_clear");
  }
}

export async function recordTipDonationAndCheckBigTipper(
  supabase: SupabaseClient,
  userId: string,
  amountUsd: number
): Promise<void> {
  const amountHkd =
    Math.round(amountUsd * TIP_USD_TO_HKD * 100) / 100;

  if (amountHkd <= 0) return;

  const { error } = await supabase.rpc("record_user_donation", {
    p_user_id: userId,
    p_amount: amountHkd,
  });

  if (error && !isMissingGamification(error)) {
    throw new Error(`記錄打賞累計失敗：${error.message}`);
  }
}

export async function checkCreatorDebutAchievement(
  supabase: SupabaseClient,
  creatorId: string
): Promise<boolean> {
  const { data: games, error } = await supabase
    .from("games")
    .select("id, publish_status, status")
    .eq("creator_id", creatorId);

  if (error) {
    throw new Error(`讀取創作者遊戲失敗：${error.message}`);
  }

  const liveCount = (games ?? []).filter((game) =>
    isGamePubliclyLive(game)
  ).length;

  if (liveCount < 1) {
    return false;
  }

  return grantAchievement(supabase, creatorId, ACHIEVEMENT_CODES.creatorDebut);
}

export async function onCreatorGameWentLive(
  supabase: SupabaseClient,
  creatorId: string
): Promise<void> {
  try {
    await checkCreatorDebutAchievement(supabase, creatorId);
  } catch (error) {
    console.error("[achievements] creator_debut check failed:", error);
  }
}
