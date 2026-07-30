import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "games");
const NEED_PHYSICS = [
  "void-brick-breaker",
  "overdrive-cyber-pong",
  "galactic-invader-2026",
  "rainy-frog-dash",
  "cyber-neon-runner",
];

const PHYSICS = `    physics: {
      default: "arcade",
      arcade: { gravity: { y: 0 }, debug: false }
    },
`;

for (const slug of NEED_PHYSICS) {
  const f = path.join(root, slug, "index.html");
  let html = fs.readFileSync(f, "utf8");
  if (/var config = \{[\s\S]*?physics:\s*\{/.test(html.slice(html.lastIndexOf("var config = {")))) {
    console.log("has", slug);
    continue;
  }
  // Insert physics before scale in last config
  const idx = html.lastIndexOf("  var config = {");
  const head = html.slice(0, idx);
  let tail = html.slice(idx);
  if (!tail.includes("scale: {")) {
    console.log("no scale", slug);
    continue;
  }
  tail = tail.replace(
    /(\n    scale: \{)/,
    "\n" + PHYSICS + "$1"
  );
  // rainy-frog needs gravity - scene sets it at runtime, y:0 default is fine
  fs.writeFileSync(f, head + tail);
  console.log("added physics", slug);
}
