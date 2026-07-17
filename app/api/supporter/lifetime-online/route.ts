import { NextResponse } from "next/server";
import { announceLifetimeSupporterOnline } from "@/lib/supporter-lifetime-announce";
import { createAuthServerClient } from "@/lib/supabase/server-auth";

/** 永久支持者上線時，世界頻道廣播（有冷卻） */
export async function POST() {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const result = await announceLifetimeSupporterOnline(user.id);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "上線廣播失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
