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

function envStatus(env, key) {
  const value = env[key]?.trim();
  if (!value || value.includes("your-") || value.includes("YOUR_")) return "MISSING";
  return "SET";
}

async function checkTables(env) {
  const password = env.SUPABASE_DB_PASSWORD;
  const projectUrl = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const match = projectUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!password || !match) return { ok: false, tables: {} };

  const projectRef = match[1];
  const encodedPassword = encodeURIComponent(password);
  const candidates = [
    `postgresql://postgres.${projectRef}:${encodedPassword}@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres`,
    `postgresql://postgres:${encodedPassword}@db.${projectRef}.supabase.co:5432/postgres`,
  ];

  let client = null;
  for (const connectionString of candidates) {
    const c = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
      await c.connect();
      client = c;
      break;
    } catch {
      await c.end().catch(() => undefined);
    }
  }

  if (!client) return { ok: false, tables: {} };

  const tables = [
    "websub_subscriptions",
    "websub_notifications",
    "forum_digest_retry_queue",
    "forum_digest_deliveries",
    "push_subscriptions",
    "user_notifications",
  ];
  const result = {};
  for (const table of tables) {
    const { rows } = await client.query("select to_regclass($1) as reg", [
      `public.${table}`,
    ]);
    result[table] = Boolean(rows[0]?.reg);
  }
  await client.end();
  return { ok: true, tables: result };
}

const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const CRON_EMAIL = ["CRON_SECRET", "RESEND_API_KEY", "EMAIL_FROM"];
const OPTIONAL = [
  "NEXT_PUBLIC_SITE_URL",
  "WEBSUB_HUB_URL",
  "EMAIL_UNSUBSCRIBE_SECRET",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PAYMENTS_LIVE",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "NEXT_PUBLIC_GA_MEASUREMENT_ID",
];

const env = loadEnv();
console.log("=== Local .env.local ===");
for (const key of REQUIRED) console.log(`${key}: ${envStatus(env, key)}`);
console.log("--- Cron / Email digest ---");
for (const key of CRON_EMAIL) console.log(`${key}: ${envStatus(env, key)}`);
console.log("--- Optional ---");
for (const key of OPTIONAL) console.log(`${key}: ${envStatus(env, key)}`);

const db = await checkTables(env);
console.log("\n=== Supabase tables ===");
if (!db.ok) {
  console.log("DB: could not connect");
} else {
  for (const [table, ok] of Object.entries(db.tables)) {
    console.log(`${table}: ${ok ? "OK" : "MISSING"}`);
  }
}

const siteUrl = env.NEXT_PUBLIC_SITE_URL?.trim();
if (siteUrl) {
  try {
    const response = await fetch(`${siteUrl.replace(/\/$/, "")}/api/feeds/health`, {
      signal: AbortSignal.timeout(15000),
    });
    const data = await response.json();
    console.log(`\n=== Production health (${siteUrl}) ===`);
    console.log(`HTTP ${response.status} healthy=${data.healthy}`);
  } catch (error) {
    console.log(`\n=== Production health ===`);
    console.log(`FAIL: ${error instanceof Error ? error.message : error}`);
  }
} else {
  console.log("\n=== Production health ===");
  console.log("SKIP: NEXT_PUBLIC_SITE_URL not set locally");
}
