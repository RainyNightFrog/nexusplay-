import { execSync } from "node:child_process";

const url = "http://localhost:3000/auth/setup-twitch";

try {
  execSync(`start "" "${url}"`, { stdio: "ignore", shell: true });
  console.log(`已開啟設定頁：${url}`);
} catch {
  console.log(`請手動開啟：${url}`);
}
