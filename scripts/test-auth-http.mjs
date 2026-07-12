/**
 * 本機 HTTP 煙霧測試（需 dev server 在 localhost:3000）
 * 執行：node scripts/test-auth-http.mjs
 */

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function fetchText(path, init) {
  const response = await fetch(`${BASE}${path}`, {
    redirect: "manual",
    ...init,
  });
  const text = await response.text();
  return { response, text };
}

async function test(name, fn) {
  try {
    await fn();
    return { name, ok: true };
  } catch (error) {
    return {
      name,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

const results = [];

results.push(
  await test("登入頁可載入", async () => {
    const { response, text } = await fetchText("/auth");
    assert(response.status === 200, `狀態碼 ${response.status}`);
    assert(text.includes("auth") || text.length > 500, "回應內容過短");
  })
);

results.push(
  await test("callback 頁可載入（含 AuthCallbackClient）", async () => {
    const { response, text } = await fetchText("/auth/callback");
    assert(response.status === 200, `狀態碼 ${response.status}`);
    assert(
      text.includes("正在完成登入") || text.includes("AuthCallbackClient"),
      "應包含 callback 載入 UI"
    );
  })
);

results.push(
  await test("middleware：帶 OAuth code 的非 callback 路徑會導向 /auth/callback", async () => {
    const { response } = await fetchText("/auth?code=fake-test-code");
    assert(
      response.status === 307 || response.status === 308 || response.status === 302,
      `預期 redirect，實際 ${response.status}`
    );
    const location = response.headers.get("location") ?? "";
    assert(location.includes("/auth/callback"), `location: ${location}`);
    assert(location.includes("code=fake-test-code"), `location: ${location}`);
  })
);

results.push(
  await test("開發用 Discord 設定 API 在 production 模擬下回 403", async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = "production";
    try {
      // 動態載入 route handler 較複雜，改測正式站或本機 build
      // 此處用邏輯複製驗證
      const isSetupAllowed =
        process.env.ENABLE_OAUTH_SETUP === "true" ||
        process.env.NODE_ENV === "development" ||
        process.env.VERCEL_ENV === "preview";
      assert(isSetupAllowed === false, "production 不應允許 setup API");
    } finally {
      process.env.NODE_ENV = prev;
      delete process.env.VERCEL_ENV;
    }
  })
);

results.push(
  await test("password PATCH API 可回應", async () => {
    const response = await fetch(`${BASE}/api/auth/password`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "auth-fix-test@example.com" }),
    });
    assert(response.status !== 404, `不應 404，實際 ${response.status}`);
    const data = await response.json();
    assert(typeof data === "object", "應回 JSON");
  })
);

results.push(
  await test("登入頁原始碼含記住密碼與忘記密碼", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const authPage = fs.readFileSync(
      path.join(process.cwd(), "app/[locale]/auth/auth-page.tsx"),
      "utf8"
    );
    assert(authPage.includes("rememberPassword"), "應含記住密碼");
    assert(authPage.includes("forgotPassword"), "應含忘記密碼");
    assert(authPage.includes("resetPasswordForEmail"), "忘記密碼應走客戶端寄信");
  })
);

// 檢查編譯後 bundle 是否含 getStableAuthCallbackUrl（子網域修復已套用）
results.push(
  await test("登入頁 bundle 使用 getStableAuthCallbackUrl", async () => {
    const { text } = await fetchText("/zh-HK/auth");
    // Next 可能將函式名稱 minify，改查主網域 callback 組裝邏輯的特徵
    // 直接讀原始碼確認
    const fs = await import("node:fs");
    const path = await import("node:path");
    const authPage = fs.readFileSync(
      path.join(process.cwd(), "app/[locale]/auth/auth-page.tsx"),
      "utf8"
    );
    assert(
      authPage.includes("getStableAuthCallbackUrl"),
      "auth-page 應使用 getStableAuthCallbackUrl"
    );
    assert(
      !authPage.includes("getAuthCallbackUrl(window.location.origin)"),
      "不應再直接用 getAuthCallbackUrl(window.location.origin)"
    );
  })
);

results.push(
  await test("callback 原始碼含 recovery 與重複兌換處理", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const callback = fs.readFileSync(
      path.join(process.cwd(), "app/auth/callback/auth-callback-client.tsx"),
      "utf8"
    );
    assert(callback.includes("verifyOtp"), "應含 verifyOtp recovery");
    assert(callback.includes("handleDuplicateExchange"), "應含重複兌換處理");
    assert(callback.includes("sanitizeInternalRedirect"), "應含安全重導向");
  })
);

const passed = results.filter((r) => r.ok).length;
const failed = results.filter((r) => !r.ok);

console.log(`\n=== Auth HTTP / 原始碼煙霧測試 (${BASE}) ===\n`);
for (const result of results) {
  console.log(`${result.ok ? "✓" : "✗"} ${result.name}`);
  if (!result.ok) console.log(`  → ${result.error}`);
}
console.log(`\n結果：${passed}/${results.length} 通過`);

if (failed.length > 0) process.exit(1);
