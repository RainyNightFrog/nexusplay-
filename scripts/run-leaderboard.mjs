import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const { Client } = pg;
const PROJECT_REF = "icydkixwynxizrgfzelq";

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

function buildConnectionCandidates() {
  if (process.env.DATABASE_URL) {
    return [process.env.DATABASE_URL];
  }

  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password) {
    return [];
  }

  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const match = projectUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!match) {
    return [];
  }

  const projectRef = match[1];
  const encodedPassword = encodeURIComponent(password);
  const region = process.env.SUPABASE_DB_REGION ?? "ap-southeast-1";

  return [
    process.env.SUPABASE_DB_URL,
    `postgresql://postgres.${projectRef}:${encodedPassword}@aws-1-${region}.pooler.supabase.com:5432/postgres`,
    `postgresql://postgres.${projectRef}:${encodedPassword}@aws-0-${region}.pooler.supabase.com:5432/postgres`,
    `postgresql://postgres.${projectRef}:${encodedPassword}@aws-1-${region}.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres.${projectRef}:${encodedPassword}@aws-0-${region}.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres:${encodedPassword}@db.${projectRef}.supabase.co:5432/postgres`,
  ].filter(Boolean);
}

async function runSqlViaPg(sql) {
  const candidates = buildConnectionCandidates();
  if (!candidates.length) {
    return { ok: false, error: new Error("缺少 DATABASE_URL 或 SUPABASE_DB_PASSWORD") };
  }

  let lastError = null;
  for (const connectionString of candidates) {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
      await client.connect();
      await client.query(sql);
      await client.end();
      return { ok: true, via: "postgres" };
    } catch (error) {
      lastError = error;
      try {
        await client.end();
      } catch {
        /* ignore */
      }
    }
  }

  return { ok: false, error: lastError };
}

async function runSqlViaManagementApi(sql) {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  if (!accessToken) {
    return { ok: false, error: new Error("缺少 SUPABASE_ACCESS_TOKEN") };
  }

  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      payload.message ||
      payload.error ||
      payload.error_description ||
      `Management API 失敗 (${response.status})`;
    return { ok: false, error: new Error(String(message)) };
  }

  return { ok: true, via: "management-api" };
}

async function runSqlFile(label, filePath) {
  const sql = readFileSync(filePath, "utf8");
  console.log(`執行 ${label} …`);

  const pgResult = await runSqlViaPg(sql);
  if (pgResult.ok) {
    console.log(`✓ ${label}（Postgres 直連）`);
    return;
  }

  console.warn(`Postgres 直連失敗，改以 Supabase Management API 執行…`);
  const apiResult = await runSqlViaManagementApi(sql);
  if (apiResult.ok) {
    console.log(`✓ ${label}（Management API）`);
    return;
  }

  throw apiResult.error ?? pgResult.error ?? new Error(`${label} 執行失敗`);
}

async function verifyTable() {
  const checkSql =
    "select to_regclass('public.game_leaderboard') as table_name, " +
    "(select count(*) from information_schema.columns " +
    "where table_schema = 'public' and table_name = 'game_leaderboard' and column_name = 'difficulty') as has_difficulty;";

  const accessToken = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  if (!accessToken) return;

  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query/read-only`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: checkSql }),
    }
  );

  const rows = await response.json().catch(() => []);
  if (response.ok && Array.isArray(rows) && rows[0]) {
    console.log(
      "驗證：game_leaderboard =",
      rows[0].table_name ? "已建立" : "未找到",
      "| difficulty 欄位 =",
      Number(rows[0].has_difficulty) > 0 ? "有" : "無"
    );
  }
}

async function main() {
  loadEnv();

  const baseSql = resolve(process.cwd(), "supabase/game-leaderboard.sql");
  const migrationSql = resolve(process.cwd(), "supabase/game-leaderboard-by-difficulty.sql");

  try {
    await runSqlFile("supabase/game-leaderboard.sql", baseSql);
    await runSqlFile("supabase/game-leaderboard-by-difficulty.sql", migrationSql);
    await verifyTable();
    console.log("✓ 排行榜資料表 migration 全部完成");
  } catch (error) {
    console.error("執行失敗：", error);
    process.exit(1);
  }
}

main();
