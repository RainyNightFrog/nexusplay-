import { createHmac, timingSafeEqual } from "node:crypto";
import { getSiteUrl } from "@/lib/site-url";

export type EmailUnsubscribeKind = "forum_digest";

const TOKEN_TTL_MS = 90 * 86_400_000;

function resolveSecret() {
  const secret =
    process.env.EMAIL_UNSUBSCRIBE_SECRET?.trim() ??
    process.env.CRON_SECRET?.trim();
  if (!secret) {
    throw new Error("EMAIL_UNSUBSCRIBE_SECRET 或 CRON_SECRET 未設定");
  }
  return secret;
}

function signPayload(payload: string) {
  return createHmac("sha256", resolveSecret()).update(payload).digest("base64url");
}

export function createEmailUnsubscribeToken(
  userId: string,
  kind: EmailUnsubscribeKind
) {
  const exp = Date.now() + TOKEN_TTL_MS;
  const payload = `${kind}:${userId}:${exp}`;
  const signature = signPayload(payload);
  return Buffer.from(`${payload}:${signature}`).toString("base64url");
}

export function verifyEmailUnsubscribeToken(token: string): {
  userId: string;
  kind: EmailUnsubscribeKind;
} | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const lastColon = decoded.lastIndexOf(":");
    if (lastColon <= 0) return null;

    const payload = decoded.slice(0, lastColon);
    const signature = decoded.slice(lastColon + 1);
    const expected = signPayload(payload);

    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (
      actualBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(actualBuffer, expectedBuffer)
    ) {
      return null;
    }

    const [kind, userId, expRaw] = payload.split(":");
    if (kind !== "forum_digest" || !userId || !expRaw) return null;

    const exp = Number.parseInt(expRaw, 10);
    if (!Number.isFinite(exp) || exp < Date.now()) return null;

    return { userId, kind: "forum_digest" };
  } catch {
    return null;
  }
}

export function buildForumDigestUnsubscribeUrl(userId: string) {
  const token = createEmailUnsubscribeToken(userId, "forum_digest");
  const baseUrl = getSiteUrl();
  return `${baseUrl}/unsubscribe/forum-digest?token=${encodeURIComponent(token)}`;
}
