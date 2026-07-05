import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const dir = resolve(process.cwd(), "messages");
const en = JSON.parse(readFileSync(resolve(dir, "en.json"), "utf8"));

const gameKeys = {};
for (const key of Object.keys(en.game)) {
  if (key.startsWith("tip")) {
    gameKeys[key] = en.game[key];
  }
}

for (const locale of [
  "zh-CN",
  "es",
  "fr",
  "de",
  "pt",
  "th",
  "vi",
  "ko",
  "ja",
]) {
  const filePath = resolve(dir, `${locale}.json`);
  const data = JSON.parse(readFileSync(filePath, "utf8"));
  data.game = { ...data.game, ...gameKeys };
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(`✓ ${locale}.json`);
}
