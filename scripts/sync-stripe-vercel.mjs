/**
 * 將 .env.local 的 Stripe 相關變數同步到 Vercel（production + preview）
 * 執行：npm run sync:stripe-vercel
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const KEYS = [
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PAYMENTS_LIVE",
  "STRIPE_CONNECT_COUNTRY",
  "PLATFORM_PREVIEW_MODE",
];

function loadEnv() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) throw new Error(".env.local 不存在");
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

function run(cmd, args, input) {
  const result = spawnSync(cmd, args, {
    input,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    shell: process.platform === "win32",
  });
  return result;
}

const env = loadEnv();
const missing = KEYS.filter((k) => !env[k]?.trim());
if (missing.length) {
  console.error("缺少變數:", missing.join(", "));
  process.exit(1);
}

const siteUrl = (env.NEXT_PUBLIC_SITE_URL ?? "https://nexusplay-five.vercel.app").replace(
  /\/$/,
  ""
);

console.log("連結 Vercel 專案 nexusplay…");
const link = run("npx", ["vercel", "link", "--project", "nexusplay", "--yes"]);
if (link.status !== 0) {
  console.error(link.stderr || link.stdout);
  process.exit(link.status ?? 1);
}

for (const key of KEYS) {
  const value = env[key].trim();
  for (const target of ["production", "preview"]) {
    const remove = run("npx", ["vercel", "env", "rm", key, target, "--yes"]);
    if (remove.status !== 0 && !/not found|does not exist/i.test(remove.stderr ?? "")) {
      // ignore not found
    }
    const add = run("npx", ["vercel", "env", "add", key, target], `${value}\n`);
    if (add.status !== 0) {
      console.error(`✗ ${key} (${target})`);
      console.error(add.stderr || add.stdout);
      process.exit(add.status ?? 1);
    }
    console.log(`✓ ${key} → ${target}`);
  }
}

console.log("\n觸發 production 重新部署…");
const host = siteUrl.replace(/^https?:\/\//, "").split("/")[0];
const deploy = run("npx", ["vercel", "redeploy", host, "--target", "production"]);
if (deploy.status !== 0) {
  const fallback = run("npx", ["vercel", "deploy", "--prod", "--yes"]);
  if (fallback.status !== 0) {
    console.error(fallback.stderr || fallback.stdout);
    process.exit(fallback.status ?? 1);
  }
  console.log(fallback.stdout);
} else {
  console.log(deploy.stdout);
}
console.log("\n✓ Vercel 環境變數已同步並已部署 production");
