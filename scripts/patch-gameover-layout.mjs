/**
 * 壓縮街機 GameOverModal：面板加高、按鈕上移，避免主選單溢出框外
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "games");
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

function patchGameOver(html) {
  const idx = html.indexOf("class GameOverModal extends Phaser.Scene");
  if (idx < 0) return { html, changed: false };
  const head = html.slice(0, idx);
  let go = html.slice(idx);

  // Enlarge panel
  go = go.replace(
    /rectangle\(W \/ 2, H \/ 2, 460, \d+/g,
    "rectangle(W / 2, H / 2, 480, 460"
  );

  // Compact button Y positions inside GameOver section only
  // Common patterns after leaderboard patch:
  // retry at +130 or +140, settings at +130, lb at +190, main at +250
  go = go.replace(
    /makeButton\(this, W \/ 2 - 110, H \/ 2 \+ (?:130|140), "(再試一次|再來一次)"/g,
    'makeButton(this, W / 2 - 110, H / 2 + 110, "$1"'
  );
  go = go.replace(
    /makeButton\(this, W \/ 2 \+ 110, H \/ 2 \+ (?:130|140), "設定選單"/g,
    'makeButton(this, W / 2 + 110, H / 2 + 110, "排行榜"'
  );
  // If settings was converted wrongly we need careful handling

  // Standard: 排行榜 at +190 → +110 right if we have retry left; or keep mid row
  // Better unified: replace the whole button block from first makeButton after neonBurst/self=

  // Simpler positional fixes:
  go = go.replace(
    /makeButton\(this, W \/ 2, H \/ 2 \+ 190, "排行榜"/g,
    'makeButton(this, W / 2 + 110, H / 2 + 110, "排行榜"'
  );
  go = go.replace(
    /makeButton\(this, W \/ 2, H \/ 2 \+ 250, "主選單"/g,
    'makeButton(this, W / 2, H / 2 + 172, "主選單"'
  );

  // Remove duplicate 排行榜 if we now have two at +110 right from settings convert - check later

  // Move decorative text up a bit if present at +30 etc - optional
  go = go.replace(
    /(var (?:badge|title) = this\.add\.text\(W \/ 2, H \/ 2 )- 150/g,
    "$1- 168"
  );
  go = go.replace(
    /(var (?:badge|title) = this\.add\.text\(W \/ 2, H \/ 2 )- 112/g,
    "$1- 128"
  );
  go = go.replace(
    /(var scoreTxt = this\.add\.text\(W \/ 2, H \/ 2 )- 40/g,
    "$1- 48"
  );

  return { html: head + go, changed: go !== html.slice(idx) };
}

for (const slug of SLUGS) {
  const f = path.join(root, slug, "index.html");
  let html = fs.readFileSync(f, "utf8");
  const res = patchGameOver(html);
  if (!res.changed) {
    console.log("NOCHANGE", slug);
    continue;
  }
  // Fix possible "設定選單" text wrongly left on 排行榜 button with settings callback
  // Re-read and sanitize: if a button labeled 排行榜 still launches SettingsScene, restore
  let out = res.html;
  out = out.replace(
    /makeButton\(this, W \/ 2 \+ 110, H \/ 2 \+ 110, "排行榜", 0xa78bfa, function \(\) \{\s*self\.scene\.launch\("SettingsScene"\);\s*\}, 180\);/g,
    `makeButton(this, W / 2 + 110, H / 2 + 110, "排行榜", 0x34d399, function () {
        SFX.click();
        self.scene.stop("GameOverModal");
        try { self.scene.stop("SettingsScene"); } catch (_e) {}
        self.scene.stop("GameScene");
        self.scene.start("LeaderboardScene", { difficulty: (typeof selectedDiff !== "undefined" && selectedDiff) ? selectedDiff : "standard" });
      }, 180);`
  );

  // Remove orphaned old settings-only button if both 排行榜 exist
  // Count 排行榜 in GameOver section
  const goIdx = out.indexOf("class GameOverModal extends Phaser.Scene");
  const goSec = out.slice(goIdx);
  const lbCount = (goSec.match(/"排行榜"/g) || []).length;
  if (lbCount > 1) {
    // remove the centered leftover 排行榜 block if any still at wrong place
    out =
      out.slice(0, goIdx) +
      goSec.replace(
        /\n\s*makeButton\(this, W \/ 2, H \/ 2 \+ 110, "排行榜"[\s\S]*?\}, 200\);/,
        ""
      );
  }

  fs.writeFileSync(f, out);
  console.log("OK", slug, "lbInGO=" + ((out.slice(out.indexOf("class GameOverModal")).match(/"排行榜"/g) || []).length));
}
