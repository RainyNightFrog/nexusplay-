import { NextResponse } from "next/server";
import { checkLeaderboardAchievements } from "@/lib/achievement-unlock-service";
import { resolveAdminAccess } from "@/lib/admin-auth";
import { resolveEquippedTitles } from "@/lib/equipped-title-service";
import {
  getTopLeaderboard,
  mapPublicLeaderboard,
  submitLeaderboardScore,
  validateLeaderboardSubmit,
  type LeaderboardPublicEntry,
} from "@/lib/game-leaderboard";
import {
  attachIsMeAndStripUid,
  gameLeaderboardCacheKey,
  invalidateGameLeaderboardCache,
  readGameLeaderboardCache,
  writeGameLeaderboardCache,
} from "@/lib/game-leaderboard-cache";
import {
  buildVirtualGameLeaderboardEntries,
  isVirtualGameLeaderboardSlug,
  mergeGameLeaderboardWithVirtual,
} from "@/lib/game-leaderboard-virtual";
import { canViewGame } from "@/lib/game-publish";
import {
  gameRequiresPurchase,
  resolvePurchaseEntitlementForGame,
} from "@/lib/game-entitlement-service";
import { getPlatformGameMeta } from "@/lib/platform-catalog";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";

async function loadGame(gameId: number, supabase = createServerSupabase()) {
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

function leaderboardJson(entries: LeaderboardPublicEntry[]) {
  return NextResponse.json(
    { entries },
    {
      headers: {
        "Cache-Control": "private, max-age=15, stale-while-revalidate=30",
      },
    }
  );
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

    const url = new URL(request.url);
    const limit = Math.min(
      50,
      Math.max(1, Number.parseInt(url.searchParams.get("limit") ?? "30", 10) || 30)
    );
    const difficulty = url.searchParams.get("difficulty")?.trim() || null;
    const withTitles = url.searchParams.get("titles") === "1";
    const cacheKey = gameLeaderboardCacheKey(gameId, difficulty, limit, withTitles);

    const supabase = createServerSupabase();
    const authClientPromise = createAuthServerClient();

    const [record, authClient] = await Promise.all([
      loadGame(gameId, supabase),
      authClientPromise,
    ]);

    if (!record) {
      return NextResponse.json({ error: "找不到此遊戲" }, { status: 404 });
    }

    const {
      data: { user },
    } = await authClient.auth.getUser();

    const needsEntitlement =
      Boolean(user?.id) && gameRequiresPurchase(record);

    const [hasPurchaseEntitlement, isAdmin] = await Promise.all([
      needsEntitlement
        ? resolvePurchaseEntitlementForGame(supabase, gameId, user?.id)
        : Promise.resolve(false),
      // 未登入免查；已登入共用 supabase，避免再開一個 client
      user ? resolveAdminAccess(user, supabase) : Promise.resolve(false),
    ]);

    if (
      !canViewGame(record, user?.id, {
        isAdmin,
        hasPurchaseEntitlement,
      })
    ) {
      return NextResponse.json({ error: "找不到此遊戲" }, { status: 404 });
    }

    const cached = readGameLeaderboardCache(cacheKey);
    if (cached) {
      return leaderboardJson(attachIsMeAndStripUid(cached, user?.id));
    }

    const rows = await getTopLeaderboard(supabase, gameId, limit, difficulty);
    const titleMap = withTitles
      ? await resolveEquippedTitles(
          supabase,
          rows.map((row) => row.user_id)
        )
      : undefined;

    const realEntries = mapPublicLeaderboard(rows, null, titleMap).map(
      (entry, index) => ({
        ...entry,
        _uid: rows[index]?.user_id,
      })
    );

    const slug = resolveLeaderboardSlug(record);
    const entries =
      slug && isVirtualGameLeaderboardSlug(slug)
        ? mergeGameLeaderboardWithVirtual(
            realEntries,
            buildVirtualGameLeaderboardEntries(slug, difficulty || "normal"),
            limit
          )
        : realEntries;

    writeGameLeaderboardCache(cacheKey, entries);
    return leaderboardJson(attachIsMeAndStripUid(entries, user?.id));
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

    const supabase = createServerSupabase();
    const record = await loadGame(gameId, supabase);
    if (!record) {
      return NextResponse.json({ error: "找不到此遊戲" }, { status: 404 });
    }

    const needsEntitlement = gameRequiresPurchase(record);
    const [hasPurchaseEntitlement, isAdmin] = await Promise.all([
      needsEntitlement
        ? resolvePurchaseEntitlementForGame(supabase, gameId, user.id)
        : Promise.resolve(false),
      resolveAdminAccess(user, supabase),
    ]);

    if (
      !canViewGame(record, user.id, {
        isAdmin,
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

    invalidateGameLeaderboardCache(gameId);

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
