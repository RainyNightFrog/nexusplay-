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

const LB_BTN = `makeButton(this, W / 2, H / 2 + 190, "排行榜", 0x34d399, function () {
        SFX.click();
        self.scene.stop("GameOverModal");
        try { self.scene.stop("SettingsScene"); } catch (_e) {}
        self.scene.stop("GameScene");
        self.scene.start("LeaderboardScene", { difficulty: (typeof selectedDiff !== "undefined" && selectedDiff) ? selectedDiff : "standard" });
      }, 200);

      makeButton(this, W / 2, H / 2 + 250, "主選單"`;

for (const slug of SLUGS) {
  const f = path.join(root, slug, "index.html");
  let h = fs.readFileSync(f, "utf8");
  const goIdx = h.indexOf("class GameOverModal extends Phaser.Scene");
  if (goIdx < 0) {
    console.log("no GO", slug);
    continue;
  }
  const head = h.slice(0, goIdx);
  let go = h.slice(goIdx);
  if (/排行榜", 0x34d399, function \(\) \{\s*SFX\.click\(\);\s*self\.scene\.stop\("GameOverModal"\)/.test(go)) {
    console.log("GO already", slug);
    continue;
  }
  // Replace first 主選單 button in GameOverModal section
  const next = go.replace(
    /makeButton\(this, W \/ 2, H \/ 2 \+ \d+, "主選單"/,
    LB_BTN
  );
  if (next === go) {
    console.log("GO pattern miss", slug);
    continue;
  }
  // Expand panel height if fixed size rectangle exists
  let merged = head + next;
  merged = merged.replace(
    /(class GameOverModal[\s\S]{0,800}?rectangle\(W \/ 2, H \/ 2, 460, )(\d+)/,
    function (m, p, hgt) {
      const n = Number(hgt);
      if (n < 420) return p + "440";
      return m;
    }
  );
  fs.writeFileSync(f, merged);
  console.log("GO patched", slug);
}
