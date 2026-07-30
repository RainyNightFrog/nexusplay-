import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith(".html")) acc.push(p);
  }
  return acc;
}

let n = 0;
for (const f of walk(path.join(root, "games")).concat(walk(path.join(root, "demos")))) {
  let h = fs.readFileSync(f, "utf8");
  const o = h;
  h = h.replace(/rnf-game-sdk\.js\?v=[^"]+/g, "rnf-game-sdk.js?v=20260731b");
  h = h.replace(/rnf-demo-phaser-kit\.js\?v=[^"]+/g, "rnf-demo-phaser-kit.js?v=20260731b");
  if (h !== o) {
    fs.writeFileSync(f, h);
    n++;
    console.log("bump", path.relative(root, f));
  }
}
console.log("bumped", n);
