import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["tsx", resolve(process.cwd(), "scripts/run-chat-ambient-users.ts"), ...args],
  { stdio: "inherit", env: process.env }
);

process.exit(result.status ?? 1);
