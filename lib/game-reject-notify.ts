import { sendEmail, isEmailConfigured } from "@/lib/email-service";
import { createUserNotification } from "@/lib/user-notifications-service";
import { createServerSupabase } from "@/lib/supabase-server";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function sendCreatorRejectionEmail(params: {
  creatorId: string;
  gameId: number;
  gameTitle: string;
  reason: string | null;
}) {
  if (!isEmailConfigured()) {
    return { sent: false as const, reason: "not_configured" as const };
  }

  const supabase = createServerSupabase();
  const { data: userData, error } = await supabase.auth.admin.getUserById(
    params.creatorId
  );

  if (error) throw new Error(error.message);

  const email = userData.user?.email?.trim();
  if (!email) {
    return { sent: false as const, reason: "no_email" as const };
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  const editUrl = siteUrl
    ? `${siteUrl}/dashboard/edit/${params.gameId}`
    : `/dashboard/edit/${params.gameId}`;
  const reasonText = params.reason?.trim() || "未提供具體原因";

  const html = `
    <div style="font-family:sans-serif;line-height:1.6;color:#111;">
      <h2 style="margin:0 0 12px;">作品未通過審核</h2>
      <p>你的作品 <strong>${escapeHtml(params.gameTitle)}</strong> 未通過平台審核，已退回草稿。</p>
      <p style="margin:16px 0;padding:12px;background:#f6f6f6;border-radius:8px;">
        <strong>原因：</strong>${escapeHtml(reasonText)}
      </p>
      <p>請修正後再次選擇公開並送交審核。</p>
      <p><a href="${escapeHtml(editUrl)}">前往編輯此作品</a></p>
    </div>
  `.trim();

  const text = [
    "作品未通過審核",
    `遊戲：${params.gameTitle}`,
    `原因：${reasonText}`,
    `編輯：${editUrl}`,
  ].join("\n");

  await sendEmail({
    to: email,
    subject: `審核未通過 · ${params.gameTitle}`,
    html,
    text,
  });

  return { sent: true as const, email };
}

/** 審核結果為平台重要狀態，站內通知預設必送（不套用可關閉偏好）。 */
export async function notifyCreatorOfGameRejection(params: {
  creatorId: string;
  gameId: number;
  gameTitle: string;
  reason?: string | null;
}) {
  const reason = params.reason?.trim() || null;
  const href = `/dashboard/edit/${params.gameId}`;
  const body = reason
    ? `「${params.gameTitle}」未通過審核：${reason}`
    : `「${params.gameTitle}」未通過審核，已退回草稿。請修正後再次送審。`;

  try {
    await createUserNotification({
      userId: params.creatorId,
      kind: "game_rejected",
      title: "作品未通過審核",
      body,
      href,
    });
  } catch (error) {
    console.error(
      "[game reject in-app notify]",
      error instanceof Error ? error.message : error
    );
  }

  try {
    await sendCreatorRejectionEmail({
      creatorId: params.creatorId,
      gameId: params.gameId,
      gameTitle: params.gameTitle,
      reason,
    });
  } catch (error) {
    console.error(
      "[game reject email]",
      error instanceof Error ? error.message : error
    );
  }
}
