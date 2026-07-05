import { getSiteUrl } from "@/lib/site-url";
import { listDefaultWebSubTopics } from "@/lib/websub-service";

export function getWebSubCallbackUrl() {
  return `${getSiteUrl()}/api/websub/callback`;
}

export function isAllowedWebSubTopic(topicUrl: string) {
  const baseUrl = getSiteUrl().replace(/\/$/, "");
  const normalized = topicUrl.trim().replace(/\/$/, "");

  if (!normalized.startsWith(baseUrl)) return false;

  const allowed = new Set(
    listDefaultWebSubTopics().map((url) => url.replace(/\/$/, ""))
  );

  return allowed.has(normalized);
}

export function parseWebSubVerificationParams(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const topic = searchParams.get("hub.topic");
  const challenge = searchParams.get("hub.challenge");
  const leaseSecondsRaw = searchParams.get("hub.lease_seconds");

  if (!mode || !topic || !challenge) return null;
  if (mode !== "subscribe" && mode !== "unsubscribe") return null;

  const leaseSeconds = leaseSecondsRaw ? Number.parseInt(leaseSecondsRaw, 10) : null;

  return {
    mode,
    topic,
    challenge,
    leaseSeconds: Number.isFinite(leaseSeconds) ? leaseSeconds : null,
  };
}

export function parseWebSubNotificationBody(body: string) {
  const params = new URLSearchParams(body);
  const hubMode = params.get("hub.mode");
  const topic = params.get("hub.topic");

  if (hubMode === "unsubscribe" && topic) {
    return { kind: "unsubscribe" as const, topic };
  }

  if (topic) {
    return { kind: "update" as const, topic };
  }

  return null;
}
