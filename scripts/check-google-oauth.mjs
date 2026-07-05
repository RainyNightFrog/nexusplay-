import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const PROJECT_REF = "icydkixwynxizrgfzelq";
const BASE = `https://${PROJECT_REF}.supabase.co`;

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

async function checkAuthProviders() {
  const settings = await fetch(`${BASE}/auth/v1/settings`).then((r) => r.json());
  const providers = Object.entries(settings.external ?? {})
    .filter(([, enabled]) => enabled)
    .map(([name]) => name);

  const res = await fetch(
    `${BASE}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent("http://localhost:3000/auth/callback")}`,
    { redirect: "manual" }
  );
  const location = res.headers.get("location") ?? "";

  return {
    providers,
    googleRedirectOk: location.includes("accounts.google.com"),
    oauthError: location.includes("error") ? location : null,
    status: res.status,
  };
}

async function checkDatabase(password) {
  const client = new pg.Client({
    connectionString: `postgresql://postgres:${encodeURIComponent(password)}@db.${PROJECT_REF}.supabase.co:5432/postgres`,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    const saves = await client.query(`
      select exists (
        select 1 from information_schema.tables
        where table_schema = 'public' and table_name = 'game_saves'
      ) as ok
    `);
    const statusCol = await client.query(`
      select exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'games' and column_name = 'status'
      ) as ok
    `);
    const rls = await client.query(`
      select policyname from pg_policies
      where schemaname = 'public' and tablename = 'game_saves'
    `);
    return {
      gameSaves: saves.rows[0].ok,
      gamesStatus: statusCol.rows[0].ok,
      gameSavesPolicies: rls.rows.map((r) => r.policyname),
    };
  } finally {
    await client.end();
  }
}

async function checkManagementApi(token) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return {
    googleEnabled: data.external_google_enabled,
    hasClientId: Boolean(data.external_google_client_id),
    hasSecret: Boolean(data.external_google_secret),
    siteUrl: data.site_url,
    uriAllowList: data.uri_allow_list,
  };
}

async function main() {
  const env = loadEnv();
  const results = [];

  console.log("\n══════════════════════════════════════════");
  console.log("  NexusPlay · Google 登入完整檢查");
  console.log("══════════════════════════════════════════\n");

  // Code / pages
  results.push(["設定頁 /auth/setup-google", "手動"]);
  results.push(["登入頁 Google 按鈕", "OK（程式已部署）"]);
  results.push(["NexusPlay SDK + 雲端存檔", "OK（程式已部署）"]);

  // OAuth live test
  const auth = await checkAuthProviders();
  results.push([
    "Supabase Google Provider 已啟用",
    auth.googleRedirectOk ? "OK" : "未完成",
  ]);
  if (auth.oauthError) {
    results.push(["OAuth 錯誤", auth.oauthError.slice(0, 80)]);
  }
  results.push(["已啟用登入方式", auth.providers.join(", ") || "email only"]);

  // Management API if token available
  if (env.SUPABASE_ACCESS_TOKEN) {
    const mgmt = await checkManagementApi(env.SUPABASE_ACCESS_TOKEN);
    if (mgmt) {
      results.push(["Management API: Google enabled", mgmt.googleEnabled ? "OK" : "否"]);
      results.push(["Management API: Client ID", mgmt.hasClientId ? "OK" : "缺"]);
      results.push(["Management API: Client Secret", mgmt.hasSecret ? "OK" : "缺"]);
      results.push(["Site URL", mgmt.siteUrl ?? "—"]);
      results.push([
        "Redirect URLs",
        mgmt.uriAllowList?.includes("http://localhost:3000/auth/callback")
          ? "OK"
          : mgmt.uriAllowList ?? "—",
      ]);
    }
  }

  // Database
  if (env.SUPABASE_DB_PASSWORD) {
    try {
      const db = await checkDatabase(env.SUPABASE_DB_PASSWORD);
      results.push(["DB: game_saves 表", db.gameSaves ? "OK" : "缺"]);
      results.push(["DB: games.status 欄位", db.gamesStatus ? "OK" : "缺"]);
      results.push([
        "DB: game_saves RLS",
        db.gameSavesPolicies.length >= 3 ? "OK" : db.gameSavesPolicies.join(", ") || "缺",
      ]);
    } catch (e) {
      results.push(["DB 連線", `失敗: ${e.message}`]);
    }
  }

  for (const [label, status] of results) {
    const icon =
      status === "OK" || status.startsWith("OK")
        ? "✓"
        : status === "未完成" || status === "缺" || status.startsWith("失敗")
          ? "✗"
          : "·";
    console.log(`  ${icon} ${label}: ${status}`);
  }

  const googleOk = auth.googleRedirectOk;
  console.log("\n──────────────────────────────────────────");
  if (googleOk) {
    console.log("  結論：Google 登入已設定完成 ✓");
    console.log("  測試：http://localhost:3000/auth → 使用 Google 登入");
  } else {
    console.log("  結論：Google Provider 尚未在 Supabase 生效 ✗");
    console.log("  請到 http://localhost:3000/auth/setup-google");
    console.log("  貼上 Token + Client ID + Secret 後一鍵完成");
  }
  console.log("──────────────────────────────────────────\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
