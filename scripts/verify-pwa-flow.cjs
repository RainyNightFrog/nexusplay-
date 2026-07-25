const fs = require("fs");
const path = require("path");

const BASE = process.env.PWA_TEST_BASE || "http://127.0.0.1:3010";
const results = [];

function ok(name, pass, detail = "") {
  results.push({ name, pass: Boolean(pass), detail });
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  // 1) Manifest
  const mRes = await fetch(`${BASE}/manifest.webmanifest`);
  ok("manifest HTTP 200", mRes.status === 200, `status=${mRes.status}`);
  const ct = mRes.headers.get("content-type") || "";
  ok("manifest content-type", /manifest|json/i.test(ct), ct);
  const manifest = await mRes.json();
  ok(
    "manifest.name",
    manifest.name === "RainyNightFrog · 霓虹網頁遊戲宇宙",
    JSON.stringify(manifest.name)
  );
  ok("manifest.short_name", manifest.short_name === "RainyNightFrog", manifest.short_name);
  ok("manifest.display=standalone", manifest.display === "standalone", manifest.display);
  ok(
    "manifest.background_color",
    manifest.background_color === "#0a0a10",
    manifest.background_color
  );
  ok("manifest.theme_color", manifest.theme_color === "#0a0a10", manifest.theme_color);
  ok("manifest.start_url", Boolean(manifest.start_url), String(manifest.start_url));

  const icons = manifest.icons || [];
  ok(
    "manifest has 192 icon",
    icons.some((i) => String(i.src).includes("icon-192") && String(i.sizes).includes("192"))
  );
  ok(
    "manifest has 512 icon",
    icons.some((i) => String(i.src).includes("icon-512") && String(i.sizes).includes("512"))
  );
  ok(
    "manifest has maskable",
    icons.some((i) => String(i.purpose).includes("maskable"))
  );

  // 2) Icon assets
  for (const assetPath of [
    "/brand/icon-192.png",
    "/brand/icon-512.png",
    "/brand/apple-touch-icon.png",
  ]) {
    const r = await fetch(`${BASE}${assetPath}`);
    const buf = Buffer.from(await r.arrayBuffer());
    const isPng =
      buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
    ok(
      `asset ${assetPath}`,
      r.status === 200 && isPng,
      `status=${r.status} bytes=${buf.length} png=${isPng}`
    );
  }

  // 3) Service worker
  const sw = await fetch(`${BASE}/sw.js`);
  const swText = await sw.text();
  ok("sw.js HTTP 200", sw.status === 200);
  ok("sw.js has fetch listener", /addEventListener\(\s*["']fetch["']/.test(swText));
  ok("sw.js has push listener", /addEventListener\(\s*["']push["']/.test(swText));
  const codeWithoutComments = swText
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  ok(
    "sw.js does not intercept with respondWith",
    !/respondWith/.test(codeWithoutComments),
    "avoid breaking Next.js streaming"
  );

  // 4) Locale HTML meta / link tags
  const page = await fetch(`${BASE}/zh-HK`);
  const html = await page.text();
  ok("locale page HTTP 200", page.status === 200, `status=${page.status}`);
  ok(
    "apple-mobile-web-app-capable",
    /name=["']apple-mobile-web-app-capable["'][^>]*content=["']yes["']/i.test(html) ||
      /name=["']apple-mobile-web-app-capable["']/i.test(html)
  );
  ok(
    "mobile-web-app-capable fallback",
    /name=["']mobile-web-app-capable["'][^>]*content=["']yes["']/i.test(html)
  );
  ok(
    "apple-mobile-web-app-status-bar-style",
    html.includes("apple-mobile-web-app-status-bar-style") &&
      html.includes("black-translucent")
  );
  ok(
    "apple-mobile-web-app-title",
    html.includes("apple-mobile-web-app-title") && html.includes("RainyNightFrog")
  );
  ok(
    "apple-touch-icon link",
    html.includes("/brand/apple-touch-icon.png")
  );
  ok(
    "manifest link in HTML",
    /rel=["']manifest["']/i.test(html) || html.includes("manifest.webmanifest")
  );
  ok("theme-color #0a0a10", html.includes("#0a0a10"));

  // 5) Settings page reachable
  const settings = await fetch(`${BASE}/zh-HK/settings`);
  ok("settings page HTTP 200", settings.status === 200, `status=${settings.status}`);

  // 6) Client source checks (logic smoke)
  const promptSrc = fs.readFileSync(
    path.join(__dirname, "..", "components", "pwa", "PwaInstallPrompt.tsx"),
    "utf8"
  );
  ok("listens beforeinstallprompt", promptSrc.includes("beforeinstallprompt"));
  ok("standalone detection used", promptSrc.includes("isStandaloneDisplay") || promptSrc.includes("display-mode: standalone"));
  ok("iOS guide modal present", promptSrc.includes("iosGuideOpen") || promptSrc.includes("ios_step1"));
  ok("24h dismiss storage", promptSrc.includes("dismissForOneDay") || promptSrc.includes("PWA_DISMISS"));
  ok("desktop banner hidden class", promptSrc.includes("md:hidden"));

  const layoutSrc = fs.readFileSync(
    path.join(__dirname, "..", "app", "[locale]", "layout.tsx"),
    "utf8"
  );
  ok("layout mounts PwaInstallProvider", layoutSrc.includes("PwaInstallProvider"));
  ok("layout mounts PwaRegister", layoutSrc.includes("PwaRegister"));

  const userNavSrc = fs.readFileSync(
    path.join(__dirname, "..", "components", "auth", "user-nav.tsx"),
    "utf8"
  );
  ok("user-nav has install entry", userNavSrc.includes("menu_install") && userNavSrc.includes("promptInstall"));

  const settingsSrc = fs.readFileSync(
    path.join(__dirname, "..", "app", "[locale]", "settings", "page.tsx"),
    "utf8"
  );
  ok("settings has install entry", settingsSrc.includes("promptInstall") && settingsSrc.includes("menu_install"));

  // 7) i18n
  const zh = JSON.parse(fs.readFileSync("./messages/zh-HK.json", "utf8"));
  const en = JSON.parse(fs.readFileSync("./messages/en.json", "utf8"));
  const required = [
    "install_title",
    "install_desc",
    "ios_step1",
    "ios_step2",
    "menu_install",
    "install_cta",
    "install_later",
  ];
  ok(
    "zh-HK pwa keys",
    required.every((k) => typeof zh.pwa?.[k] === "string")
  );
  ok(
    "en pwa keys",
    required.every((k) => typeof en.pwa?.[k] === "string")
  );

  // 8) Lib helpers unit-ish (jsdom-free)
  const pwaLib = fs.readFileSync(path.join(__dirname, "..", "lib", "pwa.ts"), "utf8");
  ok("lib has isIosDevice", pwaLib.includes("function isIosDevice"));
  ok("lib has isMobileDevice", pwaLib.includes("function isMobileDevice"));
  ok("lib dismiss 24h constant", pwaLib.includes("24 * 60 * 60 * 1000"));

  const failed = results.filter((r) => !r.pass);
  console.log(
    `\n=== SUMMARY: ${results.length - failed.length}/${results.length} passed ===`
  );
  if (failed.length) {
    console.log("FAILED:");
    for (const f of failed) {
      console.log(` - ${f.name}${f.detail ? ` | ${f.detail}` : ""}`);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("TEST ERROR", error);
  process.exit(1);
});
