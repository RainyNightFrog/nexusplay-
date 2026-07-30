/**
 * 確保街機有 rnfGameVolMul，並正確乘上 tone 音量
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
  "_template",
];

const HELPER = `  function rnfGameVolMul() {
    try {
      if (typeof RNF !== "undefined" && RNF.getGameVolume) return RNF.getGameVolume();
      if (typeof window !== "undefined" && typeof window.__RNF_GAME_VOLUME__ === "number") return window.__RNF_GAME_VOLUME__;
    } catch (_e) {}
    return 1;
  }
`;

for (const slug of SLUGS) {
  const f = path.join(root, slug, "index.html");
  let html = fs.readFileSync(f, "utf8");

  if (!html.includes("function rnfGameVolMul")) {
    // Insert right before tone/beep/playTone that uses Web Audio gain
    if (html.includes("function tone(")) {
      html = html.replace("function tone(", HELPER + "  function tone(");
    } else if (html.includes("function beep(")) {
      html = html.replace("function beep(", HELPER + "  function beep(");
    } else if (html.includes("function playTone(")) {
      html = html.replace("function playTone(", HELPER + "  function playTone(");
    } else {
      console.log("no tone fn", slug);
      continue;
    }
  }

  // Ensure gain multiply
  if (!html.includes("* rnfGameVolMul()")) {
    html = html.replace(
      /g\.gain\.setValueAtTime\(vol \|\| ([\d.]+), t0\);/g,
      "g.gain.setValueAtTime((vol || $1) * rnfGameVolMul(), t0);"
    );
  }

  html = html.replace(
    /if \(!gameSettings\.sfx\) return;/g,
    "if (!gameSettings.sfx || rnfGameVolMul() <= 0) return;"
  );

  fs.writeFileSync(f, html);
  const ok = html.includes("function rnfGameVolMul") && html.includes("* rnfGameVolMul()");
  console.log(ok ? "OK" : "PARTIAL", slug);
}
