/**
 * 為街機 10 款注入獨立排行榜場景／選單按鈕
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const gamesRoot = path.join(__dirname, "..", "public", "games");

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

const SCRIPT_TAG =
  '  <script src="/games/_shared/rnf-phaser-leaderboard.js?v=20260731b"></script>\n';

const LB_SCENE_SNIPPET = `
  /* ═══════════════ LeaderboardScene（本遊戲獨立排行榜） ═══════════════ */
  var LeaderboardScene = (window.RNFPhaserLeaderboard && RNFPhaserLeaderboard.createLeaderboardScene)
    ? RNFPhaserLeaderboard.createLeaderboardScene({
        Phaser: Phaser,
        makeButton: makeButton,
        W: W,
        H: H,
        accent: 0x22d3ee,
        returnScene: "MainMenuScene",
        getDefaultDiff: function () {
          return (typeof selectedDiff !== "undefined" && selectedDiff) ? selectedDiff : "standard";
        }
      })
    : class LeaderboardSceneMissing extends Phaser.Scene {
        constructor() { super("LeaderboardScene"); }
        create() {
          this.add.text(W / 2, H / 2, "排行榜模組未載入", {
            fontFamily: "Microsoft JhengHei, Segoe UI", fontSize: "18px", color: "#f472b6"
          }).setOrigin(0.5);
        }
      };
