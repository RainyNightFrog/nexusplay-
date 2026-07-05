import { NextResponse } from "next/server";
import { listForumDigestDeliveries } from "@/lib/forum-digest-delivery-log";
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

    const deliveries = await listForumDigestDeliveries(user.id);
    return NextResponse.json({ deliveries });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取摘要寄送紀錄失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
