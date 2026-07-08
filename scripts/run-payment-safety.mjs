import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const { Client } = pg;

function loadEnv() {
  const env = {};
  const content = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

const env = loadEnv();
const password = env.SUPABASE_DB_PASSWORD;
const projectUrl = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const match = projectUrl.match(/https:\/\/([^.]+)\.supabase\.co/);

if (!password || !match) {
  console.error("需要 SUPABASE_DB_PASSWORD 與 NEXT_PUBLIC_SUPABASE_URL");
  process.exit(1);
}

const projectRef = match[1];
const encodedPassword = encodeURIComponent(password);
const connectionString = `postgresql://postgres.${projectRef}:${encodedPassword}@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres`;

const sql = readFileSync(
  resolve(process.cwd(), "supabase/payment-safety.sql"),
  "utf8"
);

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
await client.query(sql);
await client.end();
console.log("✓ payment-safety migration 完成");
