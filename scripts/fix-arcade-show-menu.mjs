/**
 * 把 setShowMenuHandler 移到 Phaser.Game try/catch 之後，避免 WEBGL 失敗分支漏註冊
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

const HANDLER = `  window.__RNF_ARCADE_GAME__ = window.__RNF_ARCADE_GAME__ || (typeof Phaser !== "undefined" && Phaser.GAMES && Phaser.GAMES[0]) || null;
  if (typeof RNF !== "undefined" && RNF.setShowMenuHandler) {
    RNF.setShowMenuHandler(function () {
      try {
        var g = window.__RNF_ARCADE_GAME__;
        if (!g) {
          var keys = Object.keys(window);
          for (var i = 0; i < keys.length; i++) {
            var k = keys[i];
            if (k.indexOf("__") !== 0) continue;
            var v = window[k];
            if (v && v.scene && v.canvas && typeof v.scene.start === "function") { g = v; break; }
          }
        }
        if (!g || !g.scene) return;
        ["GameOverModal", "SettingsScene", "LeaderboardScene", "DifficultyScene", "GameScene"].forEach(function (key) {
          try { if (g.scene.getScene(key)) g.scene.stop(key); } catch (_s) {}
        });
        g.scene.start("MainMenuScene");
      } catch (_e) {}
    });
  }
`;

for (const slug of SLUGS) {
  const f = path.join(root, slug, "index.html");
  let html = fs.readFileSync(f, "utf8");

  // Remove previously injected handler blocks inside try/catch
  html = html.replace(
    /\n\s*window\.__RNF_ARCADE_GAME__ = window\.__RNF_ARCADE_GAME__ \|\| window\.__[A-Z0-9_]+__;\s*\n\s*if \(typeof RNF !== "undefined" && RNF\.setShowMenuHandler\) \{[\s\S]*?\n\s*\}\s*\n/g,
    "\n"
  );
  html = html.replace(
    /\n\s*window\.__RNF_ARCADE_GAME__ = window\.__[A-Z0-9_]+__;\s*\n/g,
    "\n"
  );

  // After try/catch that creates Phaser.Game, before closing IIFE
  if (!html.includes("RNF.setShowMenuHandler")) {
    html = html.replace(
      /(\} catch \(_e\) \{[\s\S]*?new Phaser\.Game\(config\);\s*\n\s*\}\n)/,
      `$1${HANDLER}`
    );
  }

  // Set __RNF_ARCADE_GAME__ on both assigns
  html = html.replace(
    /(window\.(__[A-Z0-9_]+__)\s*=\s*new Phaser\.Game\(config\);)/g,
    "$1\n    window.__RNF_ARCADE_GAME__ = window.$2;"
  );

  // Ensure handler once before IIFE end
  if ((html.match(/RNF\.setShowMenuHandler/g) || []).length === 0) {
    html = html.replace(/\n\}\)\(\);\s*\n<\/script>/, `\n${HANDLER}\n})();\n</script>`);
  }

  fs.writeFileSync(f, html);
  const n = (html.match(/RNF\.setShowMenuHandler/g) || []).length;
  console.log(slug, "handlers=", n);
}
