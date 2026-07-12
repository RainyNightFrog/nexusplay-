import { stringFromBase64URL } from "@supabase/ssr/dist/module/utils/base64url";
import type { NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookie-options";

const BASE64_PREFIX = "base64-";

function getSupabaseProjectRef() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const match = url.match(/https?:\/\/([^.]+)\.supabase\.co/i);
  return match?.[1] ?? "";
}

export function getSupabaseAuthStorageKey() {
  const projectRef = getSupabaseProjectRef();
  return projectRef ? `sb-${projectRef}-auth-token` : "sb-auth-token";
}

export function getPkceVerifierCookieKey() {
  return `${getSupabaseAuthStorageKey()}-code-verifier`;
}

export const PKCE_VERIFIER_BACKUP_KEY = "oauth:pkce-verifier-backup";
export const PLAIN_PKCE_BACKUP_COOKIE = "oauth_pkce_backup";
const PKCE_BACKUP_TTL_MS = 10 * 60 * 1000;

type PkceVerifierBackupPayload = {
  verifier: string;
  origin: string;
  expiresAt: number;
};

function readDocumentCookies(): Array<{ name: string; value: string }> {
  if (typeof document === "undefined" || !document.cookie) {
    return [];
  }

  return document.cookie.split(";").map((part) => {
    const trimmed = part.trim();
    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      return { name: trimmed, value: "" };
    }

    const name = trimmed.slice(0, separator);
    const rawValue = trimmed.slice(separator + 1);

    try {
      return { name, value: decodeURIComponent(rawValue) };
    } catch {
      return { name, value: rawValue };
    }
  });
}

function isChunkLike(cookieName: string, key: string) {
  if (cookieName === key) return true;
  const match = cookieName.match(/^(.*)[.](0|[1-9][0-9]*)$/);
  return Boolean(match && match[1] === key);
}

function decodeChunkedCookieValue(value: string): string | null {
  if (!value.startsWith(BASE64_PREFIX)) {
    return value;
  }

  try {
    const decoded = stringFromBase64URL(value.substring(BASE64_PREFIX.length));
    JSON.parse(decoded);
    return decoded;
  } catch {
    return null;
  }
}

function combineCookieChunks(
  cookies: Array<{ name: string; value: string }>,
  key: string
) {
  const direct = cookies.find((cookie) => cookie.name === key);
  if (direct?.value) {
    return direct.value;
  }

  const chunks: string[] = [];
  for (let index = 0; ; index += 1) {
    const chunk = cookies.find((cookie) => cookie.name === `${key}.${index}`);
    if (!chunk?.value) break;
    chunks.push(chunk.value);
  }

  return chunks.length > 0 ? chunks.join("") : null;
}

function parseStoredCodeVerifier(raw: string | null): string | null {
  if (!raw) return null;

  const decoded = decodeChunkedCookieValue(raw);

  if (!decoded) return null;

  try {
    const parsed = JSON.parse(decoded) as unknown;
    return typeof parsed === "string" && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export function readPkceVerifierFromDocument(): string | null {
  const key = getPkceVerifierCookieKey();
  const cookies = readDocumentCookies();
  const combined = combineCookieChunks(cookies, key);
  return parseStoredCodeVerifier(combined);
}

function formatBrowserCookieAttributes(maxAge: number) {
  const { domain } = getSupabaseCookieOptions();
  const parts = [`path=/`, `max-age=${maxAge}`, `SameSite=Lax`];
  if (domain) {
    parts.push(`domain=${domain}`);
  }
  return parts.join("; ");
}

export function savePkceVerifierPlainCookie(verifier: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${PLAIN_PKCE_BACKUP_COOKIE}=${encodeURIComponent(verifier)}; ${formatBrowserCookieAttributes(600)}`;
}

export function readPkceVerifierPlainCookie(): string | null {
  if (typeof document === "undefined") return null;

  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${PLAIN_PKCE_BACKUP_COOKIE}=([^;]*)`)
  );
  if (!match?.[1]) return null;

  try {
    const verifier = decodeURIComponent(match[1]);
    return verifier.length > 0 ? verifier : null;
  } catch {
    return null;
  }
}

export function clearPkceVerifierPlainCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${PLAIN_PKCE_BACKUP_COOKIE}=; ${formatBrowserCookieAttributes(0)}`;
}

export function savePkceVerifierBackup(): boolean {
  if (typeof window === "undefined") return false;

  const verifier = readPkceVerifierFromDocument();
  if (!verifier) return false;

  const payload: PkceVerifierBackupPayload = {
    verifier,
    origin: window.location.origin,
    expiresAt: Date.now() + PKCE_BACKUP_TTL_MS,
  };

  window.sessionStorage.setItem(PKCE_VERIFIER_BACKUP_KEY, verifier);
  window.localStorage.setItem(PKCE_VERIFIER_BACKUP_KEY, JSON.stringify(payload));
  savePkceVerifierPlainCookie(verifier);
  return true;
}

export function readPkceVerifierBackup(): string | null {
  if (typeof window === "undefined") return null;

  const sessionBackup = window.sessionStorage.getItem(PKCE_VERIFIER_BACKUP_KEY);
  if (sessionBackup) return sessionBackup;

  const plainCookie = readPkceVerifierPlainCookie();
  if (plainCookie) return plainCookie;

  const raw = window.localStorage.getItem(PKCE_VERIFIER_BACKUP_KEY);
  if (!raw) return null;

  try {
    const payload = JSON.parse(raw) as PkceVerifierBackupPayload;
    if (payload.expiresAt < Date.now()) return null;
    if (payload.origin !== window.location.origin) return null;
    return payload.verifier;
  } catch {
    return null;
  }
}

export function clearPkceVerifierBackup() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(PKCE_VERIFIER_BACKUP_KEY);
  window.localStorage.removeItem(PKCE_VERIFIER_BACKUP_KEY);
  clearPkceVerifierPlainCookie();
}

export function resolvePkceVerifierForExchange(): string | null {
  return (
    readPkceVerifierFromDocument() ??
    readPkceVerifierBackup() ??
    readPkceVerifierPlainCookie()
  );
}

export function readPkceVerifierFromRequest(request: NextRequest): string | null {
  const key = getPkceVerifierCookieKey();
  const cookies = request.cookies.getAll();
  const combined = combineCookieChunks(cookies, key);
  return parseStoredCodeVerifier(combined);
}

export function hasPkceVerifierCookie(): boolean {
  if (typeof document === "undefined") return false;

  const key = getPkceVerifierCookieKey();
  const cookies = document.cookie
    .split(";")
    .map((part) => part.trim().split("=")[0])
    .filter(Boolean);

  return cookies.some((name) => isChunkLike(name ?? "", key));
}

export async function waitForPkceVerifierCookie(timeoutMs = 3000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (hasPkceVerifierCookie()) {
      return true;
    }

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }

  return hasPkceVerifierCookie();
}

/** 清掉過期/損壞的 session cookie，但保留 PKCE verifier */
export function clearStaleSupabaseSessionCookies() {
  if (typeof document === "undefined") return;

  const storageKey = getSupabaseAuthStorageKey();
  const verifierKey = getPkceVerifierCookieKey();
  const names = document.cookie
    .split(";")
    .map((part) => part.trim().split("=")[0])
    .filter(Boolean) as string[];

  for (const name of names) {
    if (!name.startsWith(storageKey)) continue;
    if (isChunkLike(name, verifierKey)) continue;

    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
  }
}

type PkceExchangeResult =
  | {
      access_token: string;
      refresh_token: string;
      user: User;
      error?: undefined;
    }
  | {
      error: Error;
      access_token?: undefined;
      refresh_token?: undefined;
      user?: undefined;
    };

export async function exchangePkceCodeForSession(
  code: string,
  codeVerifier: string
): Promise<PkceExchangeResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return { error: new Error("Missing Supabase environment variables") };
  }

  const verifier = codeVerifier.split("/")[0]?.trim();
  if (!verifier) {
    return { error: new Error("PKCE code verifier is empty") };
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=pkce`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify({
      auth_code: code,
      code_verifier: verifier,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        access_token?: string;
        refresh_token?: string;
        user?: User;
        msg?: string;
        error_description?: string;
        error?: string;
      }
    | null;

  if (!response.ok || !payload?.access_token || !payload.refresh_token) {
    const message =
      payload?.msg ??
      payload?.error_description ??
      payload?.error ??
      "PKCE token exchange failed";
    return { error: new Error(message) };
  }

  if (!payload.user) {
    return { error: new Error("PKCE token exchange returned no user") };
  }

  return {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    user: payload.user,
  };
}
