/**
 * Patch Supabase Auth URLs via production internal API or Management API directly.
 *
 * Usage:
 *   node scripts/apply-production-auth.mjs --access-token sbp_...
 *   node scripts/apply-production-auth.mjs --remote
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  PRODUCTION_SITE_URL,
  LOCAL_SITE_URL,
  mergeAuthRedirectAllowList,
} from "./auth-site-config.mjs";

const PROJECT_REF = "icydkixwynxizrgfzelq";
const LOCAL_CALLBACK = `${LOCAL_SITE_URL}/auth/callback`;

function loadEnvFile(fileName) {
  const envPath = resolve(process.cwd(), fileName);
  if (!existsSync(envPath)) return {};
  const vars = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

function parseArgs() {
  const args = process.argv.slice(2);
  let accessToken = "";
  let remote = false;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--access-token" && args[i + 1]) {
      accessToken = args[i + 1];
      i += 1;
    }
    if (args[i] === "--remote") remote = true;
  }
  return { accessToken, remote };
}

function mergeRedirectUrls(existing) {
  return mergeAuthRedirectAllowList(existing, PRODUCTION_SITE_URL);
}

async function patchDirect(accessToken) {
  const currentResponse = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const current = await currentResponse.json();
  if (!currentResponse.ok) {
    throw new Error(current.message ?? `Supabase API ${currentResponse.status}`);
  }

  const body = {
    site_url: PRODUCTION_SITE_URL,
    uri_allow_list: mergeRedirectUrls(current.uri_allow_list),
  };

  const patchResponse = await fetch(
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
  const patched = await patchResponse.json();
  if (!patchResponse.ok) {
    throw new Error(patched.message ?? `Supabase API ${patchResponse.status}`);
  }

  return patched;
}

async function patchRemote(accessToken, cronSecret) {
  const response = await fetch(
    `${PRODUCTION_SITE_URL}/api/internal/patch-auth-urls`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ accessToken, siteUrl: PRODUCTION_SITE_URL }),
    }
  );
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? `Remote patch failed (${response.status})`);
  }
  return payload;
}

async function main() {
  const localEnv = loadEnvFile(".env.local");
  const vercelEnv = loadEnvFile(".env.vercel.tmp");
  const { accessToken: argToken, remote } = parseArgs();

  const accessToken =
    argToken ||
    localEnv.SUPABASE_ACCESS_TOKEN?.trim() ||
    vercelEnv.SUPABASE_ACCESS_TOKEN?.trim();

  if (!accessToken) {
    console.error(
      "缺少 Supabase Access Token。請執行：node scripts/apply-production-auth.mjs --access-token sbp_..."
    );
    process.exit(1);
  }

  if (remote) {
    const cronSecret = vercelEnv.CRON_SECRET?.trim();
    if (!cronSecret) {
      throw new Error("缺少 CRON_SECRET，請先執行 vercel env pull .env.vercel.tmp");
    }
    const result = await patchRemote(accessToken, cronSecret);
    console.log("✓ Remote patch ok");
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const result = await patchDirect(accessToken);
  console.log("✓ Supabase Auth URL 已更新");
  console.log(`  Site URL: ${result.site_url}`);
  console.log(`  Redirect URLs:\n${result.uri_allow_list}`);
}

main().catch((error) => {
  console.error(`✗ ${error.message}`);
  process.exit(1);
});
