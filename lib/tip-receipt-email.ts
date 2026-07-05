import { sendEmail, isEmailConfigured } from "@/lib/email-service";
import { formatBillingLines, type TipReceipt } from "@/lib/tip-receipt";
import { createServerSupabase } from "@/lib/supabase-server";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildTipReceiptEmailContent(receipt: TipReceipt) {
  const billingLines = formatBillingLines(receipt.billing);
  const billingHtml =
    billingLines.length > 0
      ? `<p><strong>帳單地址</strong><br/>${billingLines.map((line) => escapeHtml(line)).join("<br/>")}</p>`
      : "";

  const html = `
    <div style="font-family:sans-serif;line-height:1.6;color:#111;">
      <h2 style="margin:0 0 12px;">NexusPlay 打賞收據</h2>
      <p>感謝你支持創作者！</p>
      <table style="border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:4px 12px 4px 0;color:#666;">遊戲</td><td>${escapeHtml(receipt.gameTitle)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666;">金額</td><td><strong>$${receipt.amountUsd.toFixed(2)} USD</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666;">時間</td><td>${escapeHtml(new Date(receipt.createdAt).toLocaleString())}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666;">收據編號</td><td>${escapeHtml(receipt.tipId)}</td></tr>
      </table>
      ${billingHtml}
      <p style="color:#666;font-size:12px;">打賞為自願性支持，非購買遊戲。詳見平台付款政策。</p>
    </div>
  `.trim();

  const text = [
    "NexusPlay 打賞收據",
    `遊戲：${receipt.gameTitle}`,
    `金額：$${receipt.amountUsd.toFixed(2)} USD`,
    `時間：${new Date(receipt.createdAt).toLocaleString()}`,
    `收據編號：${receipt.tipId}`,
    billingLines.length > 0 ? `帳單地址：\n${billingLines.join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject: `打賞收據 · ${receipt.gameTitle} · $${receipt.amountUsd.toFixed(2)}`,
    html,
    text,
  };
}

export async function sendTipReceiptEmail(params: {
  payerId: string;
  receipt: TipReceipt;
}) {
  if (!isEmailConfigured()) {
    return { sent: false as const, reason: "not_configured" as const };
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase.auth.admin.getUserById(params.payerId);

  if (error) {
    throw new Error(error.message);
  }

  const email = data.user?.email?.trim();
  if (!email) {
    return { sent: false as const, reason: "no_email" as const };
  }

  const content = buildTipReceiptEmailContent(params.receipt);
  await sendEmail({ to: email, ...content });

  return { sent: true as const, email };
}

export async function sendTipReceiptEmailSafe(params: {
  payerId: string;
  receipt: TipReceipt;
}) {
  try {
    return await sendTipReceiptEmail(params);
  } catch (error) {
    console.error(
      "[tip receipt email]",
      error instanceof Error ? error.message : error
    );
    return { sent: false as const, reason: "error" as const };
  }
}
