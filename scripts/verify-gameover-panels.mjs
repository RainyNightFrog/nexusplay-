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
  if (i < 0) continue;
  let go = html.slice(i);
  go = go.replace(/rectangle\(W \/ 2, H \/ 2, (\d+), (400|420|440)\)/g, "rectangle(W / 2, H / 2, $1, 460)");
  // restore depth on menu if missing after var menu =
  go = go.replace(
    /(var menu = makeButton\(this, W \/ 2, H \/ 2 \+ 172, "主選單", 0x64748b, function \(\) \{[\s\S]*?\}, 200\);)\n(\s*)\}/,
    "$1\n$2menu.bg.setDepth(73); menu.txt.setDepth(74);\n$2}"
  );
  html = html.slice(0, i) + go;
  fs.writeFileSync(f, html);
  const panel = (go.match(/rectangle\(W \/ 2, H \/ 2, (\d+), (\d+)/) || []).slice(1).join("x");
  const labels = [...go.matchAll(/makeButton\(this,[^,]+,[^,]+, "([^"]+)"/g)].map((m) => m[1]);
  console.log(slug, panel, labels.join(" | "));
}
