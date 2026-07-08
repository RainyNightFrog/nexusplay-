/**
 * RainyNightFrog Stripe 設定檢查 — 執行：npm run check:stripe
 * 不會輸出完整 secret，只顯示是否已設定與下一步。
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const path = resolve(process.cwd(), ".env.local");
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

function mask(value) {
  const v = value?.trim();
  if (!v) return "(未設定)";
  if (v.length <= 12) return "***";
  return `${v.slice(0, 7)}…${v.slice(-4)}`;
}

function keyMode(value) {
  const v = value?.trim() ?? "";
  if (!v) return "missing";
  if (v.startsWith("pk_test_") || v.startsWith("sk_test_")) return "test";
  if (v.startsWith("pk_live_") || v.startsWith("sk_live_")) return "live";
  return "unknown";
}

const STRIPE_KEYS = [
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PAYMENTS_LIVE",
  "STRIPE_CONNECT_COUNTRY",
  "PLATFORM_PREVIEW_MODE",
  "NEXT_PUBLIC_SITE_URL",
];

const env = loadEnv();
const pk = env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const sk = env.STRIPE_SECRET_KEY;
const pkMode = keyMode(pk);
const skMode = keyMode(sk);
const modesMatch = pkMode === skMode || pkMode === "missing" || skMode === "missing";
const paymentsLive = env.STRIPE_PAYMENTS_LIVE?.trim().toLowerCase() === "true";
const previewOff = env.PLATFORM_PREVIEW_MODE?.trim().toLowerCase() === "false";
const siteUrl = (env.NEXT_PUBLIC_SITE_URL ?? "https://nexusplay-five.vercel.app").replace(
  /\/$/,
  ""
);
const webhookUrl = `${siteUrl}/api/webhooks/stripe`;

console.log("\n=== RainyNightFrog Stripe 設定檢查 ===\n");

for (const key of STRIPE_KEYS) {
  const value = env[key];
  const status = value?.trim() ? "✓" : "✗";
  const display =
    key.includes("SECRET") || key.includes("KEY")
      ? mask(value)
      : value?.trim() || "(未設定)";
  console.log(`${status} ${key}: ${display}`);
}

console.log("\n--- 模式 ---");
console.log(`金鑰模式: ${pkMode} / ${skMode}${modesMatch ? "" : " ⚠ 公鑰與私鑰模式不一致！"}`);
console.log(
  `STRIPE_PAYMENTS_LIVE: ${paymentsLive ? "true（啟用 Stripe 流程）" : "false 或未設"}`
);
console.log(
  `PLATFORM_PREVIEW_MODE: ${env.PLATFORM_PREVIEW_MODE ?? "(未設，預設依金鑰判斷)"}`
);

const readyLocal =
  pk?.trim() &&
  sk?.trim() &&
  env.STRIPE_WEBHOOK_SECRET?.trim() &&
  paymentsLive &&
  modesMatch;

console.log(`\n本機可測試打賞: ${readyLocal ? "是" : "否"}`);

if (sk?.trim()) {
  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(sk.trim());
    const account = await stripe.accounts.retrieve();
    console.log("\n--- Stripe API 連線 ---");
    console.log(`帳戶 ID: ${account.id}`);
    console.log(`charges_enabled: ${account.charges_enabled}`);
    console.log(`payouts_enabled: ${account.payouts_enabled}`);
    const mode = sk.startsWith("sk_live_") ? "live" : "test";
    console.log(`API 模式: ${mode}`);
  } catch (error) {
    console.log("\n--- Stripe API 連線 ---");
    console.log(`失敗: ${error instanceof Error ? error.message : error}`);
  }
}

console.log("\n=== 你需要在瀏覽器做的事（我無法代勞）===\n");
console.log("1. Stripe Dashboard → Connect → 業務模式選「交易市場」→ 完成設置指南");
console.log("2. Developers → API keys → 複製 pk_ / sk_ 貼到 .env.local 與 Vercel");
console.log("3. Developers → Webhooks → 新增 endpoint：");
console.log(`   ${webhookUrl}`);
console.log("   事件: payment_intent.*, charge.refunded, charge.dispute.created,");
console.log("         account.updated, payout.*");
console.log("4. 複製 whsec_… → STRIPE_WEBHOOK_SECRET");
console.log("5. Vercel 設好變數後 Redeploy");
console.log("\n=== .env.local 範例（把 YOUR_ 換成真實值）===\n");
console.log(`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PAYMENTS_LIVE=true
STRIPE_CONNECT_COUNTRY=HK
PLATFORM_PREVIEW_MODE=false`);

const todo = [];
if (!pk?.trim()) todo.push("設定 NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
if (!sk?.trim()) todo.push("設定 STRIPE_SECRET_KEY");
if (!env.STRIPE_WEBHOOK_SECRET?.trim()) todo.push("設定 STRIPE_WEBHOOK_SECRET");
if (!paymentsLive) todo.push("設定 STRIPE_PAYMENTS_LIVE=true");
if (!env.STRIPE_CONNECT_COUNTRY?.trim()) todo.push("設定 STRIPE_CONNECT_COUNTRY=HK");
if (!previewOff && env.PLATFORM_PREVIEW_MODE?.trim().toLowerCase() !== "false")
  todo.push("設定 PLATFORM_PREVIEW_MODE=false（上線時）");
if (!modesMatch) todo.push("公鑰與私鑰須同為 test 或同為 live");

if (todo.length) {
  console.log("\n=== 待辦 ===");
  todo.forEach((t, i) => console.log(`${i + 1}. ${t}`));
} else {
  console.log("\n本機變數齊全！請確認 Vercel 也有相同設定並 Redeploy。");
}

console.log("");
