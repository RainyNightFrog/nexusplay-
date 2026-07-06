import { NextResponse } from "next/server";
import { resolveUserRole, hasCreatorDashboardAccess } from "@/lib/auth-profile";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";

const GAME_FIELDS =
  "id, title, description, category, cover_url, game_url, creator_id, created_at, plays_count, rating_avg, publish_status, tips_enabled, suggested_tip_amount";

export async function GET() {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const role = await resolveUserRole(authClient, user);

    if (!hasCreatorDashboardAccess(user, role)) {
      return NextResponse.json(
        { error: "需要創作者身分才能管理遊戲" },
        { status: 403 }
      );
    }

    const supabase = createServerSupabase();

    const [{ data: owned, error: ownedError }, { data: unclaimed, error: unclaimedError }] =
      await Promise.all([
        supabase
          .from("games")
          .select(GAME_FIELDS)
          .eq("creator_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("games")
          .select(GAME_FIELDS)
          .is("creator_id", null)
          .order("created_at", { ascending: false }),
      ]);

    if (ownedError) {
      console.error("[games/mine] owned query:", ownedError.message);
      throw new Error("讀取創作者遊戲失敗");
    }
    if (unclaimedError) {
      console.error("[games/mine] unclaimed query:", unclaimedError.message);
      throw new Error("讀取創作者遊戲失敗");
    }

    const ownedGames = (owned ?? []).map((game) => ({
      ...game,
      isUnclaimed: false,
    }));
    const unclaimedGames = (unclaimed ?? []).map((game) => ({
      ...game,
      isUnclaimed: true,
    }));

    return NextResponse.json({
      games: [...ownedGames, ...unclaimedGames],
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "讀取創作者遊戲失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
