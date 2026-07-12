/**
 * 從 .env.local 讀取 Discord 憑證並寫入 Supabase（非互動式）
 *
 * 需要 .env.local：
 *   SUPABASE_ACCESS_TOKEN
 *   DISCORD_OAUTH_CLIENT_ID
 *   DISCORD_OAUTH_CLIENT_SECRET
 *
 * 用法：npm run setup:discord:apply
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  PRODUCTION_SITE_URL,
  LOCAL_SITE_URL,
  mergeAuthRedirectAllowList,
} from "./auth-site-config.mjs";

const PROJECT_REF = "icydkixwynxizrgfzelq";

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

async function main() {
  const env = loadEnvLocal();
  const accessToken = env.SUPABASE_ACCESS_TOKEN?.trim();
  const clientId = env.DISCORD_OAUTH_CLIENT_ID?.trim();
  const clientSecret = env.DISCORD_OAUTH_CLIENT_SECRET?.trim();

  if (!accessToken) {
    console.error("✗ 缺少 SUPABASE_ACCESS_TOKEN");
    console.error("  請到 https://supabase.com/dashboard/account/tokens 建立");
    console.error("  加入 .env.local 後再執行 npm run setup:discord:apply");
    process.exit(1);
  }

  if (!clientId || !clientSecret) {
    console.error("✗ 缺少 DISCORD_OAUTH_CLIENT_ID 或 DISCORD_OAUTH_CLIENT_SECRET");
    process.exit(1);
  }

  const currentResponse = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const current = await currentResponse.json();
  if (!currentResponse.ok) {
    console.error("✗ Supabase API 失敗：", current.message ?? currentResponse.status);
    process.exit(1);
  }

  const patchResponse = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        external_discord_enabled: true,
        external_discord_client_id: clientId,
        external_discord_secret: clientSecret,
        site_url: PRODUCTION_SITE_URL,
        uri_allow_list: mergeAuthRedirectAllowList(current.uri_allow_list),
      }),
    }
  );

  const patched = await patchResponse.json();
  if (!patchResponse.ok) {
    console.error("✗ 設定失敗：", patched.message ?? patchResponse.status);
    process.exit(1);
  }

  const authSettings = await fetch(
    `https://${PROJECT_REF}.supabase.co/auth/v1/settings`
  ).then((r) => r.json());

  const discordEnabled = Boolean(authSettings.external?.discord);
  const authorizeResponse = await fetch(
    `https://${PROJECT_REF}.supabase.co/auth/v1/authorize?provider=discord&redirect_to=${encodeURIComponent(`${LOCAL_SITE_URL}/auth/callback`)}`,
    { redirect: "manual" }
  );
  const location = authorizeResponse.headers.get("location") ?? "";
  const discordRedirectOk =
    location.includes("discord.com") || location.includes("discordapp.com");

  console.log("");
  console.log("✓ Supabase Discord Provider 已啟用");
  console.log(`✓ Site URL → ${PRODUCTION_SITE_URL}`);
  console.log(`✓ Discord 登入導向 → ${discordRedirectOk ? "OK" : "待確認"}`);
  console.log(`✓ 已啟用登入方式 → ${Object.entries(authSettings.external ?? {}).filter(([, v]) => v).map(([k]) => k).join(", ") || "email only"}`);
  console.log("");
  console.log("測試：npm run dev → http://localhost:3000/auth → 使用 Discord 登入");
  console.log("");
}

main().catch((error) => {
  console.error("\n✗ 設定失敗：", error.message);
  process.exit(1);
});
