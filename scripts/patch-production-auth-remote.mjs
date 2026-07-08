import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return {};
  const vars = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    vars[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return vars;
}

const env = loadEnv();
const cronSecret = env.CRON_SECRET?.trim();
const accessToken = process.argv[2]?.trim() || env.SUPABASE_ACCESS_TOKEN?.trim();
const siteUrl = "https://rainynightfrog.com";

if (!cronSecret) {
  console.error("缺少 CRON_SECRET");
  process.exit(1);
}

if (!accessToken) {
  console.error(
    "缺少 Supabase Access Token。用法：node scripts/patch-production-auth-remote.mjs sbp_xxx"
  );
  process.exit(1);
}

const response = await fetch("https://rainynightfrog.com/api/internal/patch-auth-urls", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${cronSecret}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ accessToken, siteUrl }),
});

const payload = await response.json();
console.log(response.status, JSON.stringify(payload, null, 2));
if (!response.ok) process.exit(1);
