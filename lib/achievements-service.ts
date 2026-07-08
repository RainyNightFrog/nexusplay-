import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AchievementRecord,
  AchievementWithProgress,
  AchievementCategory,
} from "@/lib/achievements";
import {
  loadUserAchievementMetrics,
  resolveAchievementProgress,
} from "@/lib/achievement-progress";
import type { TitleWardrobeEntry } from "@/lib/titles";

type UnlockStatRow = {
  achievement_id: string;
  unlock_count: number;
  total_users: number;
  unlock_percent: number;
};

type UserAchievementRow = {
  achievement_id: string;
  unlocked_at: string;
};

type UserTitleRow = {
  title_id: string;
  unlocked_at: string;
};

function isMissingGamificationTable(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    error.message?.includes("achievements") ||
    error.message?.includes("titles") ||
    error.message?.includes("schema cache")
  );
}

export async function getAchievementsWithProgress(
  supabase: SupabaseClient,
  userId?: string | null
): Promise<AchievementWithProgress[]> {
  const { data: achievements, error: achievementsError } = await supabase
    .from("achievements")
    .select("*")
    .order("category", { ascending: true })
    .order("points", { ascending: true });

  if (achievementsError) {
    if (isMissingGamificationTable(achievementsError)) return [];
    throw new Error(`讀取成就失敗：${achievementsError.message}`);
  }

  const rows = (achievements ?? []) as AchievementRecord[];
  if (rows.length === 0) return [];

  const { data: stats, error: statsError } = await supabase.rpc(
    "get_achievement_unlock_stats"
  );

  if (statsError && !isMissingGamificationTable(statsError)) {
    throw new Error(`讀取解鎖統計失敗：${statsError.message}`);
  }

  const statMap = new Map<string, UnlockStatRow>();
  for (const stat of (stats ?? []) as UnlockStatRow[]) {
    statMap.set(stat.achievement_id, stat);
  }

  let unlockedMap = new Map<string, string>();
  let metrics = null;
  if (userId) {
    const [{ data: userAchievements, error: userError }, loadedMetrics] =
      await Promise.all([
        supabase
          .from("user_achievements")
          .select("achievement_id, unlocked_at")
          .eq("user_id", userId),
        loadUserAchievementMetrics(supabase, userId),
      ]);

    if (userError && !isMissingGamificationTable(userError)) {
      throw new Error(`讀取個人成就失敗：${userError.message}`);
    }

    metrics = loadedMetrics;
    unlockedMap = new Map(
      ((userAchievements ?? []) as UserAchievementRow[]).map((row) => [
        row.achievement_id,
        row.unlocked_at,
      ])
    );
  }

  return rows.map((achievement) => {
    const stat = statMap.get(achievement.id);
    const unlockedAt = unlockedMap.get(achievement.id) ?? null;
    const unlocked = Boolean(unlockedAt);
    const target = achievement.progress_target ?? 1;
    const progress = metrics
      ? resolveAchievementProgress(achievement.code, metrics, target, unlocked)
      : {
          progress_current: unlocked ? target : 0,
          progress_target: target,
          progress_percent: unlocked ? 100 : 0,
        };

    return {
      ...achievement,
      progress_target: target,
      unlocked,
      unlocked_at: unlockedAt,
      unlock_percent: Number(stat?.unlock_percent ?? 0),
      unlock_count: Number(stat?.unlock_count ?? 0),
      progress_current: progress.progress_current,
      progress_percent: progress.progress_percent,
    };
  });
}

export function buildCategoryProgress(
  achievements: AchievementWithProgress[]
): { category: AchievementCategory; unlocked: number; total: number; percent: number }[] {
  const map = new Map<AchievementCategory, { unlocked: number; total: number }>();

  for (const item of achievements) {
    const entry = map.get(item.category) ?? { unlocked: 0, total: 0 };
    entry.total += 1;
    if (item.unlocked) entry.unlocked += 1;
    map.set(item.category, entry);
  }

  return (["gameplay", "social", "creator", "special"] as AchievementCategory[])
    .filter((cat) => map.has(cat))
    .map((category) => {
      const { unlocked, total } = map.get(category)!;
      return {
        category,
        unlocked,
        total,
        percent: total > 0 ? Math.round((unlocked / total) * 100) : 0,
      };
    });
}

