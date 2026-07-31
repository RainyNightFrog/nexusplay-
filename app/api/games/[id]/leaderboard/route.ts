import { NextResponse } from "next/server";
import { checkLeaderboardAchievements } from "@/lib/achievement-unlock-service";
import { resolveAdminAccess } from "@/lib/admin-auth";
import { resolveEquippedTitles } from "@/lib/equipped-title-service";
import {
  getTopLeaderboard,
  mapPublicLeaderboard,
  submitLeaderboardScore,
  validateLeaderboardSubmit,
} from "@/lib/game-leaderboard";
import {
  buildVirtualGameLeaderboardEntries,
  isVirtualGameLeaderboardSlug,
  mergeGameLeaderboardWithVirtual,
} from "@/lib/game-leaderboard-virtual";
import { canViewGame } from "@/lib/game-publish";
import { resolvePurchaseEntitlementForGame } from "@/lib/game-entitlement-service";
import { getPlatformGameMeta } from "@/lib/platform-catalog";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";

async function loadGame(gameId: number) {
  const supabase = createServerSupabase();
  const { data: record, error } = await supabase
    .from("games")
    .select("id, slug, title, publish_status, creator_id, status, pricing_type, price, min_price")
    .eq("id", gameId)
    .maybeSingle();

  if (error) {
    throw new Error(`讀取遊戲失敗：${error.message}`);
  }

  return record;
}

function resolveLeaderboardSlug(
  record: { slug?: string | null; title?: string | null } | null
): string | null {
  if (!record) return null;
  const slug = typeof record.slug === "string" ? record.slug.trim() : "";
  if (slug && isVirtualGameLeaderboardSlug(slug)) return slug;
  const title = typeof record.title === "string" ? record.title : "";
  const meta = title ? getPlatformGameMeta(title) : null;
  if (meta && isVirtualGameLeaderboardSlug(meta.slug)) return meta.slug;
  return slug || null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const gameId = Number.parseInt(id, 10);

    if (Number.isNaN(gameId)) {
      return NextResponse.json({ error: "無效的遊戲 ID" }, { status: 400 });
    }

    const record = await loadGame(gameId);
    if (!record) {
      return NextResponse.json({ error: "找不到此遊戲" }, { status: 404 });
    }

    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    const supabase = createServerSupabase();
    const hasPurchaseEntitlement = await resolvePurchaseEntitlementForGame(
      supabase,
      gameId,
      user?.id
    );

    if (
      !canViewGame(record, user?.id, {
        isAdmin: await resolveAdminAccess(user),
        hasPurchaseEntitlement,
      })
    ) {
      return NextResponse.json({ error: "找不到此遊戲" }, { status: 404 });
    }

    const url = new URL(request.url);
    const limit = Math.min(
      50,
      Math.max(1, Number.parseInt(url.searchParams.get("limit") ?? "30", 10) || 30)
    );
    const difficulty = url.searchParams.get("difficulty")?.trim() || null;

    const rows = await getTopLeaderboard(createServerSupabase(), gameId, limit, difficulty);
    const titleMap = await resolveEquippedTitles(
      createServerSupabase(),
      rows.map((row) => row.user_id)
    );

    const realEntries = mapPublicLeaderboard(rows, user?.id, titleMap);
    const slug = resolveLeaderboardSlug(record);
    const entries =
      slug && isVirtualGameLeaderboardSlug(slug)
        ? mergeGameLeaderboardWithVirtual(
            realEntries,
            buildVirtualGameLeaderboardEntries(slug, difficulty || "normal"),
            limit
          )
        : realEntries;

    return NextResponse.json({
      entries,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取排行榜失敗";
    return NextResponse.json({ error: message, entries: [] }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const gameId = Number.parseInt(id, 10);

    if (Number.isNaN(gameId)) {
      return NextResponse.json({ error: "無效的遊戲 ID" }, { status: 400 });
    }

    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入後提交排行榜" }, { status: 401 });
    }

    const record = await loadGame(gameId);
    if (!record) {
      return NextResponse.json({ error: "找不到此遊戲" }, { status: 404 });
    }

    const supabase = createServerSupabase();
    const hasPurchaseEntitlement = await resolvePurchaseEntitlementForGame(
      supabase,
      gameId,
      user.id
    );

    if (
      !canViewGame(record, user.id, {
        isAdmin: await resolveAdminAccess(user),
        hasPurchaseEntitlement,
      })
    ) {
      return NextResponse.json({ error: "找不到此遊戲" }, { status: 404 });
    }

    const body = (await request.json()) as {
      score?: unknown;
      grade?: unknown;
      meta?: unknown;
    };

    if (!validateLeaderboardSubmit(body)) {
      return NextResponse.json({ error: "排行榜資料格式無效" }, { status: 400 });
    }

    const { data: profile } = await authClient
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();

    const playerName =
      profile?.display_name?.trim() ||
      user.user_metadata?.display_name ||
      user.email?.split("@")[0] ||
      "匿名玩家";

    const row = await submitLeaderboardScore(
      authClient,
      gameId,
      user.id,
      playerName,
      body.score,
      typeof body.grade === "string" ? body.grade : null,
      body.meta ?? {}
    );

    void checkLeaderboardAchievements(
      createServerSupabase(),
      user.id,
      typeof body.grade === "string" ? body.grade : null,
      (body.meta as Record<string, unknown>) ?? {}
    ).catch((error) => {
      console.error("[achievements] leaderboard achievement check failed:", error);
    });

    const { checkRateLimit } = await import("@/lib/rate-limit");
    const questLimit = checkRateLimit(
      `quest:leaderboard:${user.id}`,
      20,
      60 * 60_000
    );
    if (questLimit.allowed) {
      const { trackQuestEvent } = await import("@/lib/quests-service");
      void trackQuestEvent(user.id, "leaderboard", {
        gameId,
        supabase: createServerSupabase(),
      }).catch((error) => {
        console.error("[quests] leaderboard progress failed:", error);
      });
    }

    return NextResponse.json({
      ok: true,
      entry: {
        playerName: row.player_name,
        score: row.score,
        grade: row.grade,
        meta: row.meta,
        updatedAt: row.updated_at,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "提交排行榜失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
