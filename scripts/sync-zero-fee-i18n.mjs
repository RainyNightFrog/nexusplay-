import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const dir = resolve(process.cwd(), "messages");
const en = JSON.parse(readFileSync(resolve(dir, "en.json"), "utf8"));

const dashboardKeys = {};
for (const key of Object.keys(en.dashboard)) {
  if (key.startsWith("tipsFee") || key === "revenueMockDataNote") {
    dashboardKeys[key] = en.dashboard[key];
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
  data.dashboard = { ...data.dashboard, ...dashboardKeys };
  data.legal = {
    ...data.legal,
    draftNotice: en.legal.draftNotice,
    paymentsP2: en.legal.paymentsP2,
    paymentsP4: en.legal.paymentsP4,
    paymentsP7: en.legal.paymentsP7,
  };
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(`✓ ${locale}.json`);
}
