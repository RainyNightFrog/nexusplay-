/**
 * Resend 寄件網域設定（rainynightfrog.com）
 *
 * 用法：
 *   npm run setup:resend-domain              # 建立/列出 DNS 紀錄
 *   npm run setup:resend-domain -- --check     # 檢查 DNS 是否生效
 *   npm run setup:resend-domain -- --verify    # 觸發 Resend 驗證
 *   npm run setup:resend-domain -- --apply     # 驗證通過後更新 EMAIL_FROM + Vercel
 *   npm run setup:resend-domain -- --test      # 寄測試信
 *
 * 需要 RESEND_ADMIN_API_KEY（Full access）才能建立/驗證網域。
 * 現有的 RESEND_API_KEY（Sending access）僅用於寄信。
 * 可選 CLOUDFLARE_API_TOKEN 自動寫入 DNS（需 Zone:DNS:Edit）。
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const DOMAIN = "rainynightfrog.com";
const EMAIL_FROM = `RainyNightFrog <receipts@${DOMAIN}>`;
const TEST_TO = "chungwaikin232@gmail.com";

const flags = new Set(process.argv.slice(2));
const modeCheck = flags.has("--check");
const modeVerify = flags.has("--verify");
const modeApply = flags.has("--apply");
const modeTest = flags.has("--test");

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

function upsertEnvLine(content, key, value) {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  if (pattern.test(content)) return content.replace(pattern, line);
  return `${content.replace(/\s*$/, "")}\n${line}\n`;
}

async function resendFetch(apiKey, path, options = {}) {
  const response = await fetch(`https://api.resend.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.message ?? `HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

function fqdn(name) {
  if (!name || name === "@") return DOMAIN;
  if (name.endsWith(`.${DOMAIN}`)) return name;
  return `${name}.${DOMAIN}`;
}

function normalizeRecordValue(value) {
  return String(value ?? "")
    .trim()
    .replace(/^"+|"+$/g, "");
}

function printRecords(records) {
  console.log("\n=== 請在 Cloudflare DNS 新增以下紀錄 ===");
  console.log(`https://dash.cloudflare.com → ${DOMAIN} → DNS → Records\n`);
  for (const record of records) {
    const host = record.name?.includes(".")
      ? record.name.endsWith(`.${DOMAIN}`)
        ? record.name.slice(0, -(DOMAIN.length + 1)) || "@"
        : record.name
      : record.name || "@";
    const type = record.type;
    const value = normalizeRecordValue(record.value);
    const priority =
      record.priority != null ? ` (priority ${record.priority})` : "";
    console.log(`• ${record.record ?? type}  |  Name: ${host}  |  Type: ${type}${priority}`);
    console.log(`  Value: ${value}`);
    console.log(`  Proxy: DNS only（灰雲，勿開 CDN）\n`);
  }
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

async function upsertCloudflareRecord(token, zoneId, existing, record) {
  const host = record.name?.includes(".")
    ? record.name.endsWith(`.${DOMAIN}`)
      ? record.name.slice(0, -(DOMAIN.length + 1)) || DOMAIN
      : record.name
    : record.name === "send"
      ? `send.${DOMAIN}`
      : `${record.name}.${DOMAIN}`;

  const cfName =
    host === DOMAIN
      ? DOMAIN
      : host.endsWith(`.${DOMAIN}`)
        ? host
        : `${record.name}.${DOMAIN}`;

  const content = normalizeRecordValue(record.value);
  const body = {
    type: record.type,
    name: cfName,
    content,
    ttl: 1,
    proxied: false,
    ...(record.type === "MX" ? { priority: record.priority ?? 10 } : {}),
  };

  const found = existing.find(
    (row) =>
      row.type === body.type &&
      row.name.toLowerCase() === cfName.toLowerCase() &&
      (body.type !== "MX" || row.priority === body.priority)
  );

  const url = found
    ? `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${found.id}`
    : `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`;
  const response = await fetch(url, {
    method: found ? "PUT" : "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!payload.success) {
    throw new Error(
      `Cloudflare ${found ? "更新" : "新增"} ${cfName} 失敗：${JSON.stringify(payload.errors)}`
    );
  }
  console.log(`✓ Cloudflare ${found ? "更新" : "新增"} ${body.type} ${cfName}`);
}

async function ensureDomain(adminKey) {
  const listed = await resendFetch(adminKey, "/domains");
  const domains = listed.data ?? [];
  const existing = domains.find((item) => item.name === DOMAIN);
  if (existing) {
    console.log(`✓ Resend 已有網域：${DOMAIN}（${existing.status}）`);
    return resendFetch(adminKey, `/domains/${existing.id}`);
  }

  console.log(`→ 建立 Resend 網域：${DOMAIN}`);
  const created = await resendFetch(adminKey, "/domains", {
    method: "POST",
    body: JSON.stringify({ name: DOMAIN }),
  });
  return created;
}

async function checkDns(records) {
  console.log("\n=== DNS 檢查 ===");
  let ok = 0;
  for (const record of records) {
    const host = fqdn(record.name);
    const type = record.type;
    const expected = normalizeRecordValue(record.value);
    let found = false;

    try {
      if (type === "TXT") {
        const { execSync: exec } = await import("node:child_process");
        const out = exec(`nslookup -type=TXT ${host}`, { encoding: "utf8" });
        found = out.includes(expected.replace(/^"|"$/g, ""));
      } else if (type === "MX") {
        const { execSync: exec } = await import("node:child_process");
        const out = exec(`nslookup -type=MX ${host}`, { encoding: "utf8" });
        found =
          out.toLowerCase().includes(expected.toLowerCase()) &&
          (record.priority == null || out.includes(String(record.priority)));
      } else if (type === "CNAME") {
        const { execSync: exec } = await import("node:child_process");
        const out = exec(`nslookup -type=CNAME ${host}`, { encoding: "utf8" });
        found = out.toLowerCase().includes(expected.toLowerCase().replace(/\.$/, ""));
      }
    } catch {
      found = false;
    }

    console.log(`${found ? "✓" : "✗"} ${type} ${host}`);
    if (found) ok += 1;
  }
  console.log(`\n${ok}/${records.length} 筆紀錄已偵測到（傳播中可能需 5–15 分鐘）`);
  return ok === records.length;
}

async function sendTestEmail(sendKey, from) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [TEST_TO],
      subject: "RainyNightFrog — Resend domain test",
      html: "<p>寄件網域設定成功，可寄給所有使用者。</p>",
    }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.message ?? `HTTP ${response.status}`);
  console.log(`✓ 測試信已寄出（id: ${payload.id}）→ ${TEST_TO}`);
}

function applyEmailFrom(envPath) {
  let content = readFileSync(envPath, "utf8");
  content = upsertEnvLine(content, "EMAIL_FROM", EMAIL_FROM);
  content = content.replace(
    /# 測試階段用 onboarding@resend\.dev.+\n/g,
    `# 正式寄件：receipts@${DOMAIN}\n`
  );
  writeFileSync(envPath, content, "utf8");
  console.log(`✓ .env.local EMAIL_FROM → ${EMAIL_FROM}`);
}

function syncVercelEmailFrom() {
  execSync(`echo "${EMAIL_FROM}" | npx vercel env add EMAIL_FROM production --force`, {
    stdio: "inherit",
    shell: true,
  });
  console.log("✓ Vercel Production EMAIL_FROM 已更新");
}

async function main() {
  const { path: envPath, env } = loadEnv();
  const sendKey = env.RESEND_API_KEY?.trim();
  const adminKey =
    env.RESEND_ADMIN_API_KEY?.trim() || env.RESEND_API_KEY?.trim();
  const cloudflareToken = env.CLOUDFLARE_API_TOKEN?.trim();

  if (!sendKey) {
    console.error("請先在 .env.local 設定 RESEND_API_KEY");
    process.exit(1);
  }

  if (modeTest) {
    const from = env.EMAIL_FROM?.trim() || EMAIL_FROM;
    await sendTestEmail(sendKey, from);
    return;
  }

  let domainPayload;
  try {
    domainPayload = await ensureDomain(adminKey);
  } catch (error) {
    if (error.message?.includes("restricted")) {
      console.error("\n目前 RESEND_API_KEY 只有 Sending 權限，無法管理網域。");
      console.error("請到 Resend → API Keys → Create API Key → Full access");
      console.error("貼到 .env.local：RESEND_ADMIN_API_KEY=re_...");
      console.error("\n或手動到 https://resend.com/domains 新增 rainynightfrog.com");
      console.error("完成後再執行：npm run setup:resend-domain -- --check");
      process.exit(1);
    }
    throw error;
  }

  const records = domainPayload.records ?? [];
  const domainId = domainPayload.id;
  const status = domainPayload.status;

  printRecords(records);

  if (cloudflareToken && records.length) {
    console.log("→ 使用 CLOUDFLARE_API_TOKEN 寫入 DNS…");
    const zoneId = await resolveCloudflareZoneId(cloudflareToken);
    const existing = await listCloudflareRecords(cloudflareToken, zoneId);
    for (const record of records) {
      if (record.record === "Tracking") continue;
      await upsertCloudflareRecord(cloudflareToken, zoneId, existing, record);
    }
    console.log("✓ Cloudflare DNS 已更新");
  } else if (!cloudflareToken) {
    console.log("（可選）在 .env.local 加入 CLOUDFLARE_API_TOKEN 可自動寫入 DNS\n");
  }

  if (modeCheck || modeVerify || modeApply) {
    await checkDns(records);
  }

  if (modeVerify || modeApply) {
    console.log("\n→ 觸發 Resend 驗證…");
    await resendFetch(adminKey, `/domains/${domainId}/verify`, { method: "POST" });
    const refreshed = await resendFetch(adminKey, `/domains/${domainId}`);
    console.log(`✓ 網域狀態：${refreshed.status}`);

    if (modeApply) {
      let finalStatus = refreshed.status;
      if (finalStatus !== "verified") {
        for (let attempt = 0; attempt < 6; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 10_000));
          const again = await resendFetch(adminKey, `/domains/${domainId}`);
          finalStatus = again.status;
          console.log(`… 等待驗證（${attempt + 1}/6）：${finalStatus}`);
          if (finalStatus === "verified") break;
        }
      }
      if (finalStatus !== "verified") {
        console.error("\n網域尚未 verified，稍後再執行 --apply");
        process.exit(1);
      }
      applyEmailFrom(envPath);
      syncVercelEmailFrom();
      await sendTestEmail(sendKey, EMAIL_FROM);
      console.log("\n建議重新部署：npx vercel --prod");
    }
  } else if (status === "verified") {
    console.log("\n✓ 網域已 verified，可執行：npm run setup:resend-domain -- --apply");
  } else {
    console.log("\n下一步：");
    console.log("  1. 確認 Cloudflare DNS 紀錄已新增");
    console.log("  2. npm run setup:resend-domain -- --verify");
    console.log("  3. npm run setup:resend-domain -- --apply");
  }
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
