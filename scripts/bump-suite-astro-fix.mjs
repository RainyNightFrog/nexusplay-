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
const ver = "20260731o";
for (const s of suite) {
  const f = path.join(root, "public", "games", s, "index.html");
  let h = fs.readFileSync(f, "utf8");
  h = h.replace(
    /rnf-phaser-arcade-suite\.js\?v=[^\s"]+/g,
    "rnf-phaser-arcade-suite.js?v=" + ver
  );
  fs.writeFileSync(f, h);
  console.log(s);
}
