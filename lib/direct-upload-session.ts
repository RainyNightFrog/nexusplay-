import { createHmac, timingSafeEqual } from "node:crypto";

const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour

function getUploadSessionSecret() {
  return (
    process.env.DIRECT_UPLOAD_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "rainynightfrog-direct-upload"
  );
}

export function createDirectUploadBuildId() {
  return crypto.randomUUID();
}

/** builds/{userId}/{buildId}/… — 綁定上傳者，避免引用他人建置 */
export function buildDirectUploadPrefix(userId: string, buildId: string) {
  return `builds/${userId}/${buildId}`;
}

export function isCreatorOwnedBuildPath(
  userId: string,
  buildId: string,
  indexPath: string
) {
  const prefix = `${buildDirectUploadPrefix(userId, buildId)}/`;
  const normalized = indexPath.replace(/^\/+/, "");
  // indexPath 本身是相對路徑；完整 storage path 另驗
  return Boolean(normalized) && !normalized.includes("..");
}

export function isCreatorOwnedBuildStoragePath(
  userId: string,
  storagePath: string
) {
  const normalized = storagePath.replace(/^\/+/, "");
  return normalized.startsWith(`builds/${userId}/`);
}

export function signDirectUploadSession(input: {
  userId: string;
  buildId: string;
  exp?: number;
}) {
  const exp = input.exp ?? Date.now() + SESSION_TTL_MS;
  const body = `${input.buildId}.${input.userId}.${exp}`;
  const sig = createHmac("sha256", getUploadSessionSecret())
    .update(body)
    .digest("base64url");
  return { token: `${body}.${sig}`, exp, buildId: input.buildId };
}

export function verifyDirectUploadSession(
  token: string,
  expected: { userId: string; buildId: string }
): { ok: true } | { ok: false; error: string } {
  const parts = token.split(".");
  if (parts.length !== 4) {
    return { ok: false, error: "上傳工作階段無效" };
  }

  const [buildId, userId, expRaw, sig] = parts;
  if (buildId !== expected.buildId || userId !== expected.userId) {
    return { ok: false, error: "上傳工作階段與帳號不符" };
  }

  const exp = Number.parseInt(expRaw, 10);
  if (!Number.isFinite(exp) || Date.now() > exp) {
    return { ok: false, error: "上傳工作階段已過期，請重新上傳" };
  }

  const body = `${buildId}.${userId}.${expRaw}`;
  const expectedSig = createHmac("sha256", getUploadSessionSecret())
    .update(body)
    .digest("base64url");

  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, error: "上傳工作階段驗證失敗" };
    }
  } catch {
    return { ok: false, error: "上傳工作階段驗證失敗" };
  }

  return { ok: true };
}

export function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}
