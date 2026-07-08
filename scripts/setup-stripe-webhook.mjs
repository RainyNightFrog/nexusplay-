/**
 * 建立 Stripe Webhook 並寫入 .env.local 的 STRIPE_WEBHOOK_SECRET
 * 執行：npm run setup:stripe-webhook
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import Stripe from "stripe";

const WEBHOOK_EVENTS = [
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "charge.refunded",
  "charge.dispute.created",
  "charge.dispute.closed",
  "account.updated",
  "payout.paid",
  "payout.failed",
  "payout.canceled",
  "payout.updated",
];

function loadEnv() {
  const path = resolve(process.cwd(), ".env.local");
  const env = {};
  if (!existsSync(path)) throw new Error(".env.local 不存在");
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return { path, env };
}

function upsertEnvLine(content, key, value) {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  if (pattern.test(content)) return content.replace(pattern, line);
  return `${content.replace(/\s*$/, "")}\n${line}\n`;
}

const { path: envPath, env } = loadEnv();
const secretKey = env.STRIPE_SECRET_KEY?.trim();
const siteUrl = (env.NEXT_PUBLIC_SITE_URL ?? "https://nexusplay-five.vercel.app").replace(
  /\/$/,
  ""
);
const webhookUrl = `${siteUrl}/api/webhooks/stripe`;

if (!secretKey?.startsWith("sk_")) {
  console.error("請先在 .env.local 設定有效的 STRIPE_SECRET_KEY");
  process.exit(1);
}

const stripe = new Stripe(secretKey);
const existing = await stripe.webhookEndpoints.list({ limit: 100 });
const found = existing.data.find((ep) => ep.url === webhookUrl);

let endpoint = found;
if (found) {
  endpoint = await stripe.webhookEndpoints.update(found.id, {
    enabled_events: WEBHOOK_EVENTS,
    disabled: false,
  });
  console.log(`✓ 已更新現有 Webhook: ${webhookUrl}`);
} else {
  endpoint = await stripe.webhookEndpoints.create({
    url: webhookUrl,
    enabled_events: WEBHOOK_EVENTS,
    description: "RainyNightFrog tips + Connect",
  });
  console.log(`✓ 已建立 Webhook: ${webhookUrl}`);
}

const signingSecret = endpoint.secret;
if (!signingSecret) {
  console.log("\n⚠ 此 endpoint 已存在，無法再次顯示 signing secret。");
  console.log("請到 Stripe Dashboard → Webhooks → 該 endpoint → 顯示簽章密鑰");
  console.log("手動貼到 .env.local 的 STRIPE_WEBHOOK_SECRET");
  process.exit(0);
}

let content = readFileSync(envPath, "utf8");
content = upsertEnvLine(content, "STRIPE_WEBHOOK_SECRET", signingSecret);
writeFileSync(envPath, content, "utf8");

console.log(`✓ 已寫入 .env.local → STRIPE_WEBHOOK_SECRET`);
console.log(`  模式: ${secretKey.startsWith("sk_live_") ? "live" : "test"}`);
