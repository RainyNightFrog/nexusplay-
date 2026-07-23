import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const { Client } = pg;

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
  if (process.env.DATABASE_URL) return [process.env.DATABASE_URL];
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (!password) return [];
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const match = projectUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!match) return [];
  const projectRef = match[1];
  const encodedPassword = encodeURIComponent(password);
  const region = process.env.SUPABASE_DB_REGION ?? "ap-southeast-1";
  return [
    process.env.SUPABASE_DB_URL,
    `postgresql://postgres.${projectRef}:${encodedPassword}@aws-1-${region}.pooler.supabase.com:5432/postgres`,
    `postgresql://postgres:${encodedPassword}@db.${projectRef}.supabase.co:5432/postgres`,
  ].filter(Boolean);
}

async function main() {
  loadEnv();
  const candidates = buildConnectionCandidates();
  if (candidates.length === 0) {
    console.error("Missing SUPABASE_DB_PASSWORD");
    process.exit(1);
  }

  let client = null;
  for (const connectionString of candidates) {
    const c = new Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
    try {
      await c.connect();
      client = c;
      break;
    } catch {
      await c.end().catch(() => undefined);
    }
  }
  if (!client) {
    console.error("Unable to connect to database");
    process.exit(1);
  }

  try {
    const sql = readFileSync(
      resolve(process.cwd(), "supabase/daily-quests-and-streaks.sql"),
      "utf8"
    );
    await client.query(sql);
    console.log("OK: daily quests & streaks schema ready");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Failed:", error.message);
  process.exit(1);
});
