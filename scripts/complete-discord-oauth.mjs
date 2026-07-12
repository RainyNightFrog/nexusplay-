/**
 * 貼上 Discord Client ID / Secret 後，自動設定 Supabase Discord 登入。
 *
 * 用法：
 *   1. 先在 Discord Developer Portal 建立應用（npm run setup:discord 會開分頁）
 *   2. 到 https://supabase.com/dashboard/account/tokens 建立 Access Token
 *   3. 執行：npm run setup:discord:finish
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import {
  PRODUCTION_SITE_URL,
  LOCAL_SITE_URL,
  mergeAuthRedirectAllowList,
} from "./auth-site-config.mjs";

const PROJECT_REF = "icydkixwynxizrgfzelq";
const DISCORD_REDIRECT_URI = `https://${PROJECT_REF}.supabase.co/auth/v1/callback`;

function getAuthRedirectAllowList(siteUrl = PRODUCTION_SITE_URL) {
  return mergeAuthRedirectAllowList("", siteUrl).split("\n");
}

function mergeAuthRedirectAllowListExisting(existing, siteUrl = PRODUCTION_SITE_URL) {
  return mergeAuthRedirectAllowList(existing, siteUrl);
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
  console.log("  RainyNightFrog · 一鍵完成 Supabase Discord 設定");
  console.log("══════════════════════════════════════════════════════════");
  console.log("");
  console.log("Discord 後台仍需你登入一次建立 OAuth 應用（無法代勞）。");
  console.log("建立後把 Client ID / Secret 貼到這裡，其餘由我自動設定。");
  console.log("");
  console.log(`Discord Redirect URI（OAuth2 → Redirects 貼這行）：`);
  console.log(`  ${DISCORD_REDIRECT_URI}`);
  console.log("");

  try {
    const accessToken = await prompt(
      rl,
      "Supabase Access Token（Dashboard → Account → Access Tokens）",
      env.SUPABASE_ACCESS_TOKEN ?? ""
    );

    if (!accessToken) {
      console.error("\n✗ 需要 Supabase Access Token。建立後再執行 npm run setup:discord:finish");
      process.exit(1);
    }

    const clientId = await prompt(
      rl,
      "Discord Client ID",
      env.DISCORD_OAUTH_CLIENT_ID ?? ""
    );
    const clientSecret = await prompt(
      rl,
      "Discord Client Secret",
      env.DISCORD_OAUTH_CLIENT_SECRET ?? ""
    );

    if (!clientId || !clientSecret) {
      console.error("\n✗ 需要 Discord Client ID 與 Secret。");
      process.exit(1);
    }

    console.log("\n正在設定 Supabase…");

    const current = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    ).then((r) => r.json());

    await patchSupabaseAuth(accessToken, {
      external_discord_enabled: true,
      external_discord_client_id: clientId,
      external_discord_secret: clientSecret,
      site_url: PRODUCTION_SITE_URL,
      uri_allow_list: mergeAuthRedirectAllowListExisting(current.uri_allow_list),
    });

    upsertEnvLocal("SUPABASE_ACCESS_TOKEN", accessToken);
    upsertEnvLocal("DISCORD_OAUTH_CLIENT_ID", clientId);
    upsertEnvLocal("DISCORD_OAUTH_CLIENT_SECRET", clientSecret);

    console.log("");
    console.log("✓ Supabase Discord Provider 已啟用");
    console.log(`✓ Site URL → ${PRODUCTION_SITE_URL}`);
    console.log(`✓ Redirect URLs → ${getAuthRedirectAllowList().join(", ")}`);
    console.log(`✓ 本機開發仍可使用 ${LOCAL_SITE_URL}`);
    console.log("✓ 憑證已寫入 .env.local（請勿提交 git）");
    console.log("");
    console.log("下一步：npm run dev → http://localhost:3000/auth → 使用 Discord 登入");
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
