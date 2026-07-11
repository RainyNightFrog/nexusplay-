import { chromium } from "playwright";

const GAMES = [
  { id: 10, slug: "neon-snake-extreme" },
  { id: 11, slug: "cyber-bubble-pop" },
  { id: 12, slug: "quantum-tic-tac-toe" },
  { id: 13, slug: "void-brick-breaker" },
  { id: 14, slug: "rainy-frog-dash" },
  { id: 15, slug: "neon-tetromino-rush" },
  { id: 16, slug: "galactic-invader-2026" },
  { id: 17, slug: "memory-matrix-glitch" },
  { id: 18, slug: "overdrive-cyber-pong" },
  { id: 19, slug: "cyber-neon-runner" },
];

const browser = await chromium.launch();
const page = await browser.newPage();
const results = [];

for (const g of GAMES) {
  const row = { id: g.id, slug: g.slug, btn: "?", rnf: "?", play: "?", menu: "?", home: "?" };
  try {
    await page.goto(`http://localhost:3000/zh-TW/game/${g.id}`, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
    await page.waitForTimeout(1200);
    const iframe = await page.$("iframe");
    if (!iframe) {
      row.rnf = "no-iframe";
      results.push(row);
      continue;
    }
    const src = await iframe.getAttribute("src");
    const btn = page.getByRole("button", { name: /回到遊戲主選單/ });
    row.btn = (await btn.count()) > 0 && !(await btn.isDisabled()) ? "ok" : "missing";

    const frame = await iframe.contentFrame();
    row.rnf = await frame.evaluate(() => typeof window.RNF !== "undefined");
    await frame.waitForSelector("#rnf-play", { timeout: 8000 });
    await frame.click("#rnf-play");
    await page.waitForTimeout(600);
    row.play = await frame.evaluate(() =>
      document.getElementById("rnf-game")?.classList.contains("active")
    );

    if (g.id === 18) {
      await frame.click("canvas");
      await page.keyboard.press("Digit1");
      await page.waitForTimeout(300);
    }

    if (row.btn === "ok") {
      await btn.click();
      await page.waitForTimeout(500);
    }
    row.menu = await frame.evaluate(() =>
      document.getElementById("rnf-menu")?.classList.contains("active")
    );
    row.home = await frame.evaluate(() => !!document.getElementById("rnf-game-home"));
  } catch (e) {
    row.rnf = "err:" + (e.message || "").slice(0, 40);
  }
  results.push(row);
}

console.log("ID\tSLUG\tBTN\tRNF\tPLAY\tMENU\tHOME_BTN");
for (const r of results) {
  console.log(`${r.id}\t${r.slug}\t${r.btn}\t${r.rnf}\t${r.play}\t${r.menu}\t${r.home}`);
}
await browser.close();
