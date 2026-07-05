import { NextResponse } from "next/server";
import {
  clearCreatorUnreadTipCount,
  readCreatorUnreadTipCount,
} from "@/lib/creator-tip-notify";
import { hasCreatorDashboardAccess, resolveUserRole } from "@/lib/auth-profile";
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

    const role = await resolveUserRole(authClient, user);
    if (!hasCreatorDashboardAccess(user, role)) {
      return NextResponse.json({ unreadCount: 0 });
    }

    const unreadCount = await readCreatorUnreadTipCount(user.id);
    return NextResponse.json({ unreadCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取通知失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    await clearCreatorUnreadTipCount(user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新通知失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
