import { isEmailConfigured } from "@/lib/email-service";
import { isPaymentsLive, isStripeConfigured } from "@/lib/stripe-connect";
import { isWebPushConfigured } from "@/lib/web-push-config";
import { isWebSubConfigured } from "@/lib/websub-service";

export function isPlatformPreviewMode() {
  const explicit = process.env.PLATFORM_PREVIEW_MODE?.trim().toLowerCase();
  if (explicit === "true") return true;
  if (explicit === "false") return false;
  return !isPaymentsLive() && !isEmailConfigured();
}

export type PlatformModeStatus = {
  previewMode: boolean;
  paymentsLive: boolean;
  stripeConfigured: boolean;
  emailConfigured: boolean;
  webPushConfigured: boolean;
  websubConfigured: boolean;
};

export function getPlatformModeStatus(): PlatformModeStatus {
  return {
    previewMode: isPlatformPreviewMode(),
    paymentsLive: isPaymentsLive(),
    stripeConfigured: isStripeConfigured(),
    emailConfigured: isEmailConfigured(),
    webPushConfigured: isWebPushConfigured(),
    websubConfigured: isWebSubConfigured(),
  };
}
