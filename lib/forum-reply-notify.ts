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

export async function sendForumReplyNotificationEmail(params: {
  recipientUserId: string;
  gameTitle: string;
  postTitle: string;
  replyPreview: string;
  forumUrl: string;
}) {
  if (!isEmailConfigured()) {
    return { sent: false as const, reason: "not_configured" as const };
  }

  const prefs = await readNotificationPrefs(params.recipientUserId);
  if (!prefs.forumReplyNotifyEmail) {
    return { sent: false as const, reason: "disabled" as const };
  }

  const supabase = createServerSupabase();
  const { data: userData, error } = await supabase.auth.admin.getUserById(
    params.recipientUserId
  );

  if (error) throw new Error(error.message);

  const email = userData.user?.email?.trim();
  if (!email) {
    return { sent: false as const, reason: "no_email" as const };
  }

  const preview = params.replyPreview.slice(0, 200);
  const html = `
    <div style="font-family:sans-serif;line-height:1.6;color:#111;">
      <h2 style="margin:0 0 12px;">💬 有人回覆你的討論</h2>
      <p>在 <strong>${escapeHtml(params.gameTitle)}</strong> 的討論串「${escapeHtml(params.postTitle)}」有新回覆：</p>
      <blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #8b5cf6;background:#f4f4f5;">
        ${escapeHtml(preview)}${params.replyPreview.length > 200 ? "…" : ""}
      </blockquote>
      <p><a href="${escapeHtml(params.forumUrl)}">前往討論區查看</a></p>
    </div>
  `.trim();

  const text = [
    "有人回覆你的討論",
    `遊戲：${params.gameTitle}`,
    `討論：${params.postTitle}`,
    preview,
    params.forumUrl,
  ].join("\n");

  await sendEmail({
    to: email,
    subject: `新回覆 · ${params.postTitle}`,
    html,
    text,
  });

  return { sent: true as const, email };
}

export async function notifyForumPostAuthorOfReply(params: {
  postId: number;
  gameId: number;
  replierUserId: string;
  replyContent: string;
}) {
  const supabase = createServerSupabase();

  const { data: post, error: postError } = await supabase
    .from("forum_posts")
    .select("user_id, title, game_id")
    .eq("id", params.postId)
    .maybeSingle();

  if (postError) throw new Error(postError.message);
  if (!post?.user_id || post.user_id === params.replierUserId) {
    return;
  }

  const { data: game } = await supabase
    .from("games")
    .select("title")
    .eq("id", params.gameId)
    .maybeSingle();

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  const forumPath = `/game/${params.gameId}/forum?post=${params.postId}`;
  const forumUrl = siteUrl ? `${siteUrl}${forumPath}` : forumPath;

  try {
    if (
      await shouldCreateInAppNotification(post.user_id, "forum_reply")
    ) {
      await createUserNotification({
        userId: post.user_id,
        kind: "forum_reply",
        title: `新回覆 · ${post.title}`,
        body: params.replyContent.slice(0, 160),
        href: forumPath,
      });
    }
  } catch (error) {
    console.error(
      "[forum reply in-app notify]",
      error instanceof Error ? error.message : error
    );
  }

  try {
    await sendForumReplyNotificationEmail({
      recipientUserId: post.user_id,
      gameTitle: game?.title ?? `#${params.gameId}`,
      postTitle: post.title,
      replyPreview: params.replyContent,
      forumUrl,
    });
  } catch (error) {
    console.error(
      "[forum reply email]",
      error instanceof Error ? error.message : error
    );
  }
}
