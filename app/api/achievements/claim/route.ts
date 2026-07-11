import { NextResponse } from "next/server";
import {
  claimAchievementByCode,
  claimAllEligibleAchievements,
} from "@/lib/achievement-claim-service";
import {
  buildCategoryProgress,
  getAchievementsWithProgress,
} from "@/lib/achievements-service";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";

type ClaimBody = {
  code?: string;
  claim_all?: boolean;
};

function buildAchievementsPayload(
  achievements: Awaited<ReturnType<typeof getAchievementsWithProgress>>
) {
  const unlockedCount = achievements.filter((item) => item.unlocked).length;
  const totalPoints = achievements
    .filter((item) => item.unlocked)
    .reduce((sum, item) => sum + item.points, 0);

  return {
    achievements,
    summary: {
      unlocked_count: unlockedCount,
      total_count: achievements.length,
      total_points: totalPoints,
      completion_percent:
        achievements.length > 0
          ? Math.round((unlockedCount / achievements.length) * 100)
          : 0,
      claimable_count: achievements.filter((item) => item.claimable).length,
    },
    categoryProgress: buildCategoryProgress(achievements),
    fetchedAt: new Date().toISOString(),
  };
}

export async function POST(request: Request) {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const body = (await request.json()) as ClaimBody;
    const supabase = createServerSupabase();

    if (body.claim_all) {
      const result = await claimAllEligibleAchievements(supabase, user.id);
      const achievements = await getAchievementsWithProgress(supabase, user.id);

      return NextResponse.json({
        ...buildAchievementsPayload(achievements),
        granted_codes: result.granted_codes,
      });
    }

    const code = body.code?.trim();
    if (!code) {
      return NextResponse.json({ error: "請提供成就代碼" }, { status: 400 });
    }

    const result = await claimAchievementByCode(supabase, user.id, code);
    const achievements = await getAchievementsWithProgress(supabase, user.id);

    return NextResponse.json({
      ...buildAchievementsPayload(achievements),
      granted: result.granted,
      code: result.code,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "領取成就失敗";
    const status =
      message.includes("尚未達成") || message.includes("找不到")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
