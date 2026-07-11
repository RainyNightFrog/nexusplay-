import type { SupabaseClient } from "@supabase/supabase-js";
import {
  loadUserAchievementMetrics,
  resolveAchievementProgress,
} from "@/lib/achievement-progress";
import { grantAchievement } from "@/lib/achievement-unlock-service";
import type { AchievementRecord } from "@/lib/achievements";

export function isAchievementClaimable(
  achievement: {
    unlocked: boolean;
    progress_current: number;
    progress_target: number;
  }
): boolean {
  const target = Math.max(1, achievement.progress_target);
  return (
    !achievement.unlocked &&
    achievement.progress_current >= target
  );
}

async function loadAchievementByCode(
  supabase: SupabaseClient,
  code: string
): Promise<AchievementRecord | null> {
  const { data, error } = await supabase
    .from("achievements")
    .select("*")
    .eq("code", code.trim())
    .maybeSingle();

  if (error) {
    throw new Error(`讀取成就失敗：${error.message}`);
  }

  return (data as AchievementRecord | null) ?? null;
}

async function isAchievementUnlocked(
  supabase: SupabaseClient,
  userId: string,
  achievementId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_achievements")
    .select("achievement_id")
    .eq("user_id", userId)
    .eq("achievement_id", achievementId)
    .maybeSingle();

  if (error) {
    throw new Error(`讀取成就狀態失敗：${error.message}`);
  }

  return Boolean(data);
}

export async function claimAchievementByCode(
  supabase: SupabaseClient,
  userId: string,
  code: string
): Promise<{ granted: boolean; code: string }> {
  const achievement = await loadAchievementByCode(supabase, code);
  if (!achievement) {
    throw new Error("找不到此成就");
  }

  if (await isAchievementUnlocked(supabase, userId, achievement.id)) {
    return { granted: false, code: achievement.code };
  }

  const metrics = await loadUserAchievementMetrics(supabase, userId);
  const target = achievement.progress_target ?? 1;
  const progress = resolveAchievementProgress(
    achievement.code,
    metrics,
    target,
    false
  );

  if (!isAchievementClaimable({
    unlocked: false,
    progress_current: progress.progress_current,
    progress_target: progress.progress_target,
  })) {
    throw new Error("尚未達成領取條件");
  }

  const granted = await grantAchievement(supabase, userId, achievement.code);
  return { granted, code: achievement.code };
}

export async function claimAllEligibleAchievements(
  supabase: SupabaseClient,
  userId: string
): Promise<{ granted_codes: string[] }> {
  const [{ data: achievements, error: achievementsError }, metrics] =
    await Promise.all([
      supabase.from("achievements").select("*").order("created_at"),
      loadUserAchievementMetrics(supabase, userId),
    ]);

  if (achievementsError) {
    throw new Error(`讀取成就失敗：${achievementsError.message}`);
  }

  const { data: unlockedRows, error: unlockedError } = await supabase
    .from("user_achievements")
    .select("achievement_id")
    .eq("user_id", userId);

  if (unlockedError) {
    throw new Error(`讀取個人成就失敗：${unlockedError.message}`);
  }

  const unlockedIds = new Set(
    (unlockedRows ?? []).map((row) => row.achievement_id as string)
  );

  const granted_codes: string[] = [];

  for (const row of (achievements ?? []) as AchievementRecord[]) {
    if (unlockedIds.has(row.id)) continue;

    const target = row.progress_target ?? 1;
    const progress = resolveAchievementProgress(row.code, metrics, target, false);

    if (
      !isAchievementClaimable({
        unlocked: false,
        progress_current: progress.progress_current,
        progress_target: progress.progress_target,
      })
    ) {
      continue;
    }

    const granted = await grantAchievement(supabase, userId, row.code);
    if (granted) {
      granted_codes.push(row.code);
      unlockedIds.add(row.id);
    }
  }

  return { granted_codes };
}
