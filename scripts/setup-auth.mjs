import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

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
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !serviceKey || !anonKey) {
  console.error("缺少 Supabase 環境變數");
  process.exit(1);
}

async function profilesTableExists() {
  const response = await fetch(`${url}/rest/v1/profiles?select=id&limit=1`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });
  return response.ok;
}

async function testAuthMetadataFlow() {
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const testEmail = `nexusplay.test+${Date.now()}@gmail.com`;
  const password = "TestPass123!";

  const { data, error } = await admin.auth.admin.createUser({
    email: testEmail,
    password,
    email_confirm: true,
    user_metadata: {
      display_name: "測試創作者",
      role: "creator",
    },
  });

  if (error) {
    console.log("Auth 建立測試帳號失敗：", error.message);
    return false;
  }

  const role = data.user?.user_metadata?.role;
  console.log(`Auth 測試帳號建立成功（role: ${role ?? "unknown"}）。`);

  if (data.user?.id) {
    await admin.auth.admin.deleteUser(data.user.id);
    console.log("測試帳號已清除。");
  }

  return role === "creator";
}

async function main() {
  const hasProfiles = await profilesTableExists();

  if (hasProfiles) {
    console.log("profiles 表已存在。");
  } else {
    console.log("profiles 表尚未建立。");
    console.log("目前 Auth 已改用 user_metadata 運作，不影響登入/創作者權限。");
    console.log("（可選）之後仍可在 SQL Editor 執行 supabase/auth.sql 建立 profiles 表。");
  }

  await testAuthMetadataFlow();
}

main();
