/**
 * 修正 Supabase Redirect URLs（例如兩條網址黏成一行）。
 *
 * 用法：
 *   npm run fix:auth-urls
 *   npm run fix:auth-urls -- --access-token sbp_xxxx
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

const PROJECT_REF = "icydkixwynxizrgfzelq";
const PRODUCTION_SITE_URL = "https://nexusplay-five.vercel.app";

function loadEnvLocal() {
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

function parseTokenArg() {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--access-token" && args[i + 1]) {
      return args[i + 1].trim();
    }
  }
  return "";
}

function getAuthRedirectAllowList() {
  const productionBase = PRODUCTION_SITE_URL.replace(/\/$/, "");
  const localBase = "http://localhost:3000";
  return [
    `${productionBase}/auth/callback`,
    `${productionBase}/**`,
    `${localBase}/auth/callback`,
    `${localBase}/**`,
  ];
}

function expandRedirectAllowListEntry(value) {
  const trimmed = value.trim();
  if (!trimmed) return [];
  return trimmed
    .split(/(?<=\/auth\/callback)(?=https?:\/\/)/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

function mergeRedirectUrls(existing) {
  const values = new Set();
  for (const entry of String(existing ?? "").split(/[\n,]/)) {
    for (const url of expandRedirectAllowListEntry(entry)) {
      values.add(url);
    }
  }
  for (const url of getAuthRedirectAllowList()) {
    values.add(url);
  }
  return [...values].join("\n");
}

function copyToClipboard(text) {
  try {
    if (process.platform === "win32") {
      execSync("powershell -Command Set-Clipboard -Value $input", {
        input: text,
        stdio: ["pipe", "ignore", "ignore"],
      });
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

async function patchSupabase(accessToken) {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const currentResponse = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`,
    { headers }
  );
  const current = await currentResponse.json();
  if (!currentResponse.ok) {
    throw new Error(current.message ?? `Supabase API ${currentResponse.status}`);
  }

  const uriAllowList = mergeRedirectUrls(current.uri_allow_list);
  const patchResponse = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`,
    {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        site_url: PRODUCTION_SITE_URL,
        uri_allow_list: uriAllowList,
      }),
    }
  );
  const patched = await patchResponse.json();
  if (!patchResponse.ok) {
    throw new Error(patched.message ?? `Supabase API ${patchResponse.status}`);
  }

  return patched;
}

async function main() {
  const env = loadEnvLocal();
  const accessToken =
    parseTokenArg() || env.SUPABASE_ACCESS_TOKEN?.trim() || "";

  const correctUrls = getAuthRedirectAllowList().join("\n");

  console.log("");
  console.log("══════════════════════════════════════════════════════════");
  console.log("  NexusPlay · 修正 Supabase Redirect URLs");
  console.log("══════════════════════════════════════════════════════════");
  console.log("");
  console.log("正確應為以下 4 行（每行一條，不可黏在一起）：");
  console.log("");
  for (const line of getAuthRedirectAllowList()) {
    console.log(`  ${line}`);
  }
  console.log("");

  if (accessToken) {
    console.log("偵測到 Access Token，正在自動修正 Supabase…");
    const result = await patchSupabase(accessToken);
    console.log("");
    console.log("✓ 已更新 Redirect URLs：");
    console.log(result.uri_allow_list);
    console.log("");
    console.log("請重新測試：http://localhost:3000/auth");
    return;
  }

  const copied = copyToClipboard(correctUrls);
  if (copied) {
    console.log("✓ 已複製正確 4 行到剪貼簿");
  }

  console.log("");
  console.log("手動修正步驟（約 30 秒）：");
  console.log("  1. 開啟 Supabase → Authentication → URL Configuration");
  console.log("  2. 刪除錯誤的那一行（兩條網址黏在一起的）");
  console.log("  3. 按 Add URL，分別貼上上面 4 行（每次一行）");
  console.log("  4. 按 Save changes");
  console.log("");
  console.log("或到 http://localhost:3000/auth/setup-google");
  console.log("  勾選「只修正 Redirect URLs」+ 貼 Supabase Access Token 一鍵完成");
  console.log("");

  const configUrl = `https://supabase.com/dashboard/project/${PROJECT_REF}/auth/url-configuration`;
  try {
    execSync(`start "" "${configUrl}"`, { stdio: "ignore", shell: true });
    console.log(`✓ 已開啟：${configUrl}`);
  } catch {
    console.log(`請手動開啟：${configUrl}`);
  }
  console.log("");
}

main().catch((error) => {
  console.error(`✗ ${error.message}`);
  process.exit(1);
});
