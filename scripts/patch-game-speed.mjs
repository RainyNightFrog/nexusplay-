import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("public/games");
const SDK = "/sdk/rnf-game-sdk.js?v=20260723c";
const SDK_SRC_RE = /\/sdk\/rnf-game-sdk\.js(\?v=[A-Za-z0-9]+)?/g;

const patches = {
  "cyber-bubble-pop": [
    [
      /var animId = null, running = false, gameEnded = false;/,
      "var animId = null, running = false, gameEnded = false, speedScale = 1, frameDt = 0.016;",
    ],
    [
      /function startGame\(\) \{\r?\n  cleanup\(\);/,
      "function startGame() {\n  cleanup();\n  speedScale = shell.getSpeedScale();",
    ],
    [
      /projectile = \{ x: sx, y: sy, vx: dx \* 14, vy: dy \* 14,/,
      "projectile = { x: sx, y: sy, vx: dx * 380 * speedScale, vy: dy * 380 * speedScale,",
    ],
    [
      /  f\.x \+= f\.vx;\r?\n  f\.y \+= f\.vy;/,
      "  f.x += f.vx * frameDt;\n  f.y += f.vy * frameDt;",
    ],
    [
      /  falling\.forEach\(function \(f\) \{\r?\n    f\.vy \+= 0\.4;\r?\n    f\.y \+= f\.vy;/,
      "  falling.forEach(function (f) {\n    f.vy += 280 * frameDt;\n    f.y += f.vy * frameDt;",
    ],
    [
      /  var dt = Math\.min\(0\.05, \(ts - lastTs\) \/ 1000\);\r?\n  lastTs = ts;/,
      "  var dt = Math.min(0.05, (ts - lastTs) / 1000);\n  lastTs = ts;\n  frameDt = dt;",
    ],
  ],
  "rainy-frog-dash": [
    [
      /var animId = null, running = false, gameEnded = false, keys = \{\};/,
      "var animId = null, running = false, gameEnded = false, keys = {}, speedScale = 1;",
    ],
    [
      /function startGame\(\) \{\r?\n  cleanup\(\);/,
      "function startGame() {\n  cleanup();\n  speedScale = shell.getSpeedScale();",
    ],
    [/  speed = 4;/, "  speed = 2.4 * speedScale;"],
    [
      /  scrollX \+= curSpeed \* dt \* 10;/,
      "  scrollX += curSpeed * dt * 6;",
    ],
    [/  frog\.vy \+= 0\.55;\r?\n  if \(keys\["Space"\]/, '  frog.vy += 920 * dt;\n  if (keys["Space"]'],
    [/  frog\.y \+= frog\.vy;/, "  frog.y += frog.vy * dt;"],
    [/    o\.x -= curSpeed;/, "    o.x -= curSpeed * 58 * dt;"],
    [/    p\.x -= curSpeed;/, "    p.x -= curSpeed * 58 * dt;"],
    [/    r\.x -= curSpeed \* 0\.3;/, "    r.x -= curSpeed * 0.3 * 58 * dt;"],
  ],
  "neon-snake-extreme": [
    [
      /var bulletTime, nearMiss, tickAcc, baseSpeed, moveTimer, gameEnded;/,
      "var bulletTime, nearMiss, tickAcc, baseSpeed, moveTimer, gameEnded, speedScale = 1;",
    ],
    [
      /function startGame\(isRetry\) \{\r?\n  cleanup\(\);/,
      "function startGame(isRetry) {\n  cleanup();\n  speedScale = shell.getSpeedScale();",
    ],
    [
      /  baseSpeed = 0\.12;/,
      "  baseSpeed = 0.18 / speedScale;",
    ],
  ],
  "neon-tetromino-rush": [
    [
      /var board, score, level, lines, piece, next, hold, canHold, dropTimer, dropInterval;/,
      "var board, score, level, lines, piece, next, hold, canHold, dropTimer, dropInterval, speedScale = 1;",
    ],
    [
      /function startGame\(\) \{\r?\n  cleanup\(\);/,
      "function startGame() {\n  cleanup();\n  speedScale = shell.getSpeedScale();",
    ],
    [/  dropInterval = 800;/, "  dropInterval = Math.round(920 / speedScale);"],
    [
      /dropInterval = Math\.max\(100, 800 - \(level - 1\) \* 60\);/,
      "dropInterval = Math.max(140, Math.round((920 - (level - 1) * 55) / speedScale));",
    ],
  ],
  "galactic-invader-2026": [
    [
      /var loopId, lastT, running, keys = \{\};/,
      "var loopId, lastT, running, keys = {}, speedScale = 1;",
    ],
    [
      /function startGame\(\) \{\r?\n  cleanup\(\);/,
      "function startGame() {\n  cleanup();\n  speedScale = shell.getSpeedScale();",
    ],
    [
      /player = \{ x: 480, y: 460, w: 36, h: 28, speed: 280 \};/,
      "player = { x: 480, y: 460, w: 36, h: 28, speed: 220 * speedScale };",
    ],
    [
      /    if \(moveTimer > 0\.6\) \{/,
      "    if (moveTimer > 0.72 / speedScale) {",
    ],
    [
      /        e\.x \+= enemyDir \* 18;/,
      "        e.x += enemyDir * 14 * speedScale;",
    ],
    [
      /        enemies\.forEach\(function \(e\) \{ e\.y \+= 24; if \(e\.y > 420\) hitPlayer\(\); \}\);/,
      "        enemies.forEach(function (e) { e.y += 20 * speedScale; if (e.y > 420) hitPlayer(); });",
    ],
    [
      /enemyBullets\.push\(\{ x: enemies\[Math\.floor\(Math\.random\(\) \* enemies\.length\)\]\.x, y: enemies\[0\]\.y \+ 20, vx: 0, vy: 220, r: 4 \}\);/,
      "enemyBullets.push({ x: enemies[Math.floor(Math.random() * enemies.length)].x, y: enemies[0].y + 20, vx: 0, vy: 180 * speedScale, r: 4 });",
    ],
  ],
  "cyber-neon-runner": [
    [
      /var loopId, lastT, running, keys = \{\};/,
      "var loopId, lastT, running, keys = {}, speedScale = 1;",
    ],
    [
      /function startGame\(\) \{\r?\n  cleanup\(\);/,
      "function startGame() {\n  cleanup();\n  speedScale = shell.getSpeedScale();",
    ],
    [
      /  speed = 280; score = 0; dist = 0;/,
      "  speed = 190 * speedScale; score = 0; dist = 0;",
    ],
    [
      /  speed = Math\.min\(520, 280 \+ dist \* 0\.08\);/,
      "  speed = Math.min(360 * speedScale, 190 * speedScale + dist * 0.045);",
    ],
  ],
  "overdrive-cyber-pong": [
    [
      /var ctx, particles, running, loopId, lastT, keys = \{\};/,
      "var ctx, particles, running, loopId, lastT, keys = {}, speedScale = 1;",
    ],
    [
      /function startGame\(\) \{\r?\n  cleanup\(\);/,
      "function startGame() {\n  cleanup();\n  speedScale = shell.getSpeedScale();",
    ],
    [
      /    x: 480, y: 260, vx: dir \* 320, vy: \(Math\.random\(\) - 0\.5\) \* 200,/,
      "    x: 480, y: 260, vx: dir * 260 * speedScale, vy: (Math.random() - 0.5) * 160 * speedScale,",
    ],
    [
      /  var spd = diff === "hard" \? 340 : 210;/,
      "  var spd = (diff === \"hard\" ? 300 : 190) * speedScale;",
    ],
    [
      /    if \(keys\["KeyW"\]\) left\.y -= 360 \* dt;\r?\n    if \(keys\["KeyS"\]\) left\.y \+= 360 \* dt;\r?\n    if \(keys\["ArrowUp"\]\) right\.y -= 360 \* dt;\r?\n    if \(keys\["ArrowDown"\]\) right\.y \+= 360 \* dt;/,
      "    if (keys[\"KeyW\"]) left.y -= 320 * speedScale * dt;\n    if (keys[\"KeyS\"]) left.y += 320 * speedScale * dt;\n    if (keys[\"ArrowUp\"]) right.y -= 320 * speedScale * dt;\n    if (keys[\"ArrowDown\"]) right.y += 320 * speedScale * dt;",
    ],
    [
      /    if \(keys\["KeyW"\]\) left\.y -= 360 \* dt;\r?\n    if \(keys\["KeyS"\]\) left\.y \+= 360 \* dt;\r?\n    aiMove\(right, mode\);/,
      "    if (keys[\"KeyW\"]) left.y -= 320 * speedScale * dt;\n    if (keys[\"KeyS\"]) left.y += 320 * speedScale * dt;\n    aiMove(right, mode);",
    ],
  ],
  "memory-matrix-glitch": [
    [
      /var loopId, lastT, running, keys = \{\};/,
      "var loopId, lastT, running, keys = {}, speedScale = 1;",
    ],
    [
      /function startGame\(\) \{\r?\n  cleanup\(\);/,
      "function startGame() {\n  cleanup();\n  speedScale = shell.getSpeedScale();",
    ],
    [
      /  timeLeft -= dt;/,
      "  timeLeft -= dt * speedScale;",
    ],
  ],
  "quantum-tic-tac-toe": [
    [
      /var animId = null, running = false, gameEnded = false;/,
      "var animId = null, running = false, gameEnded = false, speedScale = 1;",
    ],
    [
      /function startGame\(\) \{\r?\n  cleanup\(\);/,
      "function startGame() {\n  cleanup();\n  speedScale = shell.getSpeedScale();",
    ],
    [
      /    timer -= dt;/,
      "    timer -= dt * speedScale;",
    ],
  ],
};

for (const [slug, rules] of Object.entries(patches)) {
  const file = path.join(ROOT, slug, "index.html");
  let html = fs.readFileSync(file, "utf8");
  html = html.replace(SDK_SRC_RE, SDK);
  let changed = 0;
  for (const [re, rep] of rules) {
    const before = html;
    html = html.replace(re, rep);
    if (html !== before) changed++;
  }
  fs.writeFileSync(file, html, "utf8");
  console.log(`${slug}: ${changed}/${rules.length} rules applied`);
}

// void-brick-breaker SDK bump only
const brick = path.join(ROOT, "void-brick-breaker", "index.html");
let brickHtml = fs.readFileSync(brick, "utf8");
brickHtml = brickHtml.replace(SDK_SRC_RE, SDK);
fs.writeFileSync(brick, brickHtml, "utf8");
console.log("void-brick-breaker: sdk bumped");
