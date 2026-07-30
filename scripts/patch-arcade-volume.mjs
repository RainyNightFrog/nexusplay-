/**
 * 街機 tone/beep 乘上平台主音量 __RNF_GAME_VOLUME__ / RNF.getGameVolume()
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

const HELPER = `
  function rnfGameVolMul() {
    try {
      if (typeof RNF !== "undefined" && RNF.getGameVolume) return RNF.getGameVolume();
      if (typeof window !== "undefined" && typeof window.__RNF_GAME_VOLUME__ === "number") return window.__RNF_GAME_VOLUME__;
    } catch (_e) {}
    return 1;
  }
`;

for (const slug of SLUGS) {
  const f = path.join(root, slug, "index.html");
  if (!fs.existsSync(f)) continue;
  let html = fs.readFileSync(f, "utf8");
  if (html.includes("function rnfGameVolMul")) {
    console.log("skip helper", slug);
  } else {
    // Insert helper before first tone/beep gain usage block — after ensureAudio function if present
    if (html.includes("function ensureAudio()")) {
      html = html.replace(
        /(function ensureAudio\(\) \{[\s\S]*?\n  \}\n)/,
        "$1" + HELPER
      );
    } else {
      console.log("no ensureAudio", slug);
      continue;
    }
  }

  // Multiply gain setValueAtTime(vol || X
  html = html.replace(
    /g\.gain\.setValueAtTime\(\(vol \|\| ([\d.]+)\) \* rnfGameVolMul\(\), t0\);/g,
    "g.gain.setValueAtTime((vol || $1) * rnfGameVolMul(), t0);"
  );
  html = html.replace(
    /g\.gain\.setValueAtTime\(vol \|\| ([\d.]+), t0\);/g,
    "g.gain.setValueAtTime((vol || $1) * rnfGameVolMul(), t0);"
  );

  // Early return if muted when checking gameSettings.sfx — also check volume
  html = html.replace(
    /if \(!gameSettings\.sfx\) return;/g,
    "if (!gameSettings.sfx || rnfGameVolMul() <= 0) return;"
  );

  // Bump SDK cache for volume API
  html = html.replace(
    /rnf-game-sdk\.js\?v=[^"']+/g,
    "rnf-game-sdk.js?v=20260731e"
  );

  fs.writeFileSync(f, html);
  console.log("OK", slug);
}
