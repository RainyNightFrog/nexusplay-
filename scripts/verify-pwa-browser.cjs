const { chromium, devices } = require("playwright");

const BASE = process.env.PWA_TEST_BASE || "http://127.0.0.1:3010";

async function main() {
  const results = [];
  const ok = (name, pass, detail = "") => {
    results.push({ name, pass: Boolean(pass), detail });
    console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` — ${detail}` : ""}`);
  };

  const browser = await chromium.launch({ headless: true });

  try {
    // --- Desktop: banner must NOT appear ---
    {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        locale: "zh-HK",
      });
      const page = await context.newPage();
      await page.goto(`${BASE}/zh-HK`, { waitUntil: "networkidle", timeout: 60000 });
      await page.waitForTimeout(3500);
      const banner = page.getByRole("dialog", { name: /安裝 RainyNightFrog|Install RainyNightFrog/i });
      ok("desktop: auto banner hidden", (await banner.count()) === 0);
      await context.close();
    }

    // --- Android Chrome-like: banner after delay ---
    {
      const pixel = devices["Pixel 7"];
      const context = await browser.newContext({
        ...pixel,
        locale: "zh-HK",
      });
      // Simulate beforeinstallprompt so native path is available
      await context.addInitScript(() => {
        window.__pwaPromptCalls = 0;
        class FakeBIP extends Event {
          constructor() {
            super("beforeinstallprompt", { cancelable: true });
            this.platforms = ["web"];
            this.userChoice = Promise.resolve({
              outcome: "accepted",
              platform: "web",
            });
          }
          prompt() {
            window.__pwaPromptCalls += 1;
            return Promise.resolve();
          }
        }
        window.addEventListener("DOMContentLoaded", () => {
          setTimeout(() => {
            window.dispatchEvent(new FakeBIP());
          }, 200);
        });
        // Also fire soon after load for SPA timing
        setTimeout(() => {
          window.dispatchEvent(new FakeBIP());
        }, 500);
      });

      const page = await context.newPage();
      await page.goto(`${BASE}/zh-HK`, { waitUntil: "networkidle", timeout: 60000 });
      await page.waitForTimeout(3500);
      const banner = page.getByRole("dialog").filter({ hasText: /安裝|Install|App/i });
      const bannerVisible = await banner.first().isVisible().catch(() => false);
      ok("android: auto banner visible", bannerVisible);

      if (bannerVisible) {
        await banner.getByRole("button", { name: /立即安裝|Install now/i }).click();
        await page.waitForTimeout(500);
        const promptCalls = await page.evaluate(() => window.__pwaPromptCalls || 0);
        ok("android: native prompt() called", promptCalls >= 1, `calls=${promptCalls}`);
      } else {
        ok("android: native prompt() called", false, "banner missing");
      }

      // Dismiss persistence
      await page.goto(`${BASE}/zh-HK`, { waitUntil: "networkidle", timeout: 60000 });
      // Re-open fresh without re-dismissing if previous click installed path dismissed
      await page.evaluate(() => {
        localStorage.removeItem("rnf-pwa-dismissed-until");
      });
      await page.reload({ waitUntil: "networkidle" });
      await page.waitForTimeout(3500);
      const banner2 = page.getByRole("dialog").filter({ hasText: /安裝|Install|App/i });
      if (await banner2.first().isVisible().catch(() => false)) {
        await banner2.getByRole("button", { name: /稍後再說|Maybe later/i }).filter({ hasText: /稍後再說|Maybe later/i }).click();
        await page.waitForTimeout(300);
        const until = await page.evaluate(() =>
          localStorage.getItem("rnf-pwa-dismissed-until")
        );
        ok("android: dismiss writes localStorage", Boolean(until) && Number(until) > Date.now());
        await page.reload({ waitUntil: "networkidle" });
        await page.waitForTimeout(3500);
        const stillVisible = await banner2.first().isVisible().catch(() => false);
        ok("android: banner stays hidden for 24h", !stillVisible);
      } else {
        ok("android: dismiss writes localStorage", false, "banner not shown for dismiss test");
        ok("android: banner stays hidden for 24h", false, "skipped");
      }

      await context.close();
    }

    // --- iOS Safari-like: guide modal ---
    {
      const iphone = devices["iPhone 14"];
      const context = await browser.newContext({
        ...iphone,
        locale: "zh-HK",
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      });
      const page = await context.newPage();
      await page.goto(`${BASE}/zh-HK`, { waitUntil: "networkidle", timeout: 60000 });
      await page.evaluate(() => localStorage.removeItem("rnf-pwa-dismissed-until"));
      await page.reload({ waitUntil: "networkidle" });
      await page.waitForTimeout(3500);

      const banner = page.getByRole("dialog").filter({ hasText: /安裝|Install|App/i });
      const bannerVisible = await banner.first().isVisible().catch(() => false);
      ok("ios: auto banner visible", bannerVisible);

      if (bannerVisible) {
        await banner.getByRole("button", { name: /立即安裝|Install now/i }).click();
      } else {
        // Fallback: open mobile menu install if present
        const more = page.getByRole("button", { name: /更多選單|More/i });
        if (await more.isVisible().catch(() => false)) {
          await more.click();
          await page.getByText(/下載 App|Download App|加至桌面|Add to Home/i).click();
        }
      }

      await page.waitForTimeout(500);
      const guide = page.getByRole("dialog", { name: /加至主畫面|Add to Home/i });
      const guideVisible = await guide.isVisible().catch(() => false);
      ok("ios: install guide modal opens", guideVisible);
      if (guideVisible) {
        const step1 = await guide.getByText(/分享|Share/i).count();
        const step2 = await guide.getByText(/加至主畫面|Add to Home/i).count();
        ok("ios: guide has share + home steps", step1 > 0 && step2 > 0, `step1=${step1} step2=${step2}`);
        await page.getByRole("button", { name: /我知道了|Got it/i }).click();
        await page
          .getByRole("dialog", { name: /加至主畫面|Add to Home/i })
          .waitFor({ state: "hidden", timeout: 5000 });
        ok(
          "ios: guide closes",
          (await page.getByRole("dialog", { name: /加至主畫面|Add to Home/i }).count()) === 0 ||
            !(await page
              .getByRole("dialog", { name: /加至主畫面|Add to Home/i })
              .isVisible()
              .catch(() => false))
        );
      } else {
        ok("ios: guide has share + home steps", false, "guide missing");
        ok("ios: guide closes", false, "guide missing");
      }

      // Standalone mode should hide banner
      await context.close();
    }

    {
      const iphone = devices["iPhone 14"];
      const context = await browser.newContext({
        ...iphone,
        locale: "zh-HK",
      });
      await context.addInitScript(() => {
        Object.defineProperty(window.navigator, "standalone", {
          configurable: true,
          get: () => true,
        });
        window.matchMedia = (query) => {
          const standalone = String(query).includes("display-mode: standalone");
          return {
            matches: standalone,
            media: query,
            onchange: null,
            addListener() {},
            removeListener() {},
            addEventListener() {},
            removeEventListener() {},
            dispatchEvent() {
              return false;
            },
          };
        };
      });
      const page = await context.newPage();
      await page.goto(`${BASE}/zh-HK`, { waitUntil: "networkidle", timeout: 60000 });
      await page.waitForTimeout(3500);
      const banner = page.getByRole("dialog").filter({ hasText: /安裝|Install|App/i });
      ok(
        "standalone: auto banner hidden",
        !(await banner.first().isVisible().catch(() => false))
      );
      await context.close();
    }

    // SW registration attempt
    {
      const context = await browser.newContext({ ...devices["Pixel 7"], locale: "zh-HK" });
      const page = await context.newPage();
      await page.goto(`${BASE}/zh-HK`, { waitUntil: "networkidle", timeout: 60000 });
      await page.waitForTimeout(1500);
      const swState = await page.evaluate(async () => {
        if (!("serviceWorker" in navigator)) return { supported: false };
        const reg = await navigator.serviceWorker.getRegistration("/");
        return {
          supported: true,
          hasRegistration: Boolean(reg),
          scriptURL: reg?.active?.scriptURL || reg?.installing?.scriptURL || reg?.waiting?.scriptURL || null,
        };
      });
      ok("service worker supported in chromium", swState.supported);
      ok(
        "service worker registered",
        swState.hasRegistration === true,
        JSON.stringify(swState)
      );
      await context.close();
    }
  } finally {
    await browser.close();
  }

  const failed = results.filter((r) => !r.pass);
  console.log(
    `\n=== BROWSER SUMMARY: ${results.length - failed.length}/${results.length} passed ===`
  );
  if (failed.length) {
    console.log("FAILED:");
    for (const f of failed) console.log(` - ${f.name}${f.detail ? ` | ${f.detail}` : ""}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("BROWSER TEST ERROR", error);
  process.exit(1);
});
