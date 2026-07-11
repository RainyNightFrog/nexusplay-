import { NextResponse } from "next/server";
import { getAchievementsWithProgress, buildCategoryProgress } from "@/lib/achievements-service";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";

export async function GET() {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    const supabase = createServerSupabase();
    const achievements = await getAchievementsWithProgress(
      supabase,
      user?.id ?? null
    );

    const unlockedCount = achievements.filter((item) => item.unlocked).length;
    const totalPoints = achievements
      .filter((item) => item.unlocked)
      .reduce((sum, item) => sum + item.points, 0);

    const categoryProgress = buildCategoryProgress(achievements);

    return NextResponse.json({
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
      categoryProgress,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取成就失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
