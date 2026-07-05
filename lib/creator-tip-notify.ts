import { sendEmail, isEmailConfigured } from "@/lib/email-service";
import { shouldCreateInAppNotification } from "@/lib/notification-prefs-service";
import { createUserNotification } from "@/lib/user-notifications-service";
import { createServerSupabase } from "@/lib/supabase-server";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function incrementCreatorUnreadTipCount(creatorId: string) {
  const supabase = createServerSupabase();
  const { data: profile } = await supabase
    .from("profiles")
    .select("unread_tip_count")
    .eq("id", creatorId)
    .maybeSingle();

  const current =
    typeof profile?.unread_tip_count === "number"
      ? profile.unread_tip_count
      : Number.parseInt(String(profile?.unread_tip_count ?? 0), 10) || 0;

  await supabase
    .from("profiles")
    .update({ unread_tip_count: current + 1 })
    .eq("id", creatorId);
}

export async function sendCreatorTipNotificationEmail(params: {
  creatorId: string;
  gameTitle: string;
  amountUsd: number;
  creatorNetUsd: number;
}) {
  if (!isEmailConfigured()) {
    return { sent: false as const, reason: "not_configured" as const };
  }

  const supabase = createServerSupabase();
  const { data: userData, error } = await supabase.auth.admin.getUserById(
    params.creatorId
  );

  if (error) throw new Error(error.message);

  const { data: profile } = await supabase
    .from("profiles")
    .select("tip_notify_email")
    .eq("id", params.creatorId)
    .maybeSingle();

  if (profile?.tip_notify_email === false) {
    return { sent: false as const, reason: "disabled" as const };
  }

  const email = userData.user?.email?.trim();
  if (!email) {
    return { sent: false as const, reason: "no_email" as const };
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  const dashboardUrl = siteUrl ? `${siteUrl}/dashboard` : "/dashboard";

  const html = `
    <div style="font-family:sans-serif;line-height:1.6;color:#111;">
      <h2 style="margin:0 0 12px;">🎉 收到新的打賞！</h2>
      <p>有人支持你的作品 <strong>${escapeHtml(params.gameTitle)}</strong>。</p>
      <table style="border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:4px 12px 4px 0;color:#666;">打賞金額</td><td><strong>$${params.amountUsd.toFixed(2)} USD</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666;">預估實收</td><td>$${params.creatorNetUsd.toFixed(2)} USD</td></tr>
      </table>
      <p><a href="${escapeHtml(dashboardUrl)}">前往創作者後台查看</a></p>
    </div>
  `.trim();

  const text = [
    "收到新的打賞！",
    `遊戲：${params.gameTitle}`,
    `打賞：$${params.amountUsd.toFixed(2)} USD`,
    `預估實收：$${params.creatorNetUsd.toFixed(2)} USD`,
    `後台：${dashboardUrl}`,
  ].join("\n");

  await sendEmail({
    to: email,
    subject: `新打賞 · ${params.gameTitle} · $${params.amountUsd.toFixed(2)}`,
    html,
    text,
  });

  return { sent: true as const, email };
}

export async function notifyCreatorOfTip(params: {
  creatorId: string;
  gameTitle: string;
  amountUsd: number;
  creatorNetUsd: number;
}) {
  await incrementCreatorUnreadTipCount(params.creatorId);

  try {
    if (await shouldCreateInAppNotification(params.creatorId, "tip_received")) {
      await createUserNotification({
        userId: params.creatorId,
        kind: "tip_received",
        title: `新打賞 · ${params.gameTitle}`,
        body: `$${params.amountUsd.toFixed(2)} USD（預估實收 $${params.creatorNetUsd.toFixed(2)}）`,
        href: "/dashboard",
      });
    }
  } catch (error) {
    console.error(
      "[creator tip in-app notify]",
      error instanceof Error ? error.message : error
    );
  }

  try {
    await sendCreatorTipNotificationEmail(params);
  } catch (error) {
    console.error(
      "[creator tip email]",
      error instanceof Error ? error.message : error
    );
  }
}

export async function readCreatorUnreadTipCount(creatorId: string) {
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from("profiles")
    .select("unread_tip_count")
    .eq("id", creatorId)
    .maybeSingle();

  const count =
    typeof data?.unread_tip_count === "number"
      ? data.unread_tip_count
      : Number.parseInt(String(data?.unread_tip_count ?? 0), 10) || 0;

  return Math.max(0, count);
}

export async function clearCreatorUnreadTipCount(creatorId: string) {
  const supabase = createServerSupabase();
  await supabase
    .from("profiles")
    .update({ unread_tip_count: 0 })
    .eq("id", creatorId);
}
