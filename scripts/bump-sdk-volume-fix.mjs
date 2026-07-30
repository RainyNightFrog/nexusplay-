import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const suite = [
  "cyber-blade-dash",
  "cyber-rogue-dungeon",
  "void-rhythm-beat",
  "astro-gravity-runner",
  "neon-pinball-frenzy",
];
for (const s of suite) {
  const f = path.join(root, "public", "games", s, "index.html");
  let h = fs.readFileSync(f, "utf8");
  h = h.replace(/rnf-game-sdk\.js\?v=[^\s"]+/g, "rnf-game-sdk.js?v=20260731f");
  h = h.replace(
    /rnf-phaser-arcade-suite\.js\?v=[^\s"]+/g,
    "rnf-phaser-arcade-suite.js?v=20260731g"
  );
  fs.writeFileSync(f, h);
  console.log("suite", s);
}

const demoDir = path.join(root, "public", "demos");
for (const d of fs.readdirSync(demoDir).filter((f) => f.endsWith("-preview.html"))) {
  const f = path.join(demoDir, d);
  let h = fs.readFileSync(f, "utf8");
  const n = h.replace(
    /platform-bridge\.js\?v=[^\s"]+/g,
    "platform-bridge.js?v=20260731f"
  );
  if (n !== h) {
    fs.writeFileSync(f, n);
    console.log("demo", d);
  }
}
