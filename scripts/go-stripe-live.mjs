/**
 * RainyNightFrog 切換 Stripe Live 真實收款
 *
 * 用法（擇一）：
 *   1. 先在 .env.local 貼好 pk_live_ / sk_live_，再執行：
 *        npm run go-stripe-live
 *   2. 直接帶參數（不會印在終端機 log 以外的地方）：
 *        node scripts/go-stripe-live.mjs --pk=pk_live_... --sk=sk_live_...
 *
 * 流程：寫入 .env.local → 建立 Live Webhook → 同步 Vercel → production 部署
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
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

function parseArgs() {
  const out = {};
  for (const arg of process.argv.slice(2)) {
    const m = arg.match(/^--(pk|sk)=(.+)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function loadEnvFile(path) {
  const env = {};
  if (!existsSync(path)) return env;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

function upsertEnvLine(content, key, value) {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  if (pattern.test(content)) return content.replace(pattern, line);
  return `${content.replace(/\s*$/, "")}\n${line}\n`;
}

function run(cmd, args, input) {
  return spawnSync(cmd, args, {
    input,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    shell: process.platform === "win32",
  });
}

function mask(value) {
  const v = value?.trim();
  if (!v || v.length <= 12) return "***";
  return `${v.slice(0, 10)}…${v.slice(-4)}`;
}

const envPath = resolve(process.cwd(), ".env.local");
if (!existsSync(envPath)) {
  console.error("找不到 .env.local");
  process.exit(1);
}

const args = parseArgs();
let content = readFileSync(envPath, "utf8");
const env = loadEnvFile(envPath);

const pk = (args.pk ?? env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "").trim();
const sk = (args.sk ?? env.STRIPE_SECRET_KEY ?? "").trim();

if (!pk.startsWith("pk_live_") || !sk.startsWith("sk_live_")) {
  console.error("\n❌ 需要 Live 金鑰（pk_live_ / sk_live_）\n");
  console.error("請在 Stripe Dashboard 右上角切到「真实」，然後：");
  console.error("  Developers → API keys → 複製 Publishable key 與 Secret key\n");
  console.error("方式 A：貼到 .env.local 後再執行 npm run go-stripe-live");
  console.error("方式 B：node scripts/go-stripe-live.mjs --pk=pk_live_... --sk=sk_live_...\n");
  process.exit(1);
}

content = upsertEnvLine(content, "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", pk);
content = upsertEnvLine(content, "STRIPE_SECRET_KEY", sk);
content = upsertEnvLine(content, "STRIPE_PAYMENTS_LIVE", "true");
content = upsertEnvLine(content, "STRIPE_CONNECT_COUNTRY", env.STRIPE_CONNECT_COUNTRY?.trim() || "HK");
content = upsertEnvLine(content, "PLATFORM_PREVIEW_MODE", "false");
writeFileSync(envPath, content, "utf8");
console.log(`✓ 已寫入 .env.local（pk: ${mask(pk)}, sk: ${mask(sk)}）`);

const siteUrl = (env.NEXT_PUBLIC_SITE_URL ?? "https://nexusplay-five.vercel.app").replace(
  /\/$/,
  ""
);
const webhookUrl = `${siteUrl}/api/webhooks/stripe`;

console.log("\n連線 Stripe Live API…");
const stripe = new Stripe(sk);
const account = await stripe.accounts.retrieve();
console.log(`✓ 帳戶 ${account.id} | charges: ${account.charges_enabled} | payouts: ${account.payouts_enabled}`);

if (!account.charges_enabled) {
  console.warn("\n⚠ 平台帳戶 charges_enabled=false，Live 打賞可能失敗。請先完成 Stripe Dashboard 審核。");
}

console.log(`\n設定 Live Webhook → ${webhookUrl}`);
const existing = await stripe.webhookEndpoints.list({ limit: 100 });
const found = existing.data.find((ep) => ep.url === webhookUrl);

let endpoint = found;
if (found) {
  endpoint = await stripe.webhookEndpoints.update(found.id, {
    enabled_events: WEBHOOK_EVENTS,
    disabled: false,
  });
  console.log("✓ 已更新現有 Live Webhook");
} else {
  endpoint = await stripe.webhookEndpoints.create({
    url: webhookUrl,
    enabled_events: WEBHOOK_EVENTS,
    description: "RainyNightFrog tips + Connect (live)",
  });
  console.log("✓ 已建立 Live Webhook");
}

const signingSecret = endpoint.secret;
if (!signingSecret) {
  console.error("\n⚠ Webhook 已存在但無法顯示 signing secret。");
  console.error("請到 Stripe Dashboard（真实）→ Webhooks → 顯示簽章密鑰 → 貼到 STRIPE_WEBHOOK_SECRET");
  console.error("然後執行 npm run sync:stripe-vercel");
  process.exit(1);
}

content = readFileSync(envPath, "utf8");
content = upsertEnvLine(content, "STRIPE_WEBHOOK_SECRET", signingSecret);
writeFileSync(envPath, content, "utf8");
console.log(`✓ 已寫入 STRIPE_WEBHOOK_SECRET (${mask(signingSecret)})`);

console.log("\n連結 Vercel 專案 nexusplay…");
const link = run("npx", ["vercel", "link", "--project", "nexusplay", "--yes"]);
if (link.status !== 0) {
  console.error(link.stderr || link.stdout);
  process.exit(link.status ?? 1);
}

const KEYS = [
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PAYMENTS_LIVE",
  "STRIPE_CONNECT_COUNTRY",
  "PLATFORM_PREVIEW_MODE",
];
const freshEnv = loadEnvFile(envPath);

for (const key of KEYS) {
  const value = freshEnv[key]?.trim();
  if (!value) {
    console.error(`缺少 ${key}`);
    process.exit(1);
  }
  for (const target of ["production", "preview"]) {
    run("npx", ["vercel", "env", "rm", key, target, "--yes"]);
    const add = run("npx", ["vercel", "env", "add", key, target], `${value}\n`);
    if (add.status !== 0) {
      console.error(`✗ ${key} (${target})`);
      console.error(add.stderr || add.stdout);
      process.exit(add.status ?? 1);
    }
    console.log(`✓ Vercel ${key} → ${target}`);
  }
}

console.log("\n觸發 production 重新部署…");
const deploy = run("npx", ["vercel", "redeploy", siteUrl.replace(/^https?:\/\//, "").split("/")[0], "--target", "production"]);
if (deploy.status !== 0) {
  console.error(deploy.stderr || deploy.stdout);
  process.exit(deploy.status ?? 1);
}
console.log(deploy.stdout?.trim() || "部署完成");

console.log("\n=== Live 上線完成 ===\n");
console.log("請手動確認：");
console.log("1. 創作者到 /settings/payout 重新完成 Connect（沙盒連結不會帶到 Live）");
console.log("2. 用小額真實打賞測試（會真扣款）");
console.log(`3. Stripe Dashboard（真实）→ Webhooks → ${webhookUrl} 顯示綠色`);
console.log(`4. 開啟 ${siteUrl}/api/platform/status 確認 paymentsLive: true\n`);
