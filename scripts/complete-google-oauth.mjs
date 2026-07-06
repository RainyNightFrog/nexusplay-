/**
 * 貼上 Google Client ID / Secret 後，自動設定 Supabase Google 登入。
 *
 * 用法：
 *   1. 先在 Google Cloud 建立 OAuth 用戶端（npm run setup:google 會開分頁）
 *   2. 到 https://supabase.com/dashboard/account/tokens 建立 Access Token
 *   3. 執行：npm run setup:google:finish
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const PROJECT_REF = "icydkixwynxizrgfzelq";
const GOOGLE_REDIRECT_URI = `https://${PROJECT_REF}.supabase.co/auth/v1/callback`;
const PRODUCTION_SITE_URL = "https://nexusplay-five.vercel.app";
const LOCAL_SITE_URL = "http://localhost:3000";

function getAuthRedirectAllowList(siteUrl = PRODUCTION_SITE_URL) {
  return [
    `${siteUrl.replace(/\/$/, "")}/auth/callback`,
    `${LOCAL_SITE_URL}/auth/callback`,
  ];
}

function mergeAuthRedirectAllowList(existing, siteUrl = PRODUCTION_SITE_URL) {
  const values = new Set(getAuthRedirectAllowList(siteUrl));
  for (const value of String(existing ?? "").split(/[\n,]/)) {
    const trimmed = value.trim();
    if (trimmed) values.add(trimmed);
  }
  return [...values].join("\n");
}

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

function upsertEnvLocal(key, value) {
  const envPath = resolve(process.cwd(), ".env.local");
  const lines = existsSync(envPath) ? readFileSync(envPath, "utf8").split("\n") : [];
  const prefix = `${key}=`;
  let found = false;
  const next = lines.map((line) => {
    if (line.startsWith(prefix)) {
      found = true;
      return `${key}=${value}`;
    }
    return line;
  });
  if (!found) {
    next.push(`${key}=${value}`);
  }
  writeFileSync(envPath, next.join("\n").replace(/\n?$/, "\n"), "utf8");
}

async function prompt(rl, label, fallback = "") {
  const hint = fallback ? ` [已從 .env.local 讀取，Enter 沿用]` : "";
  const answer = (await rl.question(`${label}${hint}: `)).trim();
  return answer || fallback;
}

async function patchSupabaseAuth(accessToken, body) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(
      typeof data === "object" && data.message
        ? data.message
        : `Supabase API ${response.status}: ${text.slice(0, 200)}`
    );
  }

  return data;
}

async function main() {
  const env = loadEnvLocal();
  const rl = readline.createInterface({ input, output });

  console.log("");
  console.log("══════════════════════════════════════════════════════════");
  console.log("  NexusPlay · 一鍵完成 Supabase Google 設定");
  console.log("══════════════════════════════════════════════════════════");
  console.log("");
  console.log("Google 後台仍需你登入一次建立 OAuth 用戶端（無法代勞）。");
  console.log("建立後把 Client ID / Secret 貼到這裡，其餘由我自動設定。");
  console.log("");
  console.log(`Google Redirect URI（建立用戶端時貼這行）：`);
  console.log(`  ${GOOGLE_REDIRECT_URI}`);
  console.log("");

  try {
    const accessToken = await prompt(
      rl,
      "Supabase Access Token（Dashboard → Account → Access Tokens）",
      env.SUPABASE_ACCESS_TOKEN ?? ""
    );

    if (!accessToken) {
      console.error("\n✗ 需要 Supabase Access Token。建立後再執行 npm run setup:google:finish");
      process.exit(1);
    }

    const clientId = await prompt(
      rl,
      "Google Client ID",
      env.GOOGLE_OAUTH_CLIENT_ID ?? ""
    );
    const clientSecret = await prompt(
      rl,
      "Google Client Secret",
      env.GOOGLE_OAUTH_CLIENT_SECRET ?? ""
    );

    if (!clientId || !clientSecret) {
      console.error("\n✗ 需要 Google Client ID 與 Secret。");
      process.exit(1);
    }

    console.log("\n正在設定 Supabase…");

    const current = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    ).then((r) => r.json());

    await patchSupabaseAuth(accessToken, {
      external_google_enabled: true,
      external_google_client_id: clientId,
      external_google_secret: clientSecret,
      site_url: PRODUCTION_SITE_URL,
      uri_allow_list: mergeAuthRedirectAllowList(current.uri_allow_list),
    });

    upsertEnvLocal("SUPABASE_ACCESS_TOKEN", accessToken);
    upsertEnvLocal("GOOGLE_OAUTH_CLIENT_ID", clientId);
    upsertEnvLocal("GOOGLE_OAUTH_CLIENT_SECRET", clientSecret);

    console.log("");
    console.log("✓ Supabase Google Provider 已啟用");
    console.log(`✓ Site URL → ${PRODUCTION_SITE_URL}`);
    console.log(`✓ Redirect URLs → ${getAuthRedirectAllowList().join(", ")}`);
    console.log(`✓ 本機開發仍可使用 ${LOCAL_SITE_URL}`);
    console.log("✓ 憑證已寫入 .env.local（請勿提交 git）");
    console.log("");
    console.log("下一步：npm run dev → http://localhost:3000/auth → 使用 Google 登入");
    console.log("");
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error("\n✗ 設定失敗：", error.message);
  if (error.message.includes("401") || error.message.includes("JWT")) {
    console.error("  → Access Token 無效或過期，請到 Supabase 重新建立。");
  }
  process.exit(1);
});
