import { execSync } from "node:child_process";

const url = "http://localhost:3000/auth/setup-google";

try {
  execSync(`start "" "${url}"`, { stdio: "ignore", shell: true });
  console.log(`已開啟設定頁：${url}`);
  console.log("若 dev server 未啟動，請先執行 npm run dev");
} catch {
  console.log(`請手動開啟：${url}`);
}
