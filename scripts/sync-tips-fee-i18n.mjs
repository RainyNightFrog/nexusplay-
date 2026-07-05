import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const dir = resolve(process.cwd(), "messages");

const NEW_KEYS = {
  tipsPreviewBanner: "Payments coming soon",
  tipsFeeDisclosureTitle: "How are tip fees calculated?",
  tipsFeeDisclosureIntro:
    "All fees apply per individual tip, not as a lump sum on monthly totals. This is a preview — no real charges yet.",
  tipsFeePerTransactionTitle: "Calculated per tip",
  tipsFeePerTransactionDesc:
    "Each time a player tips, one transaction is created. Platform and payment fees are deducted from that transaction.",
  tipsFeePlatformTitle: "Platform fee (planned {percent}% per tip)",
  tipsFeePlatformDesc:
    "NexusPlay plans to charge {percent}% per tip to run servers and develop features. Rate may change before launch.",
  tipsFeePaymentTitle: "Payment processor fee (per tip)",
  tipsFeePaymentDesc:
    "Charged by Stripe/PayPal, typically ~{percent}% + ${fixed} USD, separate from the platform fee.",
  tipsFeeCreatorNetTitle: "Estimated creator net (per tip)",
  tipsFeeCreatorNetFormula:
    "Net ≈ tip amount − platform fee − payment fee",
  tipsFeeExampleLine:
    "e.g. ${tip} tip → platform −${platform}, processor −${processor} → you ~${net}",
  tipsFeeItchCompareTitle: "Compare with itch.io",
  tipsFeeItchCompareDesc:
    "itch.io uses Open Revenue Sharing: creators choose what % of each sale goes to itch.io (0–100%, default 10%). Payment processor fees (PayPal/Stripe) are separate. NexusPlay currently plans a fixed {percent}% default; adjustable sharing may come later.",
  tipsFeePlayerBriefTitle: "What players see",
  tipsFeePlayerBriefDesc:
    "Tips are voluntary — games remain fully playable without paying. The exact amount is shown before checkout. Tips support creators; they are not product purchases.",
  tipsFeeSettlementDesc:
    "Tips accumulate in your creator balance and are paid out in batches once a threshold is met (schedule announced at launch).",
  revenueMockDataNote:
    "Charts below are simulated preview data, not real payouts. After launch, you'll see net revenue after platform and payment fees.",
};

for (const locale of [
  "zh-CN",
  "es",
  "fr",
  "de",
  "pt",
  "th",
  "vi",
  "ko",
  "ja",
]) {
  const filePath = resolve(dir, `${locale}.json`);
  const data = JSON.parse(readFileSync(filePath, "utf8"));
  data.dashboard = { ...data.dashboard, ...NEW_KEYS };
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(`✓ ${locale}.json`);
}
