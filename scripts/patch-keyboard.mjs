import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("public/games");
const SDK = "/sdk/rnf-game-sdk.js?v=20260715";

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

function patchCleanup(html) {
  if (html.includes("shell.detachKeyboard()")) return html;
  return html.replace(
    /function cleanup\(\) \{\r?\n  running = false;/,
    "function cleanup() {\n  shell.detachKeyboard();\n  running = false;"
  );
}

function patchStartGeneric(html) {
  if (html.includes("shell.attachKeyboard")) return html;
  return html.replace(
    /running = true;\r?\n/,
    "running = true;\n  keys = {};\n  shell.attachKeyboard(keys);\n",
    1
  );
}

for (const slug of SLUGS) {
  const file = path.join(ROOT, slug, "index.html");
  let html = fs.readFileSync(file, "utf8");
  html = html.replace(/\/sdk\/rnf-game-sdk\.js(\?v=\d+)?/g, SDK);
  html = patchCleanup(html);

  if (slug === "void-brick-breaker") {
    if (!html.includes("shell.attachKeyboard(keys)")) {
      html = html.replace(
        /  keys = \{ left: false, right: false, fire: false \};\r?\n  paddle =/,
        "  keys = { left: false, right: false, fire: false };\n  shell.attachKeyboard(keys);\n  paddle ="
      );
      html = html.replace(
        /  shell\.canvas\.setAttribute\("tabindex", "0"\);\r?\n  shell\.canvas\.focus\(\);\r?\n  bindInput\(\);/,
        "  window.addEventListener(\"keydown\", onKey, true);\n  window.addEventListener(\"keyup\", onKeyUp, true);\n  bindInput();"
      );
      html = html.replace(
        /function bindInput\(\) \{\r?\n  window\.addEventListener\("keydown", onKey, true\);\r?\n  window\.addEventListener\("keyup", onKeyUp, true\);\r?\n  shell\.canvas\.addEventListener\("pointermove", onPointerMove\);/,
        'function bindInput() {\n  shell.canvas.addEventListener("pointermove", onPointerMove);'
      );
      html = html.replace(
        /  window\.removeEventListener\("keydown", onKey, true\);\r?\n  window\.removeEventListener\("keyup", onKeyUp, true\);\r?\n  if \(shell && shell\.canvas\)/,
        "  window.removeEventListener(\"keydown\", onKey, true);\n  window.removeEventListener(\"keyup\", onKeyUp, true);\n  if (shell && shell.canvas)"
      );
      html = html.replace(
        /function onKey\(e\) \{\r?\n  if \(!running\) return;\r?\n  keys\[e\.code\] = true;/,
        "function onKey(e) {\n  if (!running) return;\n  keys[e.code] = true;"
      );
    }
  } else if (slug === "quantum-tic-tac-toe" || slug === "memory-matrix-glitch") {
    if (!html.includes("shell.attachKeyboard")) {
      html = html.replace(
        /  running = true;\r?\n  shell\.canvas\.addEventListener\("click"/,
        "  running = true;\n  shell.attachKeyboard({});\n  shell.canvas.addEventListener(\"click\""
      );
    }
  } else if (slug === "cyber-bubble-pop") {
    if (!html.includes("onKeyDown")) {
      html = html.replace(
        /function onKey\(e\) \{\r?\n  if \(gameEnded \|\| animating\) return;[\s\S]*?\}\r?\n\r?\nfunction makeBubble/,
        `var keys = {};
function onKeyDown(e) {
  if (gameEnded || animating) return;
  keys[e.code] = true;
  if ((e.key === " " || e.code === "Space") && !e.repeat) { e.preventDefault(); shoot(); }
}
function onKeyUp(e) { keys[e.code] = false; }

function makeBubble`
      );
      html = html.replace(
        /  window\.removeEventListener\("keydown", onKey\);/,
        `  window.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("keyup", onKeyUp);`
      );
      html = html.replace(
        /  window\.addEventListener\("keydown", onKey\);/,
        `  keys = {};
  shell.attachKeyboard(keys);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);`
      );
      html = html.replace(
        /  updateProjectile\(\);\r?\n  particles\.update\(dt\);/,
        `  if (keys["ArrowLeft"]) aimAngle -= 1.6 * frameDt * speedScale;
  if (keys["ArrowRight"]) aimAngle += 1.6 * frameDt * speedScale;
  aimAngle = Math.max(-1.2, Math.min(1.2, aimAngle));
  updateProjectile();
  particles.update(dt);`
      );
    }
  } else {
    html = patchStartGeneric(html);
  }

  if (slug === "neon-snake-extreme" && !html.includes("maxSteps")) {
    html = html.replace(
      /  moveTimer \+= dt \* timeScale;\r?\n  while \(moveTimer >= speed\) \{/,
      `  moveTimer += dt * timeScale;
  if (moveTimer > speed * 2) moveTimer = speed * 2;
  var maxSteps = 2;
  while (moveTimer >= speed && maxSteps-- > 0) {`
    );
  }

  fs.writeFileSync(file, html, "utf8");
  console.log(slug + ": ok");
}
