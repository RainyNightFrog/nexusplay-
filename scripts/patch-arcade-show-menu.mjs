/**
 * 街機 10：註冊 RNF.setShowMenuHandler，確保「返回遊戲主選單」有效
 * 並 bump SDK cache
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

const HANDLER = `
  if (typeof RNF !== "undefined" && RNF.setShowMenuHandler) {
    RNF.setShowMenuHandler(function () {
      try {
        var g = window.__RNF_ARCADE_GAME__ || null;
        if (!g) {
          var keys = Object.keys(window);
          for (var i = 0; i < keys.length; i++) {
            var k = keys[i];
            if (k.indexOf("__") !== 0) continue;
            var v = window[k];
            if (v && v.scene && v.canvas && typeof v.scene.start === "function") {
              g = v;
              break;
            }
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

  html = html.replace(/rnf-game-sdk\.js\?v=[^\s"']+/g, "rnf-game-sdk.js?v=20260731f");

  if (html.includes("RNF.setShowMenuHandler")) {
    fs.writeFileSync(f, html);
    console.log("cache-only", slug);
    continue;
  }

  // After assigning window.__XXX__ = new Phaser.Game
  const re = /(window\.__[A-Z0-9_]+__\s*=\s*new Phaser\.Game\(config\);)/g;
  let count = 0;
  html = html.replace(re, (m) => {
    count++;
    if (count === 1) {
      return (
        m +
        "\n  window.__RNF_ARCADE_GAME__ = window.__RNF_ARCADE_GAME__ || " +
        m.match(/window\.__[A-Z0-9_]+__/)[0] +
        ";" +
        HANDLER
      );
    }
    return m + "\n  window.__RNF_ARCADE_GAME__ = " + m.match(/window\.__[A-Z0-9_]+__/)[0] + ";";
  });

  if (count === 0) {
    console.log("no game assign", slug);
    continue;
  }
  fs.writeFileSync(f, html);
  console.log("OK", slug, "gamesAssigns=", count);
}
