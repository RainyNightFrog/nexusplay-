self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/**
 * 保留 fetch listener 以相容部分瀏覽器的 PWA 可安裝檢查。
 * 刻意不呼叫 respondWith，避免攔截 Next.js 串流／API 請求。
 */
self.addEventListener("fetch", () => {});

self.addEventListener("push", (event) => {
  let payload = { title: "RainyNightFrog", body: "", url: "/" };

  try {
    payload = { ...payload, ...(event.data?.json() ?? {}) };
  } catch {
    payload.body = event.data?.text() ?? "";
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/brand/icon-192.png",
      badge: "/brand/icon-192.png",
      data: { url: payload.url ?? "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? "/";
  event.waitUntil(self.clients.openWindow(targetUrl));
});
