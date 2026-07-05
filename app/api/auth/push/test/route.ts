import { NextResponse } from "next/server";
import { listPushSubscriptions } from "@/lib/push-subscription-service";
import { sendWebPushToUser } from "@/lib/web-push-service";
import { isWebPushConfigured } from "@/lib/web-push-config";
import { createAuthServerClient } from "@/lib/supabase/server-auth";

export async function POST() {
  try {
    if (!isWebPushConfigured()) {
      return NextResponse.json({ error: "推播尚未設定" }, { status: 503 });
    }

    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const subscriptions = await listPushSubscriptions(user.id);
    if (subscriptions.length === 0) {
      return NextResponse.json({ error: "尚未訂閱推播" }, { status: 400 });
    }

    const sent = await sendWebPushToUser(user.id, {
      title: "NexusPlay",
      body: "推播測試成功 — 通知設定運作正常。",
      url: "/notifications",
    });

    if (sent === 0) {
      return NextResponse.json({ error: "推播送達失敗" }, { status: 502 });
    }

    return NextResponse.json({ ok: true, sent });
  } catch (error) {
    const message = error instanceof Error ? error.message : "推播測試失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
