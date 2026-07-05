import { sendEmail, isEmailConfigured } from "@/lib/email-service";
import { readNotificationPrefs, shouldCreateInAppNotification } from "@/lib/notification-prefs-service";
import { createUserNotification } from "@/lib/user-notifications-service";
import { createServerSupabase } from "@/lib/supabase-server";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function notifyFollowersOfNewGame(params: {
  gameId: number;
  creatorId: string;
  gameTitle: string;
  creatorName: string;
}) {
  const supabase = createServerSupabase();

  const { data: follows, error: followsError } = await supabase
    .from("creator_follows")
    .select("follower_id")
    .eq("creator_id", params.creatorId);

  if (followsError) {
    console.error("[follow new game]", followsError.message);
    return;
  }

  if (!follows?.length) return;

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  const gamePath = `/game/${params.gameId}`;
  const gameUrl = siteUrl ? `${siteUrl}${gamePath}` : gamePath;
  const creatorPath = `/creator/${params.creatorId}`;
  const creatorUrl = siteUrl ? `${siteUrl}${creatorPath}` : creatorPath;

  for (const row of follows) {
    const followerId = row.follower_id as string;
    if (followerId === params.creatorId) continue;

    try {
      if (
        await shouldCreateInAppNotification(followerId, "followed_new_game")
      ) {
        await createUserNotification({
          userId: followerId,
          kind: "followed_new_game",
          title: `新作 · ${params.creatorName}`,
          body: params.gameTitle,
          href: gamePath,
        });
      }

      if (!isEmailConfigured()) continue;

      const prefs = await readNotificationPrefs(followerId);
      if (!prefs.followNewGameEmail) continue;

      const { data: userData, error: userError } =
        await supabase.auth.admin.getUserById(followerId);

      if (userError) throw new Error(userError.message);

      const email = userData.user?.email?.trim();
      if (!email) continue;

      const html = `
        <div style="font-family:sans-serif;line-height:1.6;color:#111;">
          <h2 style="margin:0 0 12px;">🎮 追蹤的創作者發布新作</h2>
          <p><strong>${escapeHtml(params.creatorName)}</strong> 剛發布了新遊戲：</p>
          <p style="font-size:18px;font-weight:600;">${escapeHtml(params.gameTitle)}</p>
          <p><a href="${escapeHtml(gameUrl)}">立即遊玩</a> · <a href="${escapeHtml(creatorUrl)}">查看創作者主頁</a></p>
        </div>
      `.trim();

      const text = [
        "追蹤的創作者發布新作",
        `創作者：${params.creatorName}`,
        `遊戲：${params.gameTitle}`,
        gameUrl,
      ].join("\n");

      await sendEmail({
        to: email,
        subject: `新作 · ${params.creatorName} · ${params.gameTitle}`,
        html,
        text,
      });
    } catch (error) {
      console.error(
        "[follow new game email]",
        error instanceof Error ? error.message : error
      );
    }
  }
}

export async function triggerNewGameFollowerNotify(params: {
  gameId: number;
  creatorId: string;
  gameTitle: string;
}) {
  const supabase = createServerSupabase();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", params.creatorId)
    .maybeSingle();

  void notifyFollowersOfNewGame({
    ...params,
    creatorName: profile?.display_name ?? "創作者",
  });
}
