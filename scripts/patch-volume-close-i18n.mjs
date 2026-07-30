import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "messages");
const labels = {
  "zh-HK": "關閉音量",
  "zh-CN": "关闭音量",
  en: "Close volume",
  es: "Cerrar volumen",
  ja: "音量を閉じる",
  ko: "볼륨 닫기",
  fr: "Fermer le volume",
  de: "Lautstärke schließen",
  pt: "Fechar volume",
  th: "ปิดระดับเสียง",
  vi: "Đóng âm lượng",
};

for (const [loc, text] of Object.entries(labels)) {
  const f = path.join(dir, `${loc}.json`);
  let j = fs.readFileSync(f, "utf8");
  if (j.includes('"gameVolumeClose"')) {
    console.log("skip", loc);
    continue;
  }
  j = j.replace(
    /("gameVolumeUnmute"\s*:\s*"[^"]*")\s*,?/,
    `$1,\n    "gameVolumeClose": ${JSON.stringify(text)},`
  );
  JSON.parse(j);
  fs.writeFileSync(f, j);
  console.log("ok", loc);
}
