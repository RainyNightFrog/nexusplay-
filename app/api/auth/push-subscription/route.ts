import { NextResponse } from "next/server";
import {
  deleteAllPushSubscriptions,
  deletePushSubscription,
  savePushSubscription,
} from "@/lib/push-subscription-service";
import { updateNotificationPrefs } from "@/lib/notification-prefs-service";
import { createAuthServerClient } from "@/lib/supabase/server-auth";

export async function POST(request: Request) {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const body = (await request.json()) as {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };

    const endpoint = body.endpoint?.trim();
    const p256dh = body.keys?.p256dh?.trim();
    const auth = body.keys?.auth?.trim();

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: "訂閱資料不完整" }, { status: 400 });
    }

    await savePushSubscription(user.id, { endpoint, p256dh, auth });
    await updateNotificationPrefs(user.id, { pushNotifyEnabled: true });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "儲存推播訂閱失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as { endpoint?: string };
    const endpoint = body.endpoint?.trim();

    if (endpoint) {
      await deletePushSubscription(user.id, endpoint);
    } else {
      await deleteAllPushSubscriptions(user.id);
    }

    await updateNotificationPrefs(user.id, { pushNotifyEnabled: false });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "移除推播訂閱失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
