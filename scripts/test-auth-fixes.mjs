/**
 * 驗證 auth 修復：安全重導向、子網域 callback、重設密碼 URL
 * 執行：node scripts/test-auth-fixes.mjs
 */

process.env.NEXT_PUBLIC_ROOT_DOMAIN = "rainynightfrog.com";
process.env.NEXT_PUBLIC_SITE_URL = "https://rainynightfrog.com";

function sanitizeInternalRedirect(redirectTo, fallback = "/") {
  const value = (redirectTo ?? "").trim();
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  if (value.includes("://")) return fallback;
  if (value.includes("\\")) return fallback;
  return value;
}

function getAuthCallbackUrl(origin) {
  return `${origin.replace(/\/$/, "")}/auth/callback`;
}

function resolveAuthCallbackOrigin(windowOrigin) {
  const origin = windowOrigin.replace(/\/$/, "");
  const rootDomain = (
    process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "rainynightfrog.com"
  )
    .trim()
    .toLowerCase();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");

  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
    return origin;
  }

  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    const isSubdomain =
      hostname.endsWith(`.${rootDomain}`) &&
      hostname !== rootDomain &&
      hostname !== `www.${rootDomain}`;

    if (isSubdomain) {
      return siteUrl ?? `https://${rootDomain}`;
    }
  } catch {
    // fall through
  }

  return origin;
}

function getStableAuthCallbackUrl(windowOrigin) {
  return getAuthCallbackUrl(resolveAuthCallbackOrigin(windowOrigin));
}

function buildPasswordResetCallbackUrl(windowOrigin) {
  const resetRedirect = encodeURIComponent("/auth?mode=reset");
  return `${getStableAuthCallbackUrl(windowOrigin)}?redirect=${resetRedirect}`;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function test(name, fn) {
  try {
    fn();
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

// --- 安全重導向 ---
results.push(
  test("阻擋 //evil.com", () => {
    assert(
      sanitizeInternalRedirect("//evil.com") === "/",
      "應回傳 fallback /"
    );
  })
);

results.push(
  test("阻擋 https://evil.com", () => {
    assert(
      sanitizeInternalRedirect("https://evil.com/phish") === "/",
      "應回傳 fallback /"
    );
  })
);

results.push(
  test("阻擋反斜線路徑", () => {
    assert(
      sanitizeInternalRedirect("/\\evil.com") === "/",
      "應回傳 fallback /"
    );
  })
);

results.push(
  test("允許正常站內路徑", () => {
    assert(sanitizeInternalRedirect("/dashboard") === "/dashboard", "應保留路徑");
    assert(
      sanitizeInternalRedirect("/auth?mode=reset") === "/auth?mode=reset",
      "應保留查詢參數"
    );
  })
);

results.push(
  test("空值回傳 fallback", () => {
    assert(sanitizeInternalRedirect(null) === "/", "null 應回傳 /");
    assert(sanitizeInternalRedirect("") === "/", "空字串應回傳 /");
  })
);

// --- 子網域 callback ---
results.push(
  test("子網域 OAuth callback 指向主網域", () => {
    const url = getStableAuthCallbackUrl("https://void-gacha.rainynightfrog.com");
    assert(
      url === "https://rainynightfrog.com/auth/callback",
      `預期主網域 callback，實際：${url}`
    );
  })
);

results.push(
  test("主網域 OAuth callback 不變", () => {
    const url = getStableAuthCallbackUrl("https://rainynightfrog.com");
    assert(url === "https://rainynightfrog.com/auth/callback", url);
  })
);

results.push(
  test("本機 callback 保留 localhost", () => {
    const url = getStableAuthCallbackUrl("http://localhost:3000");
    assert(url === "http://localhost:3000/auth/callback", url);
  })
);

results.push(
  test("www 子網域不視為遊戲子網域", () => {
    const url = getStableAuthCallbackUrl("https://www.rainynightfrog.com");
    assert(url === "https://www.rainynightfrog.com/auth/callback", url);
  })
);

// --- 重設密碼 URL ---
results.push(
  test("重設密碼 callback 含正確 redirect 參數", () => {
    const url = buildPasswordResetCallbackUrl("https://rainynightfrog.com");
    assert(
      url ===
        "https://rainynightfrog.com/auth/callback?redirect=%2Fauth%3Fmode%3Dreset",
      url
    );
  })
);

results.push(
  test("子網域發起重設密碼仍用主網域 callback", () => {
    const url = buildPasswordResetCallbackUrl(
      "https://void-gacha.rainynightfrog.com"
    );
    assert(
      url.startsWith("https://rainynightfrog.com/auth/callback?redirect="),
      url
    );
  })
);

const passed = results.filter((r) => r.ok).length;
const failed = results.filter((r) => !r.ok);

console.log("\n=== Auth 修復單元測試 ===\n");
for (const result of results) {
  console.log(`${result.ok ? "✓" : "✗"} ${result.name}`);
  if (!result.ok) {
    console.log(`  → ${result.error}`);
  }
}
console.log(`\n結果：${passed}/${results.length} 通過`);

if (failed.length > 0) {
  process.exit(1);
}
