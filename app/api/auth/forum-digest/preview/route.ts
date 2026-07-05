import { NextResponse } from "next/server";
import {
  buildForumDigestPreview,
  renderForumDigestHtml,
  renderForumDigestText,
} from "@/lib/forum-digest-service";
import { readNotificationPrefs } from "@/lib/notification-prefs-service";
import { readPreferredLocale } from "@/lib/locale-preference-service";
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
    const locale = await readPreferredLocale(user.id);
    const preview = await buildForumDigestPreview(user.id, locale);

    return NextResponse.json({
      enabled: prefs.forumEmailDigest,
      preview,
      html: renderForumDigestHtml(preview),
      text: renderForumDigestText(preview),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "讀取摘要預覽失敗";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
