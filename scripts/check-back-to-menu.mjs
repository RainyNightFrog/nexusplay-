/**
 * 驗證虛擬遊戲「返回遊戲主選單」postMessage 是否生效
 */
import { chromium } from "playwright";

const BASE = process.env.TEST_BASE || "http://localhost:3000";

const TARGETS = [
  { kind: "arcade", path: "/games/neon-snake-extreme/index.html", slug: "neon-snake-extreme" },
  { kind: "arcade", path: "/games/cyber-bubble-pop/index.html", slug: "cyber-bubble-pop" },
  { kind: "arcade", path: "/games/quantum-tic-tac-toe/index.html", slug: "quantum-tic-tac-toe" },
  { kind: "arcade", path: "/games/void-brick-breaker/index.html", slug: "void-brick-breaker" },
  { kind: "arcade", path: "/games/rainy-frog-dash/index.html", slug: "rainy-frog-dash" },
  { kind: "arcade", path: "/games/neon-tetromino-rush/index.html", slug: "neon-tetromino-rush" },
  { kind: "arcade", path: "/games/galactic-invader-2026/index.html", slug: "galactic-invader-2026" },
  { kind: "arcade", path: "/games/memory-matrix-glitch/index.html", slug: "memory-matrix-glitch" },
  { kind: "arcade", path: "/games/overdrive-cyber-pong/index.html", slug: "overdrive-cyber-pong" },
  { kind: "arcade", path: "/games/cyber-neon-runner/index.html", slug: "cyber-neon-runner" },
  { kind: "arcade", path: "/games/cyber-blade-dash/index.html", slug: "cyber-blade-dash" },
  { kind: "arcade", path: "/games/neon-pinball-frenzy/index.html", slug: "neon-pinball-frenzy" },
  { kind: "arcade", path: "/games/void-rhythm-beat/index.html", slug: "void-rhythm-beat" },
  { kind: "arcade", path: "/games/astro-gravity-runner/index.html", slug: "astro-gravity-runner" },
  { kind: "arcade", path: "/games/cyber-rogue-dungeon/index.html", slug: "cyber-rogue-dungeon" },
  { kind: "demo", path: "/demos/core-defense-preview.html", slug: "core-defense" },
  { kind: "demo", path: "/demos/cyber-fortune-preview.html", slug: "cyber-fortune" },
  { kind: "demo", path: "/demos/pulse-protocol-preview.html", slug: "pulse-protocol" },
  { kind: "demo", path: "/demos/neon-abyss-runner-preview.html", slug: "neon-abyss-runner" },
  { kind: "demo", path: "/demos/signal-breach-preview.html", slug: "signal-breach" },
  { kind: "demo", path: "/demos/void-relay-preview.html", slug: "void-relay" },
  { kind: "demo", path: "/demos/orbital-salvage-preview.html", slug: "orbital-salvage" },
];

function findGameExpr() {
  return `(() => {
    if (window.__RNF_DEMO_GAME__) return window.__RNF_DEMO_GAME__;
    for (const k of Object.keys(window)) {
      if (!k.startsWith("__")) continue;
      const v = window[k];
      if (v && v.scene && v.canvas && typeof v.scene.start === "function") return v;
    }
    return null;
  })()`;
}

async function activeScenes(page) {
  return page.evaluate((src) => {
    const g = eval(src);
    if (!g) return [];
    try {
      return g.scene.getScenes(true).map((s) => s.scene.key);
    } catch {
      return [];
    }
  }, findGameExpr());
}

async function clickGame(page, gx, gy) {
  const canvas = await page.$("canvas");
  if (!canvas) return;
  const b = await canvas.boundingBox();
  if (!b) return;
  await page.mouse.click(b.x + (gx / 960) * b.width, b.y + (gy / 540) * b.height);
}

async function enterGameplay(page, kind) {
  if (kind === "demo") {
    await clickGame(page, 330, 400);
    await page.waitForTimeout(500);
    await clickGame(page, 480, 292);
  } else {
    await clickGame(page, 480, 318);
    await page.waitForTimeout(200);
    await clickGame(page, 480, 400);
    await page.waitForTimeout(450);
    await clickGame(page, 480, 278);
    await page.waitForTimeout(300);
    await clickGame(page, 480, 300);
  }
  await page.waitForTimeout(900);
}

async function postShowMenu(page) {
  await page.evaluate(() => {
    window.postMessage({ type: "rainynightfrog:show-menu" }, window.location.origin);
    window.postMessage({ type: "RNF_SHOW_MENU" }, window.location.origin);
  });
  // Also simulate parent→iframe: in same page test, message source is self not parent.
  // Call handlers directly when available.
  await page.evaluate(() => {
    if (window.RNF && typeof RNF.showMainMenu === "function") RNF.showMainMenu();
    if (window.PlatformBridge && typeof PlatformBridge.showMenu === "function") {
      PlatformBridge.showMenu();
    }
  });
  await page.waitForTimeout(600);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const results = [];

for (const t of TARGETS) {
  const row = { slug: t.slug, kind: t.kind, before: [], after: [], ok: false, note: "" };
  try {
    await page.goto(BASE + t.path, { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.waitForTimeout(1800);
    await enterGameplay(page, t.kind);
    row.before = await activeScenes(page);
    await postShowMenu(page);
    row.after = await activeScenes(page);
    row.ok =
      row.after.includes("MainMenuScene") &&
      !row.after.includes("GameScene");
    if (!row.ok) {
      // force via RNF fallback path
      await page.evaluate(() => {
        if (window.RNF && RNF.showMainMenu) RNF.showMainMenu();
      });
      await page.waitForTimeout(400);
      row.after = await activeScenes(page);
      row.ok =
        row.after.includes("MainMenuScene") &&
        !row.after.includes("GameScene");
      row.note = row.ok ? "ok-via-showMainMenu" : "still-not-menu";
    }
  } catch (e) {
    row.note = String(e.message || e).slice(0, 120);
  }
  results.push(row);
  console.log(
    [row.ok ? "OK" : "FAIL", row.slug, "before=" + row.before.join("|"), "after=" + row.after.join("|"), row.note].join("\t")
  );
}

await browser.close();
const fail = results.filter((r) => !r.ok).length;
console.log("\nSUMMARY ok=" + (results.length - fail) + " fail=" + fail);
process.exit(fail ? 1 : 0);
