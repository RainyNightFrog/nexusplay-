import { NextResponse } from "next/server";
import {
  readNotificationPrefs,
  updateNotificationPrefs,
} from "@/lib/notification-prefs-service";
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

    const prefs = await readNotificationPrefs(user.id);
    return NextResponse.json(prefs);
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取通知設定失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "請先登入" }, { status: 401 });
    }

    const body = (await request.json()) as {
      tipNotifyEmail?: boolean;
      tipNotifyInApp?: boolean;
      forumReplyNotifyEmail?: boolean;
      forumReplyNotifyInApp?: boolean;
      followNewGameEmail?: boolean;
      followNewGameInApp?: boolean;
      pushNotifyEnabled?: boolean;
      pushNotifyTip?: boolean;
      pushNotifyForum?: boolean;
      pushNotifyFollow?: boolean;
      forumEmailDigest?: boolean;
    };

    const prefs = await updateNotificationPrefs(user.id, {
      tipNotifyEmail:
        body.tipNotifyEmail !== undefined ? body.tipNotifyEmail === true : undefined,
      tipNotifyInApp:
        body.tipNotifyInApp !== undefined ? body.tipNotifyInApp === true : undefined,
      forumReplyNotifyEmail:
        body.forumReplyNotifyEmail !== undefined
          ? body.forumReplyNotifyEmail === true
          : undefined,
      forumReplyNotifyInApp:
        body.forumReplyNotifyInApp !== undefined
          ? body.forumReplyNotifyInApp === true
          : undefined,
      followNewGameEmail:
        body.followNewGameEmail !== undefined
          ? body.followNewGameEmail === true
          : undefined,
      followNewGameInApp:
        body.followNewGameInApp !== undefined
          ? body.followNewGameInApp === true
          : undefined,
      pushNotifyEnabled:
        body.pushNotifyEnabled !== undefined
          ? body.pushNotifyEnabled === true
          : undefined,
      pushNotifyTip:
        body.pushNotifyTip !== undefined ? body.pushNotifyTip === true : undefined,
      pushNotifyForum:
        body.pushNotifyForum !== undefined ? body.pushNotifyForum === true : undefined,
      pushNotifyFollow:
        body.pushNotifyFollow !== undefined ? body.pushNotifyFollow === true : undefined,
      forumEmailDigest:
        body.forumEmailDigest !== undefined ? body.forumEmailDigest === true : undefined,
    });

    return NextResponse.json(prefs);
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新通知設定失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
