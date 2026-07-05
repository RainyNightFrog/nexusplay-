import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const dir = resolve(process.cwd(), "messages");

function findDuplicateKeys(filePath) {
  const raw = readFileSync(filePath, "utf8");
  const matches = [...raw.matchAll(/^\s{2}"([^"]+)":\s*\{/gm)];
  const byKey = new Map();
  for (const match of matches) {
    const key = match[1];
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(match.index);
  }
  return [...byKey.entries()].filter(([, positions]) => positions.length > 1);
}

function deepKeys(obj, prefix = "") {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      keys.push(...deepKeys(value, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

const en = JSON.parse(readFileSync(resolve(dir, "en.json"), "utf8"));
const zhHK = JSON.parse(readFileSync(resolve(dir, "zh-HK.json"), "utf8"));
const enKeySet = new Set(deepKeys(en));
const zhKeySet = new Set(deepKeys(zhHK));
const missingInEn = [...zhKeySet].filter((k) => !enKeySet.has(k)).sort();

console.log("=== en.json duplicate top-level keys ===");
for (const [key, positions] of findDuplicateKeys(resolve(dir, "en.json"))) {
  console.log(`${key}: ${positions.length} occurrences`);
}

console.log(`\n=== Keys in zh-HK missing from en (${missingInEn.length}) ===`);
for (const key of missingInEn.slice(0, 80)) console.log(key);
if (missingInEn.length > 80) console.log(`... and ${missingInEn.length - 80} more`);

for (const locale of readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "zh-HK.json")) {
  const data = JSON.parse(readFileSync(resolve(dir, locale), "utf8"));
  const localeKeys = new Set(deepKeys(data));
  const missing = [...enKeySet].filter((k) => !localeKeys.has(k));
  if (missing.length) {
    console.log(`\n${locale}: ${missing.length} keys missing vs en`);
    for (const key of missing.slice(0, 15)) console.log(`  ${key}`);
  }
}
