/**
 * Discord OAuth 設定助手
 * 用法：npm run setup:discord
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";
import { PRODUCTION_SITE_URL } from "./auth-site-config.mjs";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  try {
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
  } catch {
    console.warn("⚠ 找不到 .env.local，將使用預設 Supabase 專案 ID。");
  }
}

function extractProjectRef(url) {
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  return match?.[1] ?? "icydkixwynxizrgfzelq";
}

function openUrl(url) {
  try {
    if (process.platform === "win32") {
      execSync(`start "" "${url}"`, { stdio: "ignore", shell: true });
    } else if (process.platform === "darwin") {
      execSync(`open "${url}"`, { stdio: "ignore" });
    } else {
      execSync(`xdg-open "${url}"`, { stdio: "ignore" });
    }
    return true;
  } catch {
    return false;
  }
}

function copyToClipboard(text) {
  try {
    if (process.platform === "win32") {
      execSync("powershell -Command Set-Clipboard -Value $input", {
        input: text,
        stdio: ["pipe", "ignore", "ignore"],
      });
      return true;
    }
    if (process.platform === "darwin") {
      execSync("pbcopy", { input: text, stdio: ["pipe", "ignore", "ignore"] });
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

function main() {
  loadEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const projectRef = extractProjectRef(supabaseUrl);
  const discordRedirectUri = `https://${projectRef}.supabase.co/auth/v1/callback`;
  const productionSite = PRODUCTION_SITE_URL;
  const productionCallback = `${productionSite}/auth/callback`;
  const localCallback = "http://localhost:3000/auth/callback";

  const discordAppsUrl = "https://discord.com/developers/applications";
  const supabaseDiscordUrl = `https://supabase.com/dashboard/project/${projectRef}/auth/providers?provider=Discord`;
  const supabaseUrlConfig = `https://supabase.com/dashboard/project/${projectRef}/auth/url-configuration`;

  console.log("");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  RainyNightFrog · Discord 登入設定助手（只需 3 步）");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("");
  console.log("── 步驟 1：Discord Developer Portal 建立應用 ──");
  console.log("  ① New Application → 名稱 RainyNightFrog");
  console.log("  ② OAuth2 → General → Redirects 加入下面這一行：");
  console.log("");
  console.log(`  ${discordRedirectUri}`);
  console.log("");

  const copied = copyToClipboard(discordRedirectUri);
  if (copied) {
    console.log("  ✓ 已複製到剪貼簿，在 Discord OAuth2 頁面直接 Ctrl+V 貼上即可");
  }

  console.log("");
  console.log("── 步驟 2：複製 Client ID 與 Client Secret ──");
  console.log("  OAuth2 → General → Client ID / Client Secret");
  console.log("");
  console.log("── 步驟 3：Supabase 貼上 Client ID / Secret ──");
  console.log("  Authentication → Sign In / Providers → Discord → Enable");
  console.log("");
  console.log("── Supabase URL Configuration（順便確認）──");
  console.log(`  Site URL：${productionSite}`);
  console.log(`  Redirect URLs：${productionCallback}`);
  console.log(`                ${localCallback}`);
  console.log("");
  console.log("── 完成後測試 ──");
  console.log("  npm run dev  →  打開 http://localhost:3000/auth");
  console.log("  點「使用 Discord 登入」");
  console.log("");
  console.log("── 一鍵寫入 Supabase（可選）──");
  console.log("  npm run setup:discord:finish");
  console.log("  或開啟 http://localhost:3000/auth/setup-discord");
  console.log("");
  console.log("正在開啟瀏覽器分頁…");
  console.log("");

  const opened = [
    ["Discord Developer Portal", discordAppsUrl],
    ["Supabase Discord Provider", supabaseDiscordUrl],
    ["Supabase URL 設定", supabaseUrlConfig],
  ].map(([label, url]) => {
    const ok = openUrl(url);
    console.log(`  ${ok ? "✓" : "✗"} ${label}`);
    return ok;
  });

  if (!opened.every(Boolean)) {
    console.log("");
    console.log("無法自動開啟瀏覽器，請手動開啟：");
    for (const [, url] of opened) console.log(`  ${url}`);
  }

  console.log("");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  程式端已就緒，剩下 Discord / Supabase 後台這 3 步。");
  console.log("  設定完回來執行 npm run dev 測試即可。");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("");
}

main();
