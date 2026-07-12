/**
 * Twitch OAuth 設定助手
 * 用法：npm run setup:twitch
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
  const twitchRedirectUri = `https://${projectRef}.supabase.co/auth/v1/callback`;
  const productionSite = PRODUCTION_SITE_URL;

  const twitchConsoleUrl = "https://dev.twitch.tv/console/apps/create";
  const supabaseTwitchUrl = `https://supabase.com/dashboard/project/${projectRef}/auth/providers?provider=Twitch`;
  const supabaseUrlConfig = `https://supabase.com/dashboard/project/${projectRef}/auth/url-configuration`;

  console.log("");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  RainyNightFrog · Twitch 登入設定助手（只需 3 步）");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("");
  console.log("── 步驟 1：Twitch Developer Console 建立應用 ──");
  console.log("  Name → RainyNightFrog");
  console.log(`  OAuth Redirect URLs → 貼下面這一行：`);
  console.log("");
  console.log(`  ${twitchRedirectUri}`);
  console.log("");
  console.log("  Category → Website Integration（或 Game Integration）");
  console.log("  Client Type → Confidential");
  console.log("");

  const copied = copyToClipboard(twitchRedirectUri);
  if (copied) {
    console.log("  ✓ 已複製到剪貼簿");
  }

  console.log("");
  console.log("── 步驟 2：複製 Client ID 與 Client Secret ──");
  console.log("  建立後在應用 Manage 頁 → New Secret");
  console.log("");
  console.log("── 步驟 3：寫入 Supabase ──");
  console.log("  npm run setup:twitch:apply");
  console.log("  或 Authentication → Providers → Twitch → Enable");
  console.log("");
  console.log(`  Site URL：${productionSite}`);
  console.log("");
  console.log("正在開啟瀏覽器分頁…");
  console.log("");

  [
    ["Twitch 新建應用", twitchConsoleUrl],
    ["Supabase Twitch Provider", supabaseTwitchUrl],
    ["Supabase URL 設定", supabaseUrlConfig],
  ].forEach(([label, url]) => {
    const ok = openUrl(url);
    console.log(`  ${ok ? "✓" : "✗"} ${label}`);
  });

  console.log("");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("");
}

main();
