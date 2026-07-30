import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "messages");
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  const f = path.join(dir, file);
  let j = fs.readFileSync(f, "utf8");
  const before = j;
  j = j.replace(
    /"gameVolumeUnmute": ("[^"]*"),"embed"/,
    '"gameVolumeUnmute": $1,\n    "embed"'
  );
  if (j !== before) {
    JSON.parse(j);
    fs.writeFileSync(f, j);
    console.log("fmt", file);
  }
}
