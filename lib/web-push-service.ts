import type webpushModule from "web-push";
import {
  deletePushSubscription,
  listPushSubscriptions,
} from "@/lib/push-subscription-service";
import {
  getVapidPublicKey,
  getVapidSubject,
  isWebPushConfigured,
} from "@/lib/web-push-config";
import { getSiteUrl } from "@/lib/site-url";

let webpush: typeof webpushModule | null = null;
let configured = false;

async function getWebPush() {
  if (!webpush) {
    const mod = await import("web-push");
    webpush = mod.default;
  }
  return webpush;
}

async function ensureWebPushConfigured() {
  if (configured) return isWebPushConfigured();
  if (!isWebPushConfigured()) return false;

  const wp = await getWebPush();
  wp.setVapidDetails(
    getVapidSubject(),
    getVapidPublicKey(),
    process.env.VAPID_PRIVATE_KEY!.trim()
  );
  configured = true;
  return true;
}

export type WebPushPayload = {
  title: string;
  body: string;
  url?: string | null;
};

export async function sendWebPushToUser(userId: string, payload: WebPushPayload): Promise<number> {
  if (!(await ensureWebPushConfigured())) return 0;

  const subscriptions = await listPushSubscriptions(userId);
  if (subscriptions.length === 0) return 0;

  const wp = await getWebPush();
  const siteUrl = getSiteUrl();
  const targetUrl = payload.url
    ? payload.url.startsWith("http")
      ? payload.url
      : `${siteUrl}${payload.url.startsWith("/") ? payload.url : `/${payload.url}`}`
    : siteUrl;

  const message = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: targetUrl,
  });

  let sent = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await wp.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          message
        );
        sent += 1;
      } catch (error) {
        const statusCode =
          error && typeof error === "object" && "statusCode" in error
            ? Number(error.statusCode)
            : 0;

        if (statusCode === 404 || statusCode === 410) {
          await deletePushSubscription(userId, subscription.endpoint);
        }
      }
    })
  );

  return sent;
}
