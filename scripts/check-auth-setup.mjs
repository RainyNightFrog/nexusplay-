import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("缺少 Supabase 環境變數");
  process.exit(1);
}

const projectRef = new URL(url).hostname.split(".")[0];
const sql = readFileSync(resolve(process.cwd(), "supabase/auth.sql"), "utf8");

console.log("請到 Supabase Dashboard → SQL Editor 執行 supabase/auth.sql");
console.log(`專案：${projectRef}`);
console.log("");
console.log("正在檢查 profiles 表是否已存在…");

const checkResponse = await fetch(
  `${url}/rest/v1/profiles?select=id&limit=1`,
  {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  }
);

if (checkResponse.ok) {
  console.log("profiles 表已就緒，無需再執行 SQL。");
  process.exit(0);
}

console.log("profiles 表尚未建立。請複製以下 SQL 到 SQL Editor 執行：");
console.log("─".repeat(60));
console.log(sql);
console.log("─".repeat(60));
process.exit(1);