export async function getTitleWardrobe(
  supabase: SupabaseClient,
  userId: string
): Promise<{
  titles: TitleWardrobeEntry[];
  equipped_title_id: string | null;
  total_points: number;
}> {
  const [{ data: titles, error: titlesError }, { data: profile, error: profileError }] =
    await Promise.all([
      supabase.from("titles").select("*").order("created_at"),
      supabase
        .from("profiles")
        .select("equipped_title_id")
        .eq("id", userId)
        .maybeSingle(),
    ]);

  if (titlesError) {
    if (isMissingGamificationTable(titlesError)) {
      return { titles: [], equipped_title_id: null, total_points: 0 };
    }
    throw new Error(`讀取稱號失敗：${titlesError.message}`);
  }

  if (profileError && !isMissingGamificationTable(profileError)) {
    throw new Error(`讀取佩戴狀態失敗：${profileError.message}`);
  }

  const equippedTitleId =
    (profile as { equipped_title_id?: string | null } | null)?.equipped_title_id ??
    null;

  const { data: userTitles, error: userTitlesError } = await supabase
    .from("user_titles")
    .select("title_id, unlocked_at")
    .eq("user_id", userId);

  if (userTitlesError && !isMissingGamificationTable(userTitlesError)) {
    throw new Error(`讀取個人稱號失敗：${userTitlesError.message}`);
  }

  const unlockedMap = new Map(
    ((userTitles ?? []) as UserTitleRow[]).map((row) => [
      row.title_id,
      row.unlocked_at,
    ])
  );

  const { data: userAchievements, error: achievementsError } = await supabase
    .from("user_achievements")
    .select("achievement_id, unlocked_at")
    .eq("user_id", userId);

  if (achievementsError && !isMissingGamificationTable(achievementsError)) {
    throw new Error(`讀取成就點數失敗：${achievementsError.message}`);
  }

  const unlockedAchievementIds = new Set(
    ((userAchievements ?? []) as UserAchievementRow[]).map(
      (row) => row.achievement_id
    )
  );

  let totalPoints = 0;
  if (unlockedAchievementIds.size > 0) {
    const { data: achievementPoints, error: pointsError } = await supabase
      .from("achievements")
      .select("id, points")
      .in("id", [...unlockedAchievementIds]);

    if (pointsError && !isMissingGamificationTable(pointsError)) {
      throw new Error(`計算 AP 失敗：${pointsError.message}`);
    }

    totalPoints = ((achievementPoints ?? []) as { points: number }[]).reduce(
      (sum, row) => sum + row.points,
      0
    );
  }

  const { data: allAchievements, error: allAchievementsError } = await supabase
    .from("achievements")
    .select("id, title, badge_icon");

  if (allAchievementsError && !isMissingGamificationTable(allAchievementsError)) {
    throw new Error(`讀取成就資料失敗：${allAchievementsError.message}`);
  }

  const achievementMap = new Map(
    ((allAchievements ?? []) as { id: string; title: string; badge_icon: string }[]).map(
      (row) => [row.id, row]
    )
  );

  const wardrobe = ((titles ?? []) as TitleWardrobeEntry[]).map((title) => {
    const unlockedAt = unlockedMap.get(title.id) ?? null;
    const linked = title.unlock_achievement_id
      ? achievementMap.get(title.unlock_achievement_id)
      : null;

    return {
      ...title,
      unlocked: Boolean(unlockedAt),
      unlocked_at: unlockedAt,
      is_equipped: equippedTitleId === title.id,
      unlock_achievement: linked
        ? {
            id: linked.id,
            title: linked.title,
            badge_icon: linked.badge_icon,
            unlocked: unlockedAchievementIds.has(linked.id),
          }
        : null,
    };
  });

  wardrobe.sort((a, b) => {
    if (a.is_equipped !== b.is_equipped) return a.is_equipped ? -1 : 1;
    if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
    return a.name.localeCompare(b.name, "zh-HK");
  });

  return {
    titles: wardrobe,
    equipped_title_id: equippedTitleId,
    total_points: totalPoints,
  };
}

export async function equipTitle(
  supabase: SupabaseClient,
  userId: string,
  titleId: string | null
): Promise<{ equipped_title_id: string | null }> {
  if (titleId) {
    const { data: owned, error: ownedError } = await supabase
      .from("user_titles")
      .select("title_id")
      .eq("user_id", userId)
      .eq("title_id", titleId)
      .maybeSingle();

    if (ownedError) {
      if (isMissingGamificationTable(ownedError)) {
        throw new Error("成就系統尚未初始化，請先執行資料庫遷移");
      }
      throw new Error(`驗證稱號失敗：${ownedError.message}`);
    }

    if (!owned) {
      throw new Error("你尚未解鎖此稱號");
    }
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ equipped_title_id: titleId })
    .eq("id", userId);

  if (updateError) {
    if (isMissingGamificationTable(updateError)) {
      throw new Error("成就系統尚未初始化，請先執行資料庫遷移");
    }
    throw new Error(`更新佩戴稱號失敗：${updateError.message}`);
  }

  return { equipped_title_id: titleId };
}
