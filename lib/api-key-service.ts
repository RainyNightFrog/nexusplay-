import { createHash, randomBytes } from "node:crypto";
import { createServerSupabase } from "@/lib/supabase-server";
import { sanitizePlainText } from "@/lib/sanitize";

export const API_KEY_PREFIX = "np_live_";

export type ApiKeyRecord = {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export type CreatedApiKey = ApiKeyRecord & {
  secret: string;
};

function hashApiKey(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

export function generateApiKeySecret() {
  return `${API_KEY_PREFIX}${randomBytes(24).toString("hex")}`;
}

export function extractApiKeyFromRequest(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token.startsWith(API_KEY_PREFIX)) return token;
  }

  const header = request.headers.get("x-api-key");
  if (header?.trim().startsWith(API_KEY_PREFIX)) {
    return header.trim();
  }

  return null;
}

export async function listUserApiKeys(userId: string): Promise<ApiKeyRecord[]> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("creator_api_keys")
    .select("id, user_id, name, key_prefix, last_used_at, revoked_at, created_at")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as ApiKeyRecord[];
}

export async function createUserApiKey(
  userId: string,
  name: string
): Promise<CreatedApiKey> {
  const supabase = createServerSupabase();
  const label = sanitizePlainText(name, 80).trim();
  if (!label) throw new Error("請輸入 API 金鑰名稱");

  const secret = generateApiKeySecret();
  const keyHash = hashApiKey(secret);
  const keyPrefix = `${secret.slice(0, 16)}…`;

  const { data, error } = await supabase
    .from("creator_api_keys")
    .insert({
      user_id: userId,
      name: label,
      key_prefix: keyPrefix,
      key_hash: keyHash,
    })
    .select("id, user_id, name, key_prefix, last_used_at, revoked_at, created_at")
    .single();

  if (error) throw new Error(error.message);

  return {
    ...(data as ApiKeyRecord),
    secret,
  };
}

export async function revokeUserApiKey(userId: string, keyId: string) {
  const supabase = createServerSupabase();
  const { error } = await supabase
    .from("creator_api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId)
    .eq("user_id", userId)
    .is("revoked_at", null);

  if (error) throw new Error(error.message);
}

export async function authenticateApiKey(
  secret: string
): Promise<{ userId: string; keyId: string } | null> {
  if (!secret.startsWith(API_KEY_PREFIX)) return null;

  const supabase = createServerSupabase();
  const keyHash = hashApiKey(secret);

  const { data, error } = await supabase
    .from("creator_api_keys")
    .select("id, user_id, revoked_at")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (error || !data || data.revoked_at) return null;

  await supabase
    .from("creator_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  return { userId: data.user_id as string, keyId: data.id as string };
}
