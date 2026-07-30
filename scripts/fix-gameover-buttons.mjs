/**
 * 移除 GameOver 重複的「排行榜」鈕，保留：再試/排行榜/主選單 三鍵排版
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

// Duplicate block that wrongly replaced 主選單 with a second 排行榜
const DUP_VAR = /\n\s*var menu = makeButton\(this, W \/ 2 \+ 110, H \/ 2 \+ 110, "排行榜", 0x34d399, function \(\) \{[\s\S]*?\}, 200\);\n/;

const DUP_PLAIN = /\n\s*makeButton\(this, W \/ 2 \+ 110, H \/ 2 \+ 110, "排行榜", 0x34d399, function \(\) \{[\s\S]*?\}, 200\);\n/;

const ORPHAN_DEPTH = /\n\s*menu\.bg\.setDepth\(73\); menu\.txt\.setDepth\(74\);/;

for (const slug of SLUGS) {
  const f = path.join(root, slug, "index.html");
  let html = fs.readFileSync(f, "utf8");
  const before = html;

  // Ensure GameOver panel is tall enough (only replace within GameOverModal roughly by global replace of common small panels near GO - safer: replace all 480x440 etc in GO)
  html = html.replace(/rectangle\(W \/ 2, H \/ 2, 4(?:2|4|6|8)0, (?:300|360|400|420|440)\)/g, "rectangle(W / 2, H / 2, 480, 460)");

  let n = 0;
  if (DUP_VAR.test(html)) {
    html = html.replace(DUP_VAR, "\n");
    n++;
  }
  // snake-style: second plain 排行榜 with }, 200);
  // Only remove if there are 2+ 排行榜 at +110 in file after first pass
  const goIdx = html.indexOf("class GameOverModal");
  if (goIdx >= 0) {
    const go = html.slice(goIdx);
    const matches = [...go.matchAll(/makeButton\(this, W \/ 2 \+ 110, H \/ 2 \+ 110, "排行榜"/g)];
    if (matches.length >= 2) {
      // Remove the second occurrence's full makeButton call (the one ending with }, 200) preferably)
      let cut = go;
      let found = 0;
      cut = cut.replace(
        /makeButton\(this, W \/ 2 \+ 110, H \/ 2 \+ 110, "排行榜", 0x34d399, function \(\) \{[\s\S]*?\}, (?:180|200)\);/g,
        (m) => {
          found++;
          if (found === 2) {
            n++;
            return "";
          }
          return m;
        }
      );
      html = html.slice(0, goIdx) + cut;
    }
  }

  if (ORPHAN_DEPTH.test(html)) {
    // Attach depth to 主選單 button instead if we have makeButton 主選單 without depth
    html = html.replace(
      /(makeButton\(this, W \/ 2, H \/ 2 \+ 172, "主選單", 0x64748b, function \(\) \{[\s\S]*?\}, 200\);)\s*menu\.bg\.setDepth\(73\); menu\.txt\.setDepth\(74\);/,
      "var menu = $1\n      menu.bg.setDepth(73); menu.txt.setDepth(74);"
    );
    // If still orphan
    html = html.replace(ORPHAN_DEPTH, "");
  }

  if (html !== before) {
    fs.writeFileSync(f, html);
    console.log("fixed", slug, "removals~", n);
  } else {
    console.log("unchanged", slug);
  }

  // Verify
  const go2 = html.slice(html.indexOf("class GameOverModal") || 0);
  const lb = (go2.match(/"排行榜"/g) || []).length;
  const menu = (go2.match(/"主選單"/g) || []).length;
  const panel = go2.match(/rectangle\(W \/ 2, H \/ 2, (\d+), (\d+)/);
  console.log("  lb=", lb, "menu=", menu, "panel=", panel && panel.slice(1).join("x"));
}
