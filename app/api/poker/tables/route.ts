import { NextResponse } from "next/server";
import { TABLE_TIERS } from "@/lib/poker/types";

/** 公開牌桌級別資訊（無需登入） */
export async function GET() {
  return NextResponse.json({
    tiers: Object.values(TABLE_TIERS),
    wsUrl:
      process.env.NEXT_PUBLIC_POKER_WS_URL || "http://localhost:3101",
  });
}
