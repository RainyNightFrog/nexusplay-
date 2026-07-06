/**
 * Configure Supabase Auth URLs for production + local development.
 *
 * Usage:
 *   node scripts/configure-production-auth.mjs
 *   node scripts/configure-production-auth.mjs --site-url https://nexusplay-five.vercel.app
 *
 * Requires SUPABASE_ACCESS_TOKEN in .env.local (create at supabase.com/dashboard/account/tokens)
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const PROJECT_REF = "icydkixwynxizrgfzelq";
const DEFAULT_PRODUCTION_SITE = "https://nexusplay-five.vercel.app";
const LOCAL_SITE = "http://localhost:3000";
const LOCAL_CALLBACK = `${LOCAL_SITE}/auth/callback`;

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

function parseArgs() {
  const args = process.argv.slice(2);
  let siteUrl = DEFAULT_PRODUCTION_SITE;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--site-url" && args[i + 1]) {
      siteUrl = args[i + 1].replace(/\/$/, "");
      i += 1;
    }
  }
  return { siteUrl };
}

async function getAuthConfig(accessToken) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { message: text };
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

function mergeRedirectUrls(existing, productionCallback) {
  const values = new Set(
    String(existing ?? "")
      .split(/[\n,]/)
      .map((value) => value.trim())
      .filter(Boolean)
  );
  values.add(productionCallback);
  values.add(LOCAL_CALLBACK);
  return [...values].join("\n");
}

async function patchAuthConfig(accessToken, body) {
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
    data = { message: text };
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
  const env = loadEnv();
  const { siteUrl } = parseArgs();
  const productionCallback = `${siteUrl}/auth/callback`;
  const accessToken = env.SUPABASE_ACCESS_TOKEN?.trim();

  if (!accessToken) {
    console.error(
      "缺少 SUPABASE_ACCESS_TOKEN。請到 https://supabase.com/dashboard/account/tokens 建立後寫入 .env.local"
    );
    process.exit(1);
  }

  console.log(`\n正在設定 Supabase Auth URL…`);
  console.log(`  Site URL: ${siteUrl}`);
  console.log(`  Redirect URLs: ${productionCallback}, ${LOCAL_CALLBACK}`);

  const current = await getAuthConfig(accessToken);
  const uriAllowList = mergeRedirectUrls(current.uri_allow_list, productionCallback);

  await patchAuthConfig(accessToken, {
    site_url: siteUrl,
    uri_allow_list: uriAllowList,
  });

  const updated = await getAuthConfig(accessToken);
  console.log("\n✓ Supabase Auth URL 已更新");
  console.log(`  Site URL → ${updated.site_url}`);
  console.log(`  Redirect URLs → ${updated.uri_allow_list}`);
  console.log("\n請在 Google Cloud OAuth 用戶端加入 Authorized JavaScript origins:");
  console.log(`  ${siteUrl}`);
  console.log(`  ${LOCAL_SITE}`);
  console.log("");
}

main().catch((error) => {
  console.error(`\n✗ ${error.message}`);
  process.exit(1);
});
