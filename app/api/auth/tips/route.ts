import { NextResponse } from "next/server";
import { listPayerTips } from "@/lib/payer-tips-service";
import { createAuthServerClient } from "@/lib/supabase/server-auth";

export async function GET() {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const tips = await listPayerTips(user.id);

    return NextResponse.json({ tips });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取打賞紀錄失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
