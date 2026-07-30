import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "games");

const GLOBALS = {
  "neon-snake-extreme": "__NEON_SNAKE__",
  "cyber-bubble-pop": "__CYBER_BUBBLE__",
  "quantum-tic-tac-toe": "__QUANTUM_TTT__",
  "void-brick-breaker": "__VOID_BRICK__",
  "rainy-frog-dash": "__RAINY_FROG__",
  "neon-tetromino-rush": "__NEON_TETRIS__",
  "galactic-invader-2026": "__GALACTIC_INVADER__",
  "memory-matrix-glitch": "__MEMORY_MATRIX__",
  "overdrive-cyber-pong": "__OVERDRIVE_CYBER_PONG__",
  "cyber-neon-runner": "__CYBER_NEON_RUNNER__",
};

for (const [slug, gName] of Object.entries(GLOBALS)) {
  const f = path.join(root, slug, "index.html");
  let html = fs.readFileSync(f, "utf8");

  // Cut at last healthy Phaser config start
  const idx = html.lastIndexOf("  var config = {");
  if (idx < 0) {
    console.log("FAIL no config", slug);
    continue;
  }

  // Look only at a window after idx for scene list (before corruption)
  const window = html.slice(idx, idx + 1200);
  const sceneMatch = window.match(/scene:\s*\[[A-Za-z0-9_,\s]+\]/);
  if (!sceneMatch) {
    console.log("FAIL no scene", slug);
    continue;
  }

  const hasAudio = /audio:\s*\{\s*disableWebAudio:\s*false\s*\}/.test(window);
  const hasFps = /fps:\s*\{\s*target:\s*144/.test(window);
  const hasBanner = /banner:\s*false/.test(window);
  const bgMatch = window.match(/backgroundColor:\s*("[^"]+")/);
  const bg = bgMatch ? bgMatch[1] : '"#04060c"';

  const lines = [
    "    type: Phaser.WEBGL,",
    '    parent: "game-host",',
    "    width: W,",
    "    height: H,",
    `    backgroundColor: ${bg},`,
  ];
  if (hasBanner) lines.push("    banner: false,");
  if (hasAudio) lines.push("    audio: { disableWebAudio: false },");
  lines.push("    scale: {");
  lines.push("      mode: Phaser.Scale.FIT,");
  lines.push("      autoCenter: Phaser.Scale.CENTER_BOTH");
  lines.push("    },");
  if (hasFps) lines.push("    fps: { target: 144, forceSet: false, smoothStep: true },");
  lines.push(`    ${sceneMatch[0]}`);

  const before = html.slice(0, idx).replace(/\n\s*\/\/[^\n]*WEBGL[^\n]*\s*$/, "\n");

  const tail = `  var config = {
${lines.join("\n")}
  };

  try {
    window.${gName} = new Phaser.Game(config);
  } catch (_e) {
    config.type = Phaser.AUTO;
    window.${gName} = new Phaser.Game(config);
  }
  window.__RNF_ARCADE_GAME__ = window.${gName};
  if (typeof RNF !== "undefined" && RNF.setShowMenuHandler) {
    RNF.setShowMenuHandler(function () {
      try {
        var g = window.__RNF_ARCADE_GAME__ || window.${gName};
        if (!g || !g.scene) return;
        ["GameOverModal", "SettingsScene", "LeaderboardScene", "DifficultyScene", "GameScene"].forEach(function (key) {
          try { if (g.scene.getScene(key)) g.scene.stop(key); } catch (_s) {}
        });
        g.scene.start("MainMenuScene");
      } catch (_err) {}
    });
  }
})();
</script>
</body>
</html>
`;

  fs.writeFileSync(f, before + tail);
  const out = fs.readFileSync(f, "utf8");
  const handlers = (out.match(/setShowMenuHandler/g) || []).length;
  const broken = out.includes("} catch (_e) {}") && out.includes("if (!g || !g.scene) return;\n        [");
  console.log(slug, "handlers=", handlers, "ok=", handlers === 1 && out.includes(`window.${gName}`));
}
