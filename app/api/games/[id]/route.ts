import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin-auth";
import {
  gameRequiresPurchase,
  resolvePurchaseEntitlementForGame,
} from "@/lib/game-entitlement-service";
import {
  canAccessGameStorePage,
  canPlayGame,
} from "@/lib/game-publish";
import { mapRecordToGame, stripPlayAccessFromGame } from "@/lib/games-data";
import { resolveGameCreator } from "@/lib/game-creator-resolver";
import {
  hasStoredPartnerAccess,
  partnerAccessCookieName,
  redeemPartnerAccessCode,
  validatePartnerAccessCode,
} from "@/lib/partner-access-service";
import { resolveGameRecordByRouteParam } from "@/lib/game-slug";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = createServerSupabase();
    const { record, numericId } = await resolveGameRecordByRouteParam(
      supabase,
      id
    );

    if (!record || numericId == null) {
      return NextResponse.json({ error: "找不到此遊戲" }, { status: 404 });
    }

    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    const cookieStore = request.headers.get("cookie") ?? "";
    const cookieName = `${partnerAccessCookieName(numericId)}=`;
    const cookieMatch = cookieStore
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(cookieName));
    const cookieCode = cookieMatch
      ? decodeURIComponent(cookieMatch.slice(cookieName.length))
      : null;

    const accessParam = new URL(request.url).searchParams.get("access");
    let partnerCodeForCookie: string | null = null;
    let hasPartnerAccess = await hasStoredPartnerAccess(
      numericId,
      cookieCode
    );

    if (!hasPartnerAccess && accessParam) {
      const accessRecord = await validatePartnerAccessCode(
        numericId,
        accessParam
      );
      if (accessRecord) {
        hasPartnerAccess = true;
        partnerCodeForCookie = accessRecord.code;
        await redeemPartnerAccessCode(accessRecord);
      }
    }

    const accessOptions = {
      isAdmin: isAdminUser(user),
      hasPartnerAccess,
    };

    if (!canAccessGameStorePage(record, user?.id, accessOptions)) {
      return NextResponse.json({ error: "找不到此遊戲" }, { status: 404 });
    }

    const hasPurchaseEntitlement = await resolvePurchaseEntitlementForGame(
      supabase,
      numericId,
      user?.id
    );

    const requiresPurchase = gameRequiresPurchase(record);
    const canPlay = canPlayGame(record, user?.id, {
      ...accessOptions,
      hasPurchaseEntitlement,
    });

    const game = mapRecordToGame(record);
    const creator = await resolveGameCreator(supabase, record);
    const enrichedGame = canPlay
      ? {
          ...game,
          creatorId: creator.creatorId,
          creator: creator.creatorName || game.creator,
        }
      : stripPlayAccessFromGame({
          ...game,
          creatorId: creator.creatorId,
          creator: creator.creatorName || game.creator,
        });

    const isCreatorPreview =
      record.publish_status === "draft" && user?.id === record.creator_id;
    const isPartnerPreview =
      record.publish_status === "draft" &&
      hasPartnerAccess &&
      user?.id !== record.creator_id;

    const response = NextResponse.json({
      game: enrichedGame,
      ownerCreatorId: record.creator_id ?? null,
      isDraftPreview: isCreatorPreview,
      isPartnerPreview,
      canPlay,
      requiresPurchase,
      hasPurchased: hasPurchaseEntitlement,
    });

    if (partnerCodeForCookie) {
      response.cookies.set(
        partnerAccessCookieName(numericId),
        partnerCodeForCookie,
        {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60 * 24 * 30,
          path: "/",
        }
      );
    }

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取遊戲失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
