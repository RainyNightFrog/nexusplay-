/**
 * Google OAuth 一鍵設定助手
 * 用法：npm run setup:google
 * 會在終端機印出要複製的值，並開啟 Google / Supabase 設定頁。
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";
import {
  GOOGLE_AUTHORIZED_JAVASCRIPT_ORIGINS,
  PRODUCTION_SITE_URL,
} from "./auth-site-config.mjs";

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
  const googleRedirectUri = `https://${projectRef}.supabase.co/auth/v1/callback`;
  const productionSite = PRODUCTION_SITE_URL;
  const productionCallback = `${productionSite}/auth/callback`;
  const localCallback = "http://localhost:3000/auth/callback";

  const googleConsentUrl =
    "https://console.cloud.google.com/auth/overview?project=_";
  const googleClientsUrl =
    "https://console.cloud.google.com/auth/clients?project=_";
  const supabaseGoogleUrl = `https://supabase.com/dashboard/project/${projectRef}/auth/providers?provider=Google`;
  const supabaseUrlConfig = `https://supabase.com/dashboard/project/${projectRef}/auth/url-configuration`;

  console.log("");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  RainyNightFrog · Google 登入設定助手（只需 3 步）");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("");
  console.log("【重要】請在 Google Cloud 右上角選「RainyNightFrog」新專案，");
  console.log("       不要用 My Project 111111。");
  console.log("");
  console.log("── 步驟 1：OAuth 同意畫面（解決「尚未設定 Google 驗證平台」）──");
  console.log("  ① 使用者類型 → 外部 (External)");
  console.log("  ② 應用程式名稱 → RainyNightFrog");
  console.log("  ③ 支援 Email + 開發人員 Email → 填你的 Gmail");
  console.log("  ④ 範圍 → 直接略過");
  console.log("  ⑤ 測試使用者 → 加入你的 Gmail（必做！）");
  console.log("");
  console.log("── 步驟 2：建立 OAuth 用戶端 ──");
  console.log("  類型：網頁應用程式");
  console.log("  名稱：RainyNightFrog Supabase");
  console.log("  已授權的重新導向 URI（複製下面這一行）：");
  console.log("");
  console.log(`  ${googleRedirectUri}`);
  console.log("");

  const copied = copyToClipboard(googleRedirectUri);
  if (copied) {
    console.log("  ✓ 已複製到剪貼簿，在 Google 用戶端頁面直接 Ctrl+V 貼上即可");
  }

  console.log("");
  console.log("── 步驟 3：Supabase 貼上 Client ID / Secret ──");
  console.log("  Authentication → Sign In / Providers → Google → Enable");
  console.log("");
  console.log("── Supabase URL Configuration（順便確認）──");
  console.log(`  Site URL：${productionSite}`);
  console.log(`  Redirect URLs：${productionCallback}`);
  console.log(`                ${localCallback}`);
  console.log("");
  console.log("── Google Authorized JavaScript origins（請加到 OAuth 用戶端）──");
  for (const origin of GOOGLE_AUTHORIZED_JAVASCRIPT_ORIGINS) {
    console.log(`  ${origin}`);
  }
  console.log("");
  console.log("── 完成後測試 ──");
  console.log("  npm run dev  →  打開 http://localhost:3000/auth");
  console.log("  點「使用 Google 登入」");
  console.log("");
  console.log("正在開啟瀏覽器分頁…");
  console.log("");

  const opened = [
    ["Google OAuth 同意畫面", googleConsentUrl],
    ["Google OAuth 用戶端", googleClientsUrl],
    ["Supabase Google Provider", supabaseGoogleUrl],
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
  console.log("  程式端已就緒，剩下 Google / Supabase 後台這 3 步。");
  console.log("  設定完回來執行 npm run dev 測試即可。");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("");
}

main();
