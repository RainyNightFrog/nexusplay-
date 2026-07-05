import { randomBytes } from "node:crypto";
import { createServerSupabase } from "@/lib/supabase-server";

export const PARTNER_ACCESS_COOKIE_PREFIX = "np_partner_";

export type GameAccessCodeRecord = {
  id: string;
  game_id: number;
  creator_id: string;
  code: string;
  label: string | null;
  max_uses: number | null;
  use_count: number;
  expires_at: string | null;
  created_at: string;
};

export function partnerAccessCookieName(gameId: number) {
  return `${PARTNER_ACCESS_COOKIE_PREFIX}${gameId}`;
}

export function generateAccessCode() {
  const segment = randomBytes(4).toString("hex").toUpperCase();
  return `NP-${segment.slice(0, 4)}-${segment.slice(4, 8)}`;
}

function isCodeActive(record: Pick<GameAccessCodeRecord, "max_uses" | "use_count" | "expires_at">) {
  if (record.expires_at && new Date(record.expires_at).getTime() < Date.now()) {
    return false;
  }
  if (
    typeof record.max_uses === "number" &&
    record.use_count >= record.max_uses
  ) {
    return false;
  }
  return true;
}

export async function listGameAccessCodes(gameId: number, creatorId: string) {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("game_access_codes")
    .select("*")
    .eq("game_id", gameId)
    .eq("creator_id", creatorId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as GameAccessCodeRecord[];
}

export async function createGameAccessCode(params: {
  gameId: number;
  creatorId: string;
  label?: string | null;
  maxUses?: number | null;
  expiresAt?: string | null;
}) {
  const supabase = createServerSupabase();
  let code = generateAccessCode();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await supabase
      .from("game_access_codes")
      .insert({
        game_id: params.gameId,
        creator_id: params.creatorId,
        code,
        label: params.label?.trim() || null,
        max_uses: params.maxUses ?? null,
        expires_at: params.expiresAt ?? null,
      })
      .select("*")
      .single();

    if (!error) return data as GameAccessCodeRecord;
    if (error.code !== "23505") throw new Error(error.message);
    code = generateAccessCode();
  }

  throw new Error("無法產生唯一試玩碼");
}

export async function deleteGameAccessCode(params: {
  codeId: string;
  gameId: number;
  creatorId: string;
}) {
  const supabase = createServerSupabase();
  const { error } = await supabase
    .from("game_access_codes")
    .delete()
    .eq("id", params.codeId)
    .eq("game_id", params.gameId)
    .eq("creator_id", params.creatorId);

  if (error) throw new Error(error.message);
}

export async function validatePartnerAccessCode(
  gameId: number,
  code: string
): Promise<GameAccessCodeRecord | null> {
  const supabase = createServerSupabase();
  const normalized = code.trim().toUpperCase();

  const { data, error } = await supabase
    .from("game_access_codes")
    .select("*")
    .eq("game_id", gameId)
    .ilike("code", normalized)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data || !isCodeActive(data as GameAccessCodeRecord)) return null;
  return data as GameAccessCodeRecord;
}

export async function redeemPartnerAccessCode(record: GameAccessCodeRecord) {
  const supabase = createServerSupabase();
  const { error } = await supabase
    .from("game_access_codes")
    .update({ use_count: record.use_count + 1 })
    .eq("id", record.id);

  if (error) throw new Error(error.message);
}

export async function hasStoredPartnerAccess(
  gameId: number,
  cookieValue?: string | null
) {
  if (!cookieValue?.trim()) return false;
  const record = await validatePartnerAccessCode(gameId, cookieValue);
  return Boolean(record);
}
