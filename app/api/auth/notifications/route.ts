import { NextResponse } from "next/server";
import {
  listUserNotifications,
  markAllUserNotificationsRead,
  markUserNotificationRead,
  markUserNotificationsReadByKind,
  readUserUnreadNotificationCount,
  readUserUnreadNotificationCountsByKind,
} from "@/lib/user-notifications-service";
import type { UserNotificationKind } from "@/lib/user-notifications-service";
import { createAuthServerClient } from "@/lib/supabase/server-auth";

const VALID_KINDS = new Set<UserNotificationKind>([
  "tip_received",
  "forum_reply",
  "followed_new_game",
]);

export async function GET(request: Request) {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const kindParam = new URL(request.url).searchParams.get("kind");
    const kind =
      kindParam && VALID_KINDS.has(kindParam as UserNotificationKind)
        ? (kindParam as UserNotificationKind)
        : undefined;

    const [notifications, unreadCount, unreadByKind] = await Promise.all([
      listUserNotifications(user.id, { kind }),
      readUserUnreadNotificationCount(user.id),
      readUserUnreadNotificationCountsByKind(user.id),
    ]);

    return NextResponse.json({ notifications, unreadCount, unreadByKind, kind: kind ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取通知失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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
      id?: string;
      markAll?: boolean;
      markKind?: UserNotificationKind;
    };

    if (body.markAll) {
      await markAllUserNotificationsRead(user.id);
      return NextResponse.json({ ok: true, unreadCount: 0 });
    }

    if (body.markKind && VALID_KINDS.has(body.markKind)) {
      await markUserNotificationsReadByKind(user.id, body.markKind);
      const [unreadCount, unreadByKind] = await Promise.all([
        readUserUnreadNotificationCount(user.id),
        readUserUnreadNotificationCountsByKind(user.id),
      ]);
      return NextResponse.json({ ok: true, unreadCount, unreadByKind });
    }

    if (body.id?.trim()) {
      await markUserNotificationRead(user.id, body.id.trim());
      const unreadCount = await readUserUnreadNotificationCount(user.id);
      return NextResponse.json({ ok: true, unreadCount });
    }

    return NextResponse.json({ error: "缺少 id、markAll 或 markKind" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新通知失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
