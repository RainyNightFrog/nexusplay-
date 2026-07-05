import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const dir = resolve(process.cwd(), "messages");
const en = JSON.parse(readFileSync(resolve(dir, "en.json"), "utf8"));

const dashboardKeys = {
  tipsLegalLinkPrefix: en.dashboard.tipsLegalLinkPrefix,
  tipsLegalLinkLabel: en.dashboard.tipsLegalLinkLabel,
};

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
  data.dashboard = { ...data.dashboard, ...dashboardKeys };
  data.legal = en.legal;
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(`✓ ${locale}.json`);
}
