/**
 * 以 Service Role 上傳 VOID GACHA zip，並把資料庫 `games.game_url`
 * 從佔位落地頁 `/demos/void-gacha-preview.html` 覆蓋為真實 build。
 *
 * 行為摘要：
 * 1. 解壓 zip → 上傳至 Supabase Storage `game-files/builds/{uuid}/`
 * 2. 更新 `games.game_url` 為 Storage 公開 URL
 * 3. 遊戲頁會經 `lib/games-data.ts` 自動改寫為同源 embed：
 *    `/api/games/{id}/embed/index.html`
 * 4. 若舊 URL 為 preview 佔位頁或不同 build，會清理／覆蓋
 *
 * 用法：
 *   npm run upload:void-gacha
 *   npm run upload:void-gacha -- path/to/VOID.zip
 *   npm run upload:void-gacha -- path/to/VOID.zip 12
 *   npm run upload:void-gacha -- --dry-run
 *   npm run upload:void-gacha -- --force path/to/VOID.zip
 *
 * 環境變數（可選，寫在 .env.local）：
 *   VOID_GACHA_ZIP_PATH   zip 路徑（覆寫預設桌面路徑）
 *   VOID_GACHA_GAME_ID    指定遊戲 id（否則依 slug/title 自動尋找）
 *   VOID_GACHA_REPLACE_PREVIEW=true
 *     設為 false 時：若目前仍是 preview 佔位頁，需加 --force 才會覆蓋
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { extractAndUploadGameBuild } from "../lib/extract-game-zip";
import { removeBuildFolder } from "../lib/game-storage";
import { VOID_GACHA_TITLE } from "../lib/platform-catalog";

const VOID_GACHA_SLUG = "void-gacha";
const PREVIEW_URL_MARKER = "void-gacha-preview.html";

type CliOptions = {
  zipPath: string | null;
  gameId: number | null;
  dryRun: boolean;
  force: boolean;
};

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
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

function defaultZipPath() {
  const fromEnv = process.env.VOID_GACHA_ZIP_PATH?.trim();
  if (fromEnv) return resolve(fromEnv);
  const desktop = resolve(process.env.USERPROFILE || "", "Desktop");
  return resolve(desktop, "RainyNightFrog", "RainyNightFrog.zip");
}

function isPreviewUrl(gameUrl: string | null | undefined) {
  if (!gameUrl) return false;
  return gameUrl.includes(PREVIEW_URL_MARKER) || gameUrl.includes("/demos/");
}

function parseArgs(argv: string[]): CliOptions {
  let zipPath: string | null = null;
  let gameId: number | null = null;
  let dryRun = false;
  let force = false;

  for (const arg of argv) {
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg === "--force") {
      force = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      printHelpAndExit();
    }
    if (/^\d+$/.test(arg)) {
      gameId = Number.parseInt(arg, 10);
      continue;
    }
    if (!arg.startsWith("-")) {
      zipPath = arg;
    }
  }

  const envGameId = process.env.VOID_GACHA_GAME_ID?.trim();
  if (gameId == null && envGameId) {
    gameId = Number.parseInt(envGameId, 10);
    if (Number.isNaN(gameId)) {
      throw new Error(`VOID_GACHA_GAME_ID 無效：${envGameId}`);
    }
  }

  const replacePreviewEnv = process.env.VOID_GACHA_REPLACE_PREVIEW;
  if (replacePreviewEnv === "true" || replacePreviewEnv === "1") {
    force = true;
  }

  return { zipPath, gameId, dryRun, force };
}

function printHelpAndExit(): never {
  console.log(`
VOID GACHA 上傳腳本 — 用真實 zip 覆蓋佔位落地頁

  npm run upload:void-gacha
  npm run upload:void-gacha -- <zip路徑> [gameId]
  npm run upload:void-gacha -- --dry-run
  npm run upload:void-gacha -- --force

選項：
  --dry-run   只檢查目標遊戲與 zip，不實際上傳
  --force     允許覆蓋仍指向 void-gacha-preview.html 的 game_url
  -h, --help  顯示說明

環境變數：
  VOID_GACHA_ZIP_PATH
  VOID_GACHA_GAME_ID
  VOID_GACHA_REPLACE_PREVIEW=true
`);
  process.exit(0);
}

async function resolveVoidGachaGame(
  supabase: SupabaseClient,
  gameId: number | null
) {
  if (gameId != null) {
    const { data, error } = await supabase
      .from("games")
      .select("id,title,slug,game_url")
      .eq("id", gameId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error(`找不到遊戲 id=${gameId}`);
    return data;
  }

  const { data: bySlug, error: slugError } = await supabase
    .from("games")
    .select("id,title,slug,game_url")
    .eq("slug", VOID_GACHA_SLUG)
    .maybeSingle();
  if (slugError) throw new Error(slugError.message);
  if (bySlug) return bySlug;

  const { data: byTitle, error: titleError } = await supabase
    .from("games")
    .select("id,title,slug,game_url")
    .eq("title", VOID_GACHA_TITLE)
    .maybeSingle();
  if (titleError) throw new Error(titleError.message);
  if (byTitle) return byTitle;

  throw new Error(
    `資料庫找不到 VOID GACHA（slug=${VOID_GACHA_SLUG} / title=${VOID_GACHA_TITLE}）。請先建立遊戲列，或傳入 gameId。`
  );
}

async function main() {
  loadEnv();

  const options = parseArgs(process.argv.slice(2));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY（.env.local）"
    );
  }

  const zipPath = resolve(options.zipPath || defaultZipPath());
  if (!existsSync(zipPath)) {
    throw new Error(
      `找不到 zip：${zipPath}\n請放置檔案，或傳入路徑／設定 VOID_GACHA_ZIP_PATH`
    );
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const game = await resolveVoidGachaGame(supabase, options.gameId);
  const oldGameUrl = (game.game_url as string | null) ?? null;
  const currentlyPreview = isPreviewUrl(oldGameUrl);

  console.log("════════════════════════════════════════");
  console.log(" VOID GACHA 上傳／覆蓋佔位頁");
  console.log("════════════════════════════════════════");
  console.log(`  遊戲：${game.title} (id=${game.id}, slug=${game.slug ?? "—"})`);
  console.log(`  目前 game_url：${oldGameUrl || "(空)"}`);
  console.log(
    `  狀態：${currentlyPreview ? "⚠ 仍指向佔位落地頁 preview" : "已是 Storage／其他 URL"}`
  );
  console.log(`  zip：${zipPath}`);
  console.log(`  模式：${options.dryRun ? "dry-run（不寫入）" : "實際上傳"}`);

  if (currentlyPreview && !options.force && !options.dryRun) {
    console.log("");
    console.log("目前仍指向 void-gacha-preview.html。");
    console.log("若要覆蓋為真實遊戲包，請擇一：");
    console.log("  • 加上 --force");
    console.log("  • 或在 .env.local 設定 VOID_GACHA_REPLACE_PREVIEW=true");
    process.exit(1);
  }

  if (options.dryRun) {
    console.log("");
    console.log("✓ dry-run 通過：目標遊戲與 zip 皆就緒，未寫入資料庫／Storage");
    if (currentlyPreview) {
      console.log("  下一步：npm run upload:void-gacha -- --force");
    } else {
      console.log("  下一步：npm run upload:void-gacha -- --force  （或直接執行上傳）");
    }
    return;
  }

  console.log("");
  console.log("上傳 zip 中…");
  const zipBuffer = readFileSync(zipPath).buffer;
  const build = await extractAndUploadGameBuild(supabase, zipBuffer);

  const { error: updateError } = await supabase
    .from("games")
    .update({
      game_url: build.playUrl,
    })
    .eq("id", game.id);

  if (updateError) {
    throw new Error(`資料庫更新失敗：${updateError.message}`);
  }

  if (oldGameUrl && oldGameUrl !== build.playUrl && !isPreviewUrl(oldGameUrl)) {
    try {
      await removeBuildFolder(supabase, oldGameUrl);
      console.log("  已清理舊 Storage build");
    } catch {
      console.warn("  略過清理舊 build");
    }
  }

  console.log("");
  console.log("✓ 上傳完成 — 佔位頁已由真實遊戲包覆蓋");
  console.log(`  playUrl：${build.playUrl}`);
  console.log(`  buildId：${build.buildId}`);
  console.log(`  embed 路徑：/api/games/${game.id}/embed/index.html`);
  console.log(`  試玩：https://rainynightfrog.com/game/${game.id}`);
  if (currentlyPreview) {
    console.log(
      `  備註：靜態檔 public/demos/${PREVIEW_URL_MARKER} 仍保留作離線預覽，但 DB 已不再指向它`
    );
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
