import { NextResponse } from "next/server";
import { isAdminUser } from "@/lib/admin-auth";
import { canViewGame } from "@/lib/game-publish";
import { mapRecordToGame } from "@/lib/games-data";
import {
  hasStoredPartnerAccess,
  partnerAccessCookieName,
  redeemPartnerAccessCode,
  validatePartnerAccessCode,
} from "@/lib/partner-access-service";
import { createAuthServerClient } from "@/lib/supabase/server-auth";
import { createServerSupabase } from "@/lib/supabase-server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numericId = Number.parseInt(id, 10);

    if (Number.isNaN(numericId)) {
      return NextResponse.json({ error: "無效的遊戲 ID" }, { status: 400 });
    }

    const supabase = createServerSupabase();
    const { data: record, error: recordError } = await supabase
      .from("games")
      .select("*")
      .eq("id", numericId)
      .maybeSingle();

    if (recordError) {
      throw new Error(`讀取遊戲失敗：${recordError.message}`);
    }

    if (!record) {
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

    if (
      !canViewGame(record, user?.id, {
        isAdmin: isAdminUser(user),
        hasPartnerAccess,
      })
    ) {
      return NextResponse.json({ error: "找不到此遊戲" }, { status: 404 });
    }

    const game = mapRecordToGame(record);
    const isCreatorPreview =
      record.publish_status === "draft" && user?.id === record.creator_id;
    const isPartnerPreview =
      record.publish_status === "draft" &&
      hasPartnerAccess &&
      user?.id !== record.creator_id;

    const response = NextResponse.json({
      game,
      isDraftPreview: isCreatorPreview,
      isPartnerPreview,
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