`;

function ensureScript(html) {
  if (html.includes("rnf-phaser-leaderboard.js")) return html;
  if (html.includes('src="/sdk/rnf-game-sdk.js')) {
    return html.replace(
      /(<script src="\/sdk\/rnf-game-sdk\.js[^"]*"><\/script>\s*\n)/,
      "$1" + SCRIPT_TAG
    );
  }
  return html.replace(
    /(<script src="\/sdk\/phaser\.min\.js"><\/script>\s*\n)/,
    "$1" + SCRIPT_TAG
  );
}

function ensureLbScene(html) {
  if (html.includes("LeaderboardScene（本遊戲獨立排行榜）") || html.includes("createLeaderboardScene")) {
    return html;
  }
  // Insert before GameOverModal class
  if (html.includes("class GameOverModal extends Phaser.Scene")) {
    return html.replace(
      /  (?:\/\* ═+ GameOverModal[^*]*\*\/\s*)?class GameOverModal extends Phaser\.Scene/,
      LB_SCENE_SNIPPET + "\n  class GameOverModal extends Phaser.Scene"
    );
  }
  return html;
}

function ensureMenuButton(html) {
  if (html.includes('", "排行榜"') || html.includes('"排行榜"')) {
    // might already have - check MainMenu specifically
  }
  // After SETTINGS button block, insert leaderboard button if missing in MainMenu
  if (/MainMenuScene[\s\S]*?排行榜[\s\S]*?DifficultyScene|ModeScene|SettingsScene/.test(html) &&
      html.includes('scene.start("LeaderboardScene"')) {
    return html;
  }

  // Pattern A: SETTINGS then 操作說明
  const settingsThenHelp =
    /(makeButton\(this, W \/ 2, (\d+), "設定 SETTINGS", 0xa78bfa, function \(\) \{\s*self\.scene\.launch\("SettingsScene"\);\s*\}\);)\s*(makeButton\(this, W \/ 2, (\d+), "操作說明")/;

  if (settingsThenHelp.test(html) && !html.includes('scene.start("LeaderboardScene"')) {
    return html.replace(settingsThenHelp, function (_m, settingsBtn, _y1, helpBtn, helpY) {
      const lbY = Number(helpY);
      const newHelpY = lbY + 64;
      return (
        settingsBtn +
        "\n      makeButton(this, W / 2, " +
        lbY +
        ', "排行榜", 0x34d399, function () {\n' +
        '        self.scene.start("LeaderboardScene", { difficulty: (typeof selectedDiff !== "undefined" && selectedDiff) ? selectedDiff : "standard" });\n' +
        "      });\n      " +
        helpBtn.replace(", " + helpY + ",", ", " + newHelpY + ",")
      );
    });
  }

  // Pattern B: START then SETTINGS (memory-matrix may differ)
  const startOnly =
    /(makeButton\(this, W \/ 2, 300, "開始遊戲 START"[\s\S]*?\}\);)\s*(makeButton\(this, W \/ 2, (\d+), "設定 SETTINGS")/;
  if (startOnly.test(html) && !html.includes('scene.start("LeaderboardScene"')) {
    // handled by settingsThenHelp usually
  }

  // Pattern C: only START + 操作說明 (no settings between) — insert before 操作說明
  const startHelp =
    /(makeButton\(this, W \/ 2, 300, "開始遊戲[\s\S]*?\}\);)\s*(makeButton\(this, W \/ 2, (\d+), "操作說明")/;
  if (startHelp.test(html) && !html.includes('scene.start("LeaderboardScene"') && !html.includes("設定 SETTINGS")) {
    return html.replace(startHelp, function (_m, startBtn, helpBtn, helpY) {
      const lbY = Number(helpY);
      return (
        startBtn +
        "\n      makeButton(this, W / 2, " +
        lbY +
        ', "排行榜", 0x34d399, function () {\n' +
        '        self.scene.start("LeaderboardScene", { difficulty: (typeof selectedDiff !== "undefined" && selectedDiff) ? selectedDiff : "standard" });\n' +
        "      });\n      " +
        helpBtn.replace(", " + helpY + ",", ", " + (lbY + 64) + ",")
      );
    });
  }

  return html;
}

function ensureGameOverButton(html) {
  if (html.includes('GameOverModal') && html.includes('scene.start("LeaderboardScene"') &&
      /GameOverModal[\s\S]*?排行榜[\s\S]*?主選單/.test(html)) {
    return html;
  }
  // Insert LB button before 主選單 in GameOverModal
  const overMain =
    /(makeButton\(this, W \/ 2(?:, H \/ 2 \+ \d+)?, H \/ 2 \+ \d+, "主選單"|makeButton\(this, W \/ 2, H \/ 2 \+ \d+, "主選單")/;
  // Simpler: find 主選單 button inside file after GameOverModal
  if (!html.includes("class GameOverModal")) return html;

  const marker = 'class GameOverModal extends Phaser.Scene';
  const idx = html.indexOf(marker);
  if (idx < 0) return html;
  const before = html.slice(0, idx);
  let after = html.slice(idx);
  if (after.includes('scene.start("LeaderboardScene"') && after.includes('"排行榜"')) {
    return html;
  }

  after = after.replace(
    /makeButton\(this, W \/ 2, H \/ 2 \+ (\d+), "主選單", 0x64748b, function \(\) \{/,
    function (_m, y) {
      const yNum = Number(y);
      const lbY = yNum;
      const mainY = yNum + 60;
      return (
        'makeButton(this, W / 2, H / 2 + ' +
        lbY +
        ', "排行榜", 0x34d399, function () {\n' +
        "        SFX.click();\n" +
        '        self.scene.stop("GameOverModal");\n' +
        '        self.scene.stop("SettingsScene");\n' +
        '        self.scene.stop("GameScene");\n' +
        '        self.scene.start("LeaderboardScene", { difficulty: (typeof selectedDiff !== "undefined" && selectedDiff) ? selectedDiff : "standard" });\n' +
        "      }, 200);\n\n      makeButton(this, W / 2, H / 2 + " +
        mainY +
        ', "主選單", 0x64748b, function () {'
      );
    }
  );

  return before + after;
}

function ensureSceneArray(html) {
  // Add LeaderboardScene before SettingsScene or at end of scene array
  if (/scene:\s*\[[^\]]*LeaderboardScene/.test(html)) return html;

  html = html.replace(
    /scene:\s*\[([^\]]+)\]/,
    function (_m, inner) {
      if (inner.includes("LeaderboardScene")) return _m;
      if (inner.includes("SettingsScene")) {
        return (
          "scene: [" +
          inner.replace("SettingsScene", "LeaderboardScene, SettingsScene") +
          "]"
        );
      }
      return "scene: [" + inner.trim().replace(/\s+$/, "") + ", LeaderboardScene]";
    }
  );
  return html;
}

function ensureSubmitUsesHelper(html) {
  // Prefer RNFPhaserLeaderboard.submitRun when available
  if (html.includes("RNFPhaserLeaderboard.submitRun")) return html;
  return html.replace(
    /if \(typeof RNF !== "undefined" && RNF\.submitScore\) \{\s*RNF\.submitScore\(([^;]+)\);\s*\}/g,
    'if (window.RNFPhaserLeaderboard && RNFPhaserLeaderboard.submitRun) {\n' +
      "          RNFPhaserLeaderboard.submitRun($1);\n" +
      '        } else if (typeof RNF !== "undefined" && RNF.submitScore) {\n' +
      "          RNF.submitScore($1);\n" +
      "        }"
  ).replace(
    /if \(typeof RNF !== "undefined" && RNF\.submitScore\) \{\s*RNF\.submitScore\(([^)]+)\);\s*\}/g,
    function (m) {
      if (m.includes("RNFPhaserLeaderboard")) return m;
      return m;
    }
  );
}

let ok = 0;
for (const slug of SLUGS) {
  const file = path.join(gamesRoot, slug, "index.html");
  let html = fs.readFileSync(file, "utf8");
  const before = html;
  html = ensureScript(html);
  html = ensureLbScene(html);
  html = ensureMenuButton(html);
  html = ensureGameOverButton(html);
  html = ensureSceneArray(html);
  html = ensureSubmitUsesHelper(html);
  if (html !== before) {
    fs.writeFileSync(file, html, "utf8");
    console.log("updated", slug);
    ok++;
  } else {
    console.log("unchanged", slug);
  }
}
console.log("done", ok + "/" + SLUGS.length);
