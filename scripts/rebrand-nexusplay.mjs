/**
 * One-off rebrand: NexusPlay → RainyNightFrog
 * Skips Stripe metadata keys, Vercel project slug, legacy embed IDs, CSS classes.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  ".vercel",
]);

const SKIP_FILES = new Set([
  "package-lock.json",
  "rebrand-nexusplay.mjs",
  "rainynightfrog-embed-sdk.ts",
  "nexusplay-embed-sdk.ts",
]);

const LINE_SKIP = [
  /nexusplay_user_id/,
  /nexusplay_game_id/,
  /nexusplay_creator_id/,
  /nexusplay_payer_id/,
  /nexusplay_payout_id/,
  /--project", "nexusplay"/,
  /--project', 'nexusplay'/,
  /nexusplay-five\.vercel\.app/,
  /@nexusplay\.local/,
  /AmbientBot_NexusPlay/,
  /id="nexusplay-/,
  /id='nexusplay-/,
  /nexusplay-embed-sdk/,
  /nexusplay-scrollbar/,
  /nexus-aurora/,
  /nexus-cursor/,
  /nexus-scrollbar/,
  /--np-embed/,
  /np-embed-/,
  /\.nexus-/,
  /nexusplay-app-settings/,
  /nexusplay-search-history/,
];

function shouldProcess(filePath) {
  const rel = path.relative(ROOT, filePath).replace(/\\/g, "/");
  if (SKIP_FILES.has(path.basename(filePath))) return false;
  if (rel.includes("node_modules")) return false;
  const parts = rel.split("/");
  if (parts.some((p) => SKIP_DIRS.has(p))) return false;
  return /\.(ts|tsx|js|mjs|json|md|mdc|html|sql|css|example)$/.test(filePath);
}

function transformContent(content) {
  const lines = content.split("\n");
  const out = lines.map((line) => {
    if (LINE_SKIP.some((re) => re.test(line))) return line;
    return line
      .replaceAll("NexusPlay", "RainyNightFrog")
      .replaceAll("NEXUSPLAY", "RAINYNIGHTFROG");
  });
  return out.join("\n");
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(full, files);
    } else if (shouldProcess(full)) {
      files.push(full);
    }
  }
  return files;
}

let changed = 0;
for (const file of walk(ROOT)) {
  const before = fs.readFileSync(file, "utf8");
  if (!before.includes("NexusPlay") && !before.includes("NEXUSPLAY")) continue;
  const after = transformContent(before);
  if (after !== before) {
    fs.writeFileSync(file, after, "utf8");
    changed++;
    console.log(path.relative(ROOT, file));
  }
}
console.log(`\nUpdated ${changed} files.`);
