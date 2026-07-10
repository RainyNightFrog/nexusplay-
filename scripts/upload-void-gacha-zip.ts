/**
 * 以 Service Role 上傳 VOID GACHA zip 並更新 games.game_url（免開後台）
 * 用法：npm run upload:void-gacha [zip路徑] [gameId]
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { extractAndUploadGameBuild } from "../lib/extract-game-zip";
import { removeBuildFolder } from "../lib/game-storage";

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

function defaultZipPath() {
    const desktop = resolve(process.env.USERPROFILE || "", "Desktop");
    return resolve(desktop, "RainyNightFrog", "RainyNightFrog.zip");
}

async function main() {
    loadEnv();

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
        throw new Error("缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY（.env.local）");
    }

    const zipPath = resolve(process.argv[2] || defaultZipPath());
    const gameId = Number.parseInt(process.argv[3] || "1", 10);
    if (Number.isNaN(gameId)) {
        throw new Error("無效的 gameId");
    }

    const zipBuffer = readFileSync(zipPath).buffer;
    const supabase = createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: game, error: fetchError } = await supabase
        .from("games")
        .select("id,title,game_url")
        .eq("id", gameId)
        .single();

    if (fetchError || !game) {
        throw new Error(fetchError?.message || `找不到遊戲 id=${gameId}`);
    }

    console.log(`上傳 zip → ${game.title} (id=${gameId})`);
    console.log(`  檔案：${zipPath}`);

    const oldGameUrl = game.game_url as string | null;
    const build = await extractAndUploadGameBuild(supabase, zipBuffer);

    const { error: updateError } = await supabase
        .from("games")
        .update({
            game_url: build.playUrl,
        })
        .eq("id", gameId);

    if (updateError) {
        throw new Error(`資料庫更新失敗：${updateError.message}`);
    }

    if (oldGameUrl && oldGameUrl !== build.playUrl) {
        try {
            await removeBuildFolder(supabase, oldGameUrl);
            console.log("  已清理舊 build");
        } catch {
            console.warn("  略過清理舊 build");
        }
    }

    console.log("✓ 上傳完成");
    console.log(`  playUrl：${build.playUrl}`);
    console.log(`  buildId：${build.buildId}`);
    console.log(`  試玩：https://rainynightfrog.com/zh-CN/game/${gameId}`);
}

main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
});
