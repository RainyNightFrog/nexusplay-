import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const suite = [
  "cyber-blade-dash",
  "cyber-rogue-dungeon",
  "void-rhythm-beat",
  "astro-gravity-runner",
  "neon-pinball-frenzy",
];
for (const s of suite) {
  const f = path.join(root, "public", "games", s, "index.html");
  let h = fs.readFileSync(f, "utf8");
  h = h.replace(
    /rnf-phaser-arcade-suite\.js\?v=[^\s"]+/g,
    "rnf-phaser-arcade-suite.js?v=20260731h"
  );
  fs.writeFileSync(f, h);
  console.log(s);
}

// Shrink arcade GameOver makeButton height: patch common pattern in GO only is hard;
// instead shrink all makeButton 50->44 for less overflow risk
const arcade = [
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
for (const slug of arcade) {
  const f = path.join(root, "public", "games", slug, "index.html");
  let h = fs.readFileSync(f, "utf8");
  // Only the standard makeButton rectangle height 50 -> 44
  const n = h.replace(
    /(function makeButton\(scene, x, y, label, color, onClick, width\) \{\s*var bw = width \|\| 300;\s*var bg = scene\.add\.rectangle\(x, y, bw, )50(,)/,
    "$144$2"
  );
  if (n !== h) {
    fs.writeFileSync(f, n);
    console.log("btn44", slug);
  } else {
    // try looser
    const n2 = h.replace(
      /scene\.add\.rectangle\(x, y, bw, 50, color/,
      "scene.add.rectangle(x, y, bw, 44, color"
    );
    if (n2 !== h) {
      fs.writeFileSync(f, n2);
      console.log("btn44-loose", slug);
    } else console.log("no btn change", slug);
  }
}
