import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const dir = resolve(process.cwd(), "messages");
const en = JSON.parse(readFileSync(resolve(dir, "en.json"), "utf8"));
const zhHK = JSON.parse(readFileSync(resolve(dir, "zh-HK.json"), "utf8"));

function mergeMissing(target, source) {
  for (const key of Object.keys(source)) {
    if (!(key in target)) {
      target[key] = source[key];
    } else if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key])
    ) {
      if (!target[key] || typeof target[key] !== "object") {
        target[key] = {};
      }
      mergeMissing(target[key], source[key]);
    }
  }
}

// Keep en aligned with zh-HK structure (English source of truth for other locales)
mergeMissing(en, zhHK);
writeFileSync(resolve(dir, "en.json"), `${JSON.stringify(en, null, 2)}\n`, "utf8");
console.log("✓ en.json (structure sync from zh-HK)");

for (const locale of ["zh-CN", "de", "es", "fr", "ja", "ko", "pt", "th", "vi"]) {
  const filePath = resolve(dir, `${locale}.json`);
  const data = JSON.parse(readFileSync(filePath, "utf8"));
  mergeMissing(data, en);
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(`✓ ${locale}.json`);
}

console.log("Done — merged missing keys from en.json");
