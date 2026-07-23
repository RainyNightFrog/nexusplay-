import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packsPath = path.join(__dirname, "..", "public", "sdk", "rnf-demo-packs.js");
const snippetPath = path.join(__dirname, "..", "public", "sdk", "_void-relay-pack-snippet.json");

const pack = JSON.parse(fs.readFileSync(snippetPath, "utf8"));

function jsString(s) {
  return JSON.stringify(s);
}

function emitObj(obj, indent) {
  const pad = "  ".repeat(indent);
  const lines = ["{"];
  const keys = Object.keys(obj);
  keys.forEach((key, i) => {
    const val = obj[key];
    const comma = i < keys.length - 1 ? "," : "";
    if (val && typeof val === "object" && !Array.isArray(val)) {
      lines.push(pad + "  " + jsString(key) + ": " + emitObj(val, indent + 1) + comma);
    } else if (Array.isArray(val)) {
      lines.push(pad + "  " + jsString(key) + ": " + JSON.stringify(val) + comma);
    } else {
      lines.push(pad + "  " + jsString(key) + ": " + jsString(val) + comma);
    }
  });
  lines.push(pad + "}");
  return lines.join("\n");
}

const block =
  '  "void-relay": {\n' +
  '    "en": ' +
  emitObj(pack.en, 2).replace(/^/gm, "    ").trim() +
  ",\n" +
  '    "es": ' +
  emitObj(pack.es, 2).replace(/^/gm, "    ").trim() +
  ",\n" +
  '    "zh-CN": ' +
  emitObj(pack["zh-CN"], 2).replace(/^/gm, "    ").trim() +
  "\n  }";

let src = fs.readFileSync(packsPath, "utf8");
const marker = "\n  }\n};\n  global.RNF_DEMO_BRIDGE";
if (!src.includes(marker)) throw new Error("marker not found");
if (src.includes('"void-relay"')) throw new Error("void-relay already exists");

src = src.replace(marker, ",\n" + block + marker);
fs.writeFileSync(packsPath, src, "utf8");
console.log("Inserted void-relay into rnf-demo-packs.js");
