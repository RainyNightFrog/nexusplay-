import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

// fmt i18n
const msgDir = path.join(root, "messages");
for (const file of fs.readdirSync(msgDir).filter((f) => f.endsWith(".json"))) {
  const f = path.join(msgDir, file);
  let j = fs.readFileSync(f, "utf8");
  const before = j;
  j = j.replace(
    /"gameVolumeUnmute": ("[^"]*"),"embed"/,
    '"gameVolumeUnmute": $1,\n    "embed"'
  );
  if (j !== before) {
    JSON.parse(j);
    fs.writeFileSync(f, j);
    console.log("fmt", file);
  }
}

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
  h = h.replace(
    /rnf-phaser-arcade-suite\.js\?v=[^\s"]+/g,
    "rnf-phaser-arcade-suite.js?v=20260731f"
  );
  h = h.replace(/rnf-game-sdk\.js\?v=[^\s"]+/g, "rnf-game-sdk.js?v=20260731e");
  fs.writeFileSync(f, h);
  console.log("suite", s);
}
