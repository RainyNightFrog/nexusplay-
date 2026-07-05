import { NextResponse } from "next/server";
import {
  partnerAccessCookieName,
  redeemPartnerAccessCode,
  validatePartnerAccessCode,
} from "@/lib/partner-access-service";

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

    const body = (await request.json()) as { code?: string };
    const code = body.code?.trim();
    if (!code) {
      return NextResponse.json({ error: "請輸入試玩碼" }, { status: 400 });
    }

    const record = await validatePartnerAccessCode(gameId, code);
    if (!record) {
      return NextResponse.json({ error: "試玩碼無效或已過期" }, { status: 403 });
    }

    await redeemPartnerAccessCode(record);

    const response = NextResponse.json({ ok: true, code: record.code });
    response.cookies.set(partnerAccessCookieName(gameId), record.code, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "驗證試玩碼失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
