import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "public");
const PORT = 3457;

const mime = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};

function startServer() {
  const server = http.createServer((req, res) => {
    let u = decodeURIComponent((req.url || "/").split("?")[0]);
    let fp = path.join(root, u.replace(/^\//, ""));
    if (!fp.startsWith(root)) {
      res.writeHead(403);
      return res.end("forbidden");
    }
    if (fs.existsSync(fp) && fs.statSync(fp).isDirectory()) fp = path.join(fp, "index.html");
    if (!fs.existsSync(fp)) {
      res.writeHead(404);
      return res.end("404");
    }
    const ext = path.extname(fp).toLowerCase();
    res.writeHead(200, { "Content-Type": mime[ext] || "application/octet-stream" });
    res.end(fs.readFileSync(fp));
  });
  return new Promise((resolve) => server.listen(PORT, "127.0.0.1", () => resolve(server)));
}

function findGameExpr() {
  return `(() => {
    for (const k of Object.keys(window)) {
      const v = window[k];
      if (v && typeof v === "object" && v.scene && v.canvas && (v.config || v.loop)) {
        return { key: k, game: v };
      }
    }
    if (window.Phaser && window.Phaser.GAMES && window.Phaser.GAMES.length) {
      return { key: "Phaser.GAMES[0]", game: window.Phaser.GAMES[0] };
    }
    return { key: null, game: null };
  })()`;
}

async function probe(page, url, slug) {
  const pageErrors = [];
  const consoleErrors = [];
  const failed = [];
  const onPe = (e) => pageErrors.push(String(e.message || e).slice(0, 180));
  const onCe = (m) => {
    if (m.type() === "error") consoleErrors.push(String(m.text()).slice(0, 180));
  };
  const onFail = (req) =>
    failed.push(req.url().split("/").slice(-2).join("/") + ":" + (req.failure()?.errorText || ""));

  page.on("pageerror", onPe);
  page.on("console", onCe);
  page.on("requestfailed", onFail);

  await page.goto(`http://127.0.0.1:${PORT}${url}`, {
    waitUntil: "domcontentloaded",
    timeout: 25000,
  });
  await page.waitForTimeout(2000);

  const info = await page.evaluate((findSrc) => {
    // eslint-disable-next-line no-eval
    const found = eval(findSrc);
    const g = found.game;
    let scenes = [];
    let active = [];
    let isRunning = false;
    let hasLoop = false;
    try {
      if (g && g.scene && g.scene.scenes) scenes = g.scene.scenes.map((s) => s.scene.key);
      if (g && g.scene && g.scene.getScenes) active = g.scene.getScenes(true).map((s) => s.scene.key);
      isRunning = !!(g && (g.isRunning || (g.loop && g.loop.running) || (g.step && g.anims)));
      hasLoop = !!(g && g.loop);
    } catch (_) {}

    let painted = false;
    let paintMethod = "none";
    try {
      const c = document.querySelector("canvas");
      if (c) {
        try {
          const u = c.toDataURL("image/png");
          painted = u.length > 1500;
          paintMethod = "todataurl:" + u.length;
        } catch (e) {
          paintMethod = "todataurl-err:" + e.message;
        }
      }
    } catch (e) {
      paintMethod = "err:" + e.message;
    }

    return {
      gameKey: found.key,
      scenes,
      active,
      isRunning,
      hasLoop,
      canvases: document.querySelectorAll("canvas").length,
      painted,
      paintMethod,
      phaser: typeof window.Phaser !== "undefined",
      rnf: typeof window.RNF !== "undefined",
      kit: typeof window.RNFDemoPhaser !== "undefined",
      suite: typeof window.RNFArcadeSuite !== "undefined",
      title: document.title || "",
      bodySnippet: (document.body && document.body.innerText || "").slice(0, 120),
    };
  }, findGameExpr());

  // Click START / difficulty using Phaser logical coords (960×540 → canvas box)
  const canvas = await page.$("canvas");
  let afterActive = info.active;
  let enteredGameplay = false;
  let paintBefore = info.paintMethod;
  let paintAfter = paintBefore;
  async function clickGame(gx, gy) {
    const b = await canvas.boundingBox();
    if (!b) return;
    await page.mouse.click(b.x + (gx / 960) * b.width, b.y + (gy / 540) * b.height);
  }
  if (canvas) {
    paintBefore = await page.evaluate(() => {
      const c = document.querySelector("canvas");
      return c ? c.toDataURL("image/png").length : 0;
    });
    // 開始遊戲：街機中央≈400；suite≈318；demo kit 左鈕 (330,400)
    await clickGame(480, 400);
    await page.waitForTimeout(200);
    await clickGame(480, 318);
    await page.waitForTimeout(200);
    await clickGame(330, 400);
    await page.waitForTimeout(500);
    // 難度：街機 Standard≈278；suite≈300；demo kit≈292
    await clickGame(480, 278);
    await page.waitForTimeout(350);
    await clickGame(480, 300);
    await page.waitForTimeout(350);
    await clickGame(480, 292);
    await page.waitForTimeout(700);
    paintAfter = await page.evaluate(() => {
      const c = document.querySelector("canvas");
      return c ? c.toDataURL("image/png").length : 0;
    });
    afterActive = await page.evaluate((findSrc) => {
      const found = eval(findSrc);
      const g = found.game;
      try {
        return g && g.scene && g.scene.getScenes
          ? g.scene.getScenes(true).map((s) => s.scene.key)
          : [];
      } catch (_) {
        return [];
      }
    }, findGameExpr());
    enteredGameplay =
      (afterActive && afterActive.includes("GameScene")) ||
      Math.abs(paintAfter - paintBefore) > 800;
  }

  // FPS
  const fps = await page.evaluate(async () => {
    return await new Promise((resolve) => {
      let n = 0;
      const t0 = performance.now();
      function tick() {
        n++;
        if (performance.now() - t0 < 1000) requestAnimationFrame(tick);
        else resolve(n);
      }
      requestAnimationFrame(tick);
    });
  });

  page.off("pageerror", onPe);
  page.off("console", onCe);
  page.off("requestfailed", onFail);

  const isLanding =
    slug === "void-gacha-preview" ||
    (/開啟|外站|完整版|landing/i.test(info.bodySnippet) && info.canvases === 0);

  let status = "OK";
  let notes = "";
  if (isLanding) {
    status = pageErrors.length === 0 ? "OK-LANDING" : "FAIL";
    notes = "落地頁";
  } else if (pageErrors.length > 0) {
    status = "FAIL";
    notes = "PAGE:" + pageErrors.slice(0, 2).join(" | ");
  } else if (!info.phaser || info.canvases < 1) {
    status = "FAIL";
    notes = "no-phaser-or-canvas";
  } else if (!info.gameKey && !info.painted && !info.kit) {
    status = "FAIL";
    notes = "no-phaser-game-instance";
  } else if (!info.painted && !(info.active && info.active.length)) {
    status = "WARN";
    notes = "canvas-may-be-blank:" + info.paintMethod;
  } else if (fps < 40) {
    status = "WARN";
    notes = "low-fps";
  } else if (!enteredGameplay && info.kind !== "skip") {
    // still bootable menu is acceptable OK with note if paint ok
    status = info.painted || info.gameKey ? "OK" : "WARN";
    notes =
      (enteredGameplay ? "" : "menu-boot-ok") +
      (consoleErrors.length ? " CONSOLE:" + consoleErrors.slice(0, 2).join("|") : "") +
      (failed.length ? " FAILREQ:" + failed.slice(0, 2).join("|") : "");
  } else if (consoleErrors.length || failed.length) {
    status = "WARN";
    notes =
      (consoleErrors.length ? "CONSOLE:" + consoleErrors.slice(0, 2).join("|") : "") +
      (failed.length ? " FAILREQ:" + failed.slice(0, 2).join("|") : "");
  }
  if (enteredGameplay && status === "OK") notes = (notes ? notes + " " : "") + "entered-GameScene-or-paint-shift";

  return {
    slug,
    status,
    http: 200,
    gameKey: info.gameKey,
    scenes: info.scenes,
    activeBefore: info.active,
    activeAfterClicks: afterActive,
    enteredGameplay,
    painted: info.painted,
    paintBefore,
    paintAfter,
    paintMethod: info.paintMethod,
    fps,
    pageErrs: pageErrors.length,
    consoleErrs: consoleErrors.length,
    reqFails: failed.length,
    notes,
    pageErrors: pageErrors.slice(0, 3),
    consoleErrors: consoleErrors.slice(0, 3),
  };
}

const ARCADE = [
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
  "cyber-blade-dash",
  "neon-pinball-frenzy",
  "void-rhythm-beat",
  "astro-gravity-runner",
  "cyber-rogue-dungeon",
];
const DEMOS = [
  "core-defense-preview",
  "cyber-fortune-preview",
  "pulse-protocol-preview",
  "neon-abyss-runner-preview",
  "signal-breach-preview",
  "void-relay-preview",
  "orbital-salvage-preview",
  "void-gacha-preview",
];

const server = await startServer();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const results = [];

console.log("STATUS\tSLUG\tgameKey\tfps\tpainted\tactive0\tactive1\tpe\tnotes");
for (const s of ARCADE) {
  const row = await probe(page, `/games/${s}/index.html`, s);
  row.kind = "arcade";
  results.push(row);
  console.log(
    [
      row.status,
      row.slug,
      row.gameKey,
      row.fps,
      row.painted,
      (row.activeBefore || []).join(",") || "-",
      (row.activeAfterClicks || []).join(",") || "-",
      row.pageErrs,
      row.notes,
    ].join("\t")
  );
}
for (const s of DEMOS) {
  const row = await probe(page, `/demos/${s}.html`, s);
  row.kind = "demo";
  results.push(row);
  console.log(
    [
      row.status,
      row.slug,
      row.gameKey,
      row.fps,
      row.painted,
      (row.activeBefore || []).join(",") || "-",
      (row.activeAfterClicks || []).join(",") || "-",
      row.pageErrs,
      row.notes,
    ].join("\t")
  );
}

await browser.close();
server.close();

const ok = results.filter((r) => r.status.startsWith("OK")).length;
const warn = results.filter((r) => r.status === "WARN").length;
const fail = results.filter((r) => r.status === "FAIL").length;
console.log(`\nSUMMARY ok=${ok} warn=${warn} fail=${fail} total=${results.length}`);
fs.writeFileSync(
  path.join(__dirname, "_game-health-report.json"),
  JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2)
);
process.exit(fail > 0 ? 1 : 0);
