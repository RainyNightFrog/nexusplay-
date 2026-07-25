import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL", msg);
    process.exit(1);
  }
  console.log("OK", msg);
}

const sdk = fs.readFileSync(path.join(root, "public/sdk/rnf-game-sdk.js"), "utf8");
assert(sdk.includes("preferLowQuality"), "sdk preferLowQuality");
assert(sdk.includes("qualityUserChosen"), "sdk qualityUserChosen");
assert(sdk.includes("(pointer:coarse)"), "sdk coarse media");

const demo = fs.readFileSync(
  path.join(root, "public/demos/demo-game-enhance.js"),
  "utf8"
);
assert(demo.includes("isCoarsePointer ? 1"), "demo MAX_DPR");
assert(demo.includes("rnf-demo-mobile-perf"), "demo mobile css");
assert(demo.includes("MAX_PARTICLES = isCoarsePointer ? 48"), "demo particles");

const cfg = fs.readFileSync(path.join(root, "next.config.ts"), "utf8");
assert(cfg.includes('formats: ["image/avif", "image/webp"]'), "next formats");
assert(cfg.includes("stale-while-revalidate"), "cache headers");
assert(cfg.includes("/covers/:name.png"), "png rewrite");

const cat = fs.readFileSync(path.join(root, "lib/platform-catalog.ts"), "utf8");
assert(!cat.includes("-cover.png"), "catalog no png covers");
assert(cat.includes("-cover.webp"), "catalog webp");

for (const hook of [
  "hooks/use-chat-messages.ts",
  "hooks/use-player-dm.ts",
  "hooks/use-chat-contacts-unread.ts",
  "hooks/use-virtual-dm.ts",
  "hooks/use-admin-support-chat.ts",
]) {
  const src = fs.readFileSync(path.join(root, hook), "utf8");
  assert(src.includes("useVisibleInterval"), `${hook} visibility`);
}

const covers = fs.readdirSync(path.join(root, "public/covers"));
assert(covers.every((f) => f.endsWith(".webp")), "all covers webp");
assert(covers.length === 21, "21 covers");

const arcade = [
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
for (const slug of arcade) {
  const html = fs.readFileSync(
    path.join(root, `public/games/${slug}/index.html`),
    "utf8"
  );
  assert(html.includes("rnf-game-sdk.js?v=20260725b"), `${slug} sdk cache bust`);
  assert(
    fs.existsSync(path.join(root, `public/covers/${slug}-cover.webp`)),
    `${slug} cover exists`
  );
}

const demos = [
  "core-defense",
  "cyber-fortune",
  "pulse-protocol",
  "neon-abyss-runner",
  "signal-breach",
  "void-relay",
  "orbital-salvage",
  "void-gacha",
];
for (const slug of demos) {
  const html = fs.readFileSync(
    path.join(root, `public/demos/${slug}-preview.html`),
    "utf8"
  );
  if (slug !== "void-gacha") {
    assert(
      html.includes("demo-game-enhance.js?v=20260725a"),
      `${slug} enhance cache bust`
    );
  }
}

console.log("STATIC_CHECKS_PASSED");
