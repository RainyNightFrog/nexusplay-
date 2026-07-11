import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const { Client } = pg;

/** 為示範創作者填入 username，方便測試創作者子網域 */
const SEED_USERNAMES = [
  { display_name: "RainyNightFrog", username: "rainynightfrog" },
  { display_name: "鐵甲船長", username: "iron-captain" },
  { display_name: "星夜旅人", username: "star-traveler" },
  { display_name: "霓虹浪子", username: "neon-rider" },
];

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
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

const password = process.env.SUPABASE_DB_PASSWORD;
const projectRef = "icydkixwynxizrgfzelq";
const encodedPassword = encodeURIComponent(password);
const connectionString = `postgresql://postgres.${projectRef}:${encodedPassword}@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres`;

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

for (const seed of SEED_USERNAMES) {
  const conflictGame = await client.query(
    "select id from games where slug = $1 limit 1",
    [seed.username]
  );
  if (conflictGame.rows.length) {
    console.log(`跳過 ${seed.username}（與遊戲 slug 衝突）`);
    continue;
  }

  const result = await client.query(
    `update profiles
     set username = $1
     where display_name = $2
       and role = 'creator'
       and (username is null or username = '')
     returning id, display_name, username`,
    [seed.username, seed.display_name]
  );

  if (result.rows.length) {
    console.log(`✓ ${result.rows[0].display_name} → ${result.rows[0].username}`);
  } else {
    console.log(`– 略過 ${seed.display_name}（已有 username 或找不到）`);
  }
}

await client.end();
