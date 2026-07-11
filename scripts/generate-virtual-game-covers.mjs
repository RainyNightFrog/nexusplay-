/**
 * 同步 10 款虛擬遊戲 AI 生成 PNG 封面的 cover_url 至資料庫
 * 封面檔案需已放置於 public/covers/[slug]-cover.png
 * 用法：node scripts/generate-virtual-game-covers.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const SLUGS = [
  "neon-snake-extreme",
  "cyber-bubble-pop",
  "quantum-tic-tac-toe",
  "void-brick-breaker",
  "rainy-frog-dash",
  "neon-tetromino-rush",
  "galactic-invader-2026",
  "memory-matrix-glitch",
  "overdrive-cyber-pong",
  "cyber-neon-runner",
];

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

async function main() {
  const coversDir = resolve(process.cwd(), "public/covers");
  let missing = 0;

  for (const slug of SLUGS) {
    const filepath = join(coversDir, `${slug}-cover.png`);
    if (existsSync(filepath)) {
      console.log(`✓ 封面檔案：${slug}-cover.png`);
    } else {
      console.error(`✗ 缺少封面：${filepath}`);
      missing++;
    }
  }

  if (missing > 0) {
    console.error(`\n⚠ 缺少 ${missing} 張封面 PNG，請先放入 public/covers/`);
    process.exit(1);
  }

  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.log("\n⚠ 缺少 Supabase 環境變數，跳過資料庫更新");
    return;
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (const slug of SLUGS) {
    const coverUrl = `/covers/${slug}-cover.png`;
    const { error } = await admin.from("games").update({ cover_url: coverUrl }).eq("slug", slug);
    if (error) console.error(`✗ 更新 ${slug} 失敗：`, error.message);
    else console.log(`✓ DB cover_url → ${coverUrl}`);
  }

  console.log("\n✅ AI 生成封面已同步至資料庫！");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
