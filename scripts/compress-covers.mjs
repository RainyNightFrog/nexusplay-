import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "..", "public", "covers");
const files = fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".png"));

let before = 0;
let after = 0;

for (const file of files) {
  const src = path.join(dir, file);
  const dest = path.join(dir, file.slice(0, -4) + ".webp");
  before += fs.statSync(src).size;
  await sharp(src)
    .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 78, effort: 4 })
    .toFile(dest);
  const size = fs.statSync(dest).size;
  after += size;
  console.log(`${file} -> ${path.basename(dest)} ${Math.round(size / 1024)}KB`);
}

console.log(`TOTAL_BEFORE_MB ${(before / 1e6).toFixed(2)}`);
console.log(`TOTAL_AFTER_MB ${(after / 1e6).toFixed(2)}`);
