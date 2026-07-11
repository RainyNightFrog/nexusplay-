/**
 * 子網域 DNS 設定（*.rainynightfrog.com → Vercel）
 *
 * 用法：
 *   npm run setup:subdomain-dns              # 列出目前 DNS 與建議紀錄
 *   npm run setup:subdomain-dns -- --apply     # 透過 Cloudflare API 新增 wildcard CNAME
 *   npm run setup:subdomain-dns -- --vercel    # 嘗試在 Vercel 專案加入 *.rainynightfrog.com
 *
 * 需要 .env.local 的 CLOUDFLARE_API_TOKEN（Zone:DNS:Edit）。
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const DOMAIN = "rainynightfrog.com";
const WILDCARD_HOST = `*.${DOMAIN}`;
/** Vercel 建議 wildcard 使用 A 記錄（與根網域相同 IP） */
const VERCEL_WILDCARD_IP = "76.76.21.21";
const VERCEL_CNAME = "cname.vercel-dns.com";

const flags = new Set(process.argv.slice(2));
const modeApply = flags.has("--apply");
const modeVercel = flags.has("--vercel");

function loadEnv() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) throw new Error(".env.local 不存在");
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return { path, env };
}

async function resolveCloudflareZoneId(token) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones?name=${DOMAIN}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const payload = await response.json();
  if (!payload.success || !payload.result?.length) {
    throw new Error("找不到 Cloudflare zone，請確認 CLOUDFLARE_API_TOKEN 權限");
  }
  return payload.result[0].id;
}

async function listCloudflareRecords(token, zoneId) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?per_page=500`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const payload = await response.json();
  if (!payload.success) throw new Error("讀取 Cloudflare DNS 失敗");
  return payload.result;
}

async function upsertWildcardRecord(token, zoneId, existing) {
  const foundA = existing.find(
    (row) =>
      row.type === "A" &&
      row.name.toLowerCase() === WILDCARD_HOST.toLowerCase()
  );
  const foundCname = existing.find(
    (row) =>
      row.type === "CNAME" &&
      row.name.toLowerCase() === WILDCARD_HOST.toLowerCase()
  );

  if (foundCname) {
    const del = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${foundCname.id}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const delPayload = await del.json();
    if (!delPayload.success) {
      throw new Error(`刪除舊 CNAME ${WILDCARD_HOST} 失敗`);
    }
    console.log(`✓ 已移除舊 CNAME ${WILDCARD_HOST}`);
  }

  const body = {
    type: "A",
    name: WILDCARD_HOST,
    content: VERCEL_WILDCARD_IP,
    ttl: 1,
    proxied: false,
  };

  const url = foundA
    ? `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${foundA.id}`
    : `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`;

  const response = await fetch(url, {
    method: foundA ? "PUT" : "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!payload.success) {
    throw new Error(
      `Cloudflare ${foundA ? "更新" : "新增"} ${WILDCARD_HOST} 失敗：${JSON.stringify(payload.errors)}`
    );
  }

  console.log(
    `✓ Cloudflare ${foundA ? "更新" : "新增"} A ${WILDCARD_HOST} → ${VERCEL_WILDCARD_IP}（DNS only）`
  );
}

function addVercelWildcardDomain() {
  console.log(`→ 在 Vercel 專案加入 ${WILDCARD_HOST} …`);
  try {
    execSync(`npx vercel domains add ${WILDCARD_HOST}`, {
      stdio: "inherit",
      shell: true,
    });
    console.log(`✓ Vercel 已加入 ${WILDCARD_HOST}`);
  } catch {
    console.log(
      `請手動到 Vercel → Project → Settings → Domains 加入：${WILDCARD_HOST}`
    );
  }
}

async function main() {
  const { env } = loadEnv();
  const cloudflareToken = env.CLOUDFLARE_API_TOKEN?.trim();

  console.log(`\n=== RainyNightFrog 子網域 DNS ===`);
  console.log(`目標：${WILDCARD_HOST} → ${VERCEL_WILDCARD_IP}（灰雲 / DNS only）\n`);

  if (!cloudflareToken) {
    console.log("未設定 CLOUDFLARE_API_TOKEN，請手動在 Cloudflare DNS 新增：");
    console.log(`  Type: A  Name: *  Target: ${VERCEL_WILDCARD_IP}  Proxy: DNS only`);
  } else {
    const zoneId = await resolveCloudflareZoneId(cloudflareToken);
    const existing = await listCloudflareRecords(cloudflareToken, zoneId);
    const wildcard = existing.find(
      (row) =>
        (row.type === "A" || row.type === "CNAME") &&
        row.name.toLowerCase() === WILDCARD_HOST.toLowerCase()
    );

    const root = existing.filter(
      (row) =>
        row.name === DOMAIN ||
        row.name === `www.${DOMAIN}` ||
        row.name === WILDCARD_HOST
    );
    for (const row of root) {
      console.log(
        `• ${row.type} ${row.name} → ${row.content}（proxied=${row.proxied}）`
      );
    }

    if (wildcard) {
      console.log(`\n✓ wildcard 記錄已存在（${wildcard.type}）`);
      if (
        wildcard.type !== "A" ||
        wildcard.content !== VERCEL_WILDCARD_IP
      ) {
        console.log(
          `  注意：目前為 ${wildcard.type} ${wildcard.content}，建議改為 A ${VERCEL_WILDCARD_IP}`
        );
      }
    } else {
      console.log(`\n尚未設定 wildcard 記錄`);
      if (modeApply) {
        await upsertWildcardRecord(cloudflareToken, zoneId, existing);
      } else {
        console.log(`執行 npm run setup:subdomain-dns -- --apply 可自動新增`);
      }
    }

    if (
      modeApply &&
      (!wildcard ||
        wildcard.type !== "A" ||
        wildcard.content !== VERCEL_WILDCARD_IP)
    ) {
      await upsertWildcardRecord(cloudflareToken, zoneId, existing);
    }
  }

  if (modeVercel) {
    addVercelWildcardDomain();
  } else {
    console.log(`\nVercel：請在專案 Domains 加入 ${WILDCARD_HOST}`);
    console.log(`或執行：npm run setup:subdomain-dns -- --vercel`);
  }

  if (!env.NEXT_PUBLIC_ROOT_DOMAIN) {
    console.log(`\n建議在 .env.local 加入：NEXT_PUBLIC_ROOT_DOMAIN=${DOMAIN}`);
  }

  console.log("\n完成後可測試：");
  console.log(`  https://void-gacha.${DOMAIN}`);
  console.log(`  https://{username}.${DOMAIN}`);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
