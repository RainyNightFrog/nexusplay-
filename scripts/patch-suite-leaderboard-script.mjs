import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "games");
const suite = [
  "cyber-blade-dash",
  "neon-pinball-frenzy",
  "void-rhythm-beat",
  "astro-gravity-runner",
  "cyber-rogue-dungeon",
];

for (const s of suite) {
  const f = path.join(root, s, "index.html");
  let h = fs.readFileSync(f, "utf8");
  if (h.includes("rnf-phaser-leaderboard")) {
    console.log("already", s);
    continue;
  }
  h = h.replace(
    '<script src="/games/_shared/rnf-phaser-arcade-suite.js"></script>',
    '<script src="/games/_shared/rnf-phaser-leaderboard.js?v=20260731b"></script>\n  <script src="/games/_shared/rnf-phaser-arcade-suite.js?v=20260731b"></script>'
  );
  fs.writeFileSync(f, h);
  console.log("patched", s);
}
