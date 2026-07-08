export function isWebPushConfigured() {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY?.trim() && process.env.VAPID_PRIVATE_KEY?.trim()
  );
}

export function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY?.trim() ?? "";
}

export function getVapidSubject() {
  return process.env.VAPID_SUBJECT?.trim() ?? "mailto:support@rainynightfrog.com";
}
