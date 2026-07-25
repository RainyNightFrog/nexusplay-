import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.name.endsWith(".html")) acc.push(full);
  }
  return acc;
}

const files = [
  ...walk(path.join(root, "public", "games")),
  ...walk(path.join(root, "public", "demos")),
];

let updated = 0;
for (const file of files) {
  let content = fs.readFileSync(file, "utf8");
  const original = content;
  content = content.replace(/\?v=20260723[a-z]/g, "?v=20260725a");
  content = content.replace(
    /demo-game-enhance\.js(?!\?)/g,
    "demo-game-enhance.js?v=20260725a"
  );
  if (content !== original) {
    fs.writeFileSync(file, content);
    updated += 1;
    console.log("updated", path.relative(root, file));
  }
}
console.log("updated_count", updated);
