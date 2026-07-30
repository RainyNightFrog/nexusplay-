/**
 * 統一 GameOver：面板加高、按鈕上移縮小、清掉殘缺「var menu =」
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

for (const slug of SLUGS) {
  const f = path.join(root, slug, "index.html");
  let html = fs.readFileSync(f, "utf8");
  const i = html.indexOf("class GameOverModal");
  if (i < 0) {
    console.log("skip", slug);
    continue;
  }
  const head = html.slice(0, i);
  let go = html.slice(i);

  // Remove broken duplicate "var menu =" lines
  go = go.replace(/\n\s*var menu =\s*\n\s*var menu =/g, "\n      var menu =");
  go = go.replace(/\n\s*var menu =\s*\n(?!\s*var menu)/g, "\n");

  // Panel taller (GameOver only — first rectangle after dim overlay)
  go = go.replace(
    /(this\.add\.rectangle\(W \/ 2, H \/ 2, W, H[\s\S]{0,120}?var panel = this\.add\.rectangle\(W \/ 2, H \/ 2, )\d+, \d+/,
    "$1$480, 500".replace("$480", "480")
  );
  // Some use 500 width
  go = go.replace(
    /(var panel = this\.add\.rectangle\(W \/ 2, H \/ 2, )(480|500), (400|420|440|460)/,
    "$1$2, 500"
  );

  // Compact button rows inside panel (half height 250; btn h≈44 → bottom +167 safe)
  go = go.replace(/H \/ 2 \+ 110/g, "H / 2 + 95");
  go = go.replace(/H \/ 2 \+ 172/g, "H / 2 + 155");

  html = head + go;
  fs.writeFileSync(f, html);

  const panel = (go.match(/var panel = this\.add\.rectangle\(W \/ 2, H \/ 2, (\d+), (\d+)/) || []).slice(1);
  const ys = [...go.matchAll(/H \/ 2 \+ (\d+)/g)].map((m) => m[1]);
  console.log(slug, "panel", panel.join("x"), "ys", ys.filter((y) => Number(y) >= 90).join(","));
}

// Suite shared
const suite = path.join(root, "_shared", "rnf-phaser-arcade-suite.js");
let s = fs.readFileSync(suite, "utf8");
s = s.replace(
  /var panel = this\.add\.rectangle\(W \/ 2, H \/ 2, 480, 460/,
  "var panel = this.add.rectangle(W / 2, H / 2, 480, 500"
);
s = s.replace(
  /\/\/ 兩排按鈕：全部落在面板內（面板半高 230，最底按鈕中心 \+170）\s*\n\s*makeMenuButton\(this, W \/ 2 - 110, H \/ 2 \+ 110/,
  "// 兩排按鈕：落在面板內（半高 250）\n        makeMenuButton(this, W / 2 - 110, H / 2 + 95"
);
s = s.replace(
  /makeMenuButton\(this, W \/ 2 \+ 110, H \/ 2 \+ 110, "排行榜"/,
  'makeMenuButton(this, W / 2 + 110, H / 2 + 95, "排行榜"'
);
s = s.replace(
  /makeMenuButton\(this, W \/ 2, H \/ 2 \+ 172, "主選單"/,
  'makeMenuButton(this, W / 2, H / 2 + 155, "主選單"'
);
// Smaller gameover buttons
s = s.replace(
  /function makeMenuButton\(scene, x, y, label, fill, onClick, width\) \{\s*var bw = width \|\| 300;\s*var bg = scene\.add\.rectangle\(x, y, bw, 54,/,
  "function makeMenuButton(scene, x, y, label, fill, onClick, width) {\n    var bw = width || 300;\n    var bh = width && width <= 220 ? 44 : 50;\n    var bg = scene.add.rectangle(x, y, bw, bh,"
);
fs.writeFileSync(suite, s);
console.log("suite updated");
