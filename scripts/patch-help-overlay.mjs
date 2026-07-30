/**
 * 1) 街機 HTML 注入 help 腳本
 * 2) 操作說明改呼叫 RNFPhaserHelp.showHelpOverlay
 * 3) suite 同步修改（另檔已手動改也可）
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

const HELP_SCRIPT =
  '  <script src="/games/_shared/rnf-phaser-help.js?v=20260731d"></script>\n';

function injectScript(html) {
  if (html.includes("rnf-phaser-help.js")) return html;
  if (html.includes("rnf-phaser-leaderboard.js")) {
    return html.replace(
      /(<script src="\/games\/_shared\/rnf-phaser-leaderboard\.js[^"]*"><\/script>\s*\n)/,
      "$1" + HELP_SCRIPT
    );
  }
  return html.replace(
    /(<script src="\/sdk\/rnf-game-sdk\.js[^"]*"><\/script>\s*\n)/,
    "$1" + HELP_SCRIPT
  );
}

function patchHelpButton(html) {
  // Match the whole 操作說明 makeButton block with inline helpTxt
  const re =
    /makeButton\(this, W \/ 2, (\d+), "操作說明", 0x64748b, function \(\) \{\s*if \(self\.helpTxt\) return;\s*self\.helpTxt = self\.add\.text\(W \/ 2, \d+,\s*"([^"]*)", \{[\s\S]*?\}\)\.setOrigin\(0\.5\)\.setAlpha\(0\);\s*(?:self|this)\.tweens\.add\(\{ targets: self\.helpTxt, alpha: 1, y: \d+, duration: 280, ease: "Cubic\.easeOut" \}\);\s*\},?\s*\d*\);/g;

  return html.replace(re, function (_m, btnY, helpText) {
    return (
      'makeButton(this, W / 2, ' +
      btnY +
      ', "操作說明", 0x64748b, function () {\n' +
      "        if (window.RNFPhaserHelp && RNFPhaserHelp.showHelpOverlay) {\n" +
      '          RNFPhaserHelp.showHelpOverlay(self, "' +
      helpText.replace(/\\/g, "\\\\") +
      '", { W: W, H: H });\n' +
      "        }\n" +
      "      }, 240);"
    );
  });
}

let n = 0;
for (const slug of SLUGS) {
  const f = path.join(root, slug, "index.html");
  let html = fs.readFileSync(f, "utf8");
  const before = html;
  html = injectScript(html);
  html = patchHelpButton(html);
  if (html === before) {
    console.log("NOCHANGE", slug);
    // debug: show if pattern exists
    if (html.includes("操作說明") && html.includes("helpTxt")) {
      console.log("  still has helpTxt — pattern miss");
    }
  } else {
    fs.writeFileSync(f, html);
    console.log("OK", slug);
    n++;
  }
}
console.log("patched", n);
