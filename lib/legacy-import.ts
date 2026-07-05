import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { validateSavePayload } from "@/lib/game-save";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_PATTERN = /^NP-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

export type LegacyImportRecord = {
  id: number;
  game_id: number;
  label: string | null;
  save_data: Record<string, unknown>;
  created_by: string;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
};

export type LegacyImportListItem = {
  id: number;
  label: string | null;
  used: boolean;
  usedAt: string | null;
  createdAt: string;
};

function legacyImportPepper() {
  return (
    process.env.LEGACY_IMPORT_PEPPER?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 32) ||
    "nexusplay-legacy-import-dev"
  );
}

export function normalizeLegacyImportCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function isValidLegacyImportCodeFormat(code: string) {
  return CODE_PATTERN.test(normalizeLegacyImportCode(code));
}

export function hashLegacyImportCode(code: string) {
  const normalized = normalizeLegacyImportCode(code);
  return createHash("sha256")
    .update(`${legacyImportPepper()}:${normalized}`)
    .digest("hex");
}

export function generateLegacyImportCode() {
  const bytes = randomBytes(8);
  let part1 = "";
  let part2 = "";
  for (let i = 0; i < 4; i += 1) {
    part1 += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
    part2 += CODE_ALPHABET[bytes[i + 4]! % CODE_ALPHABET.length];
  }
  return `NP-${part1}-${part2}`;
}

export async function listLegacyImports(
  supabase: SupabaseClient,
  gameId: number
): Promise<LegacyImportListItem[]> {
  const { data, error } = await supabase
    .from("game_legacy_imports")
    .select("id, label, used_by, used_at, created_at")
    .eq("game_id", gameId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(`讀取遷移碼失敗：${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id as number,
    label: (row.label as string | null) ?? null,
    used: Boolean(row.used_by),
    usedAt: (row.used_at as string | null) ?? null,
    createdAt: row.created_at as string,
  }));
}

export async function createLegacyImports(
  supabase: SupabaseClient,
  gameId: number,
  creatorId: string,
  entries: Array<{ label?: string; save: unknown }>
) {
  const created: Array<{ id: number; label: string | null; code: string }> = [];

  for (const entry of entries) {
    if (!validateSavePayload(entry.save)) {
      throw new Error("存檔格式無效或超過 256 KB 上限");
    }

    let inserted = false;
    for (let attempt = 0; attempt < 8 && !inserted; attempt += 1) {
      const code = generateLegacyImportCode();
      const codeHash = hashLegacyImportCode(code);

      const { data, error } = await supabase
        .from("game_legacy_imports")
        .insert({
          game_id: gameId,
          code_hash: codeHash,
          label: entry.label?.trim() || null,
          save_data: entry.save,
          created_by: creatorId,
        })
        .select("id")
        .maybeSingle();

      if (error) {
        if (error.code === "23505") continue;
        throw new Error(`建立遷移碼失敗：${error.message}`);
      }

      if (data) {
        created.push({
          id: data.id as number,
          label: entry.label?.trim() || null,
          code,
        });
        inserted = true;
      }
    }

    if (!inserted) {
      throw new Error("無法產生唯一遷移碼，請稍後再試");
    }
  }

  return created;
}

export async function redeemLegacyImportCode(
  supabase: SupabaseClient,
  gameId: number,
  userId: string,
  code: string
): Promise<LegacyImportRecord> {
  const normalized = normalizeLegacyImportCode(code);
  if (!isValidLegacyImportCodeFormat(normalized)) {
    throw new Error("遷移碼格式無效");
  }

  const codeHash = hashLegacyImportCode(normalized);

  const { data: record, error: readError } = await supabase
    .from("game_legacy_imports")
    .select("*")
    .eq("game_id", gameId)
    .eq("code_hash", codeHash)
    .maybeSingle();

  if (readError) {
    throw new Error(`驗證遷移碼失敗：${readError.message}`);
  }

  if (!record) {
    throw new Error("找不到此遷移碼，請確認是否輸入正確或已過期");
  }

  if (record.used_by && record.used_by !== userId) {
    throw new Error("此遷移碼已被其他帳號使用");
  }

  if (!record.used_by) {
    const { error: updateError } = await supabase
      .from("game_legacy_imports")
      .update({
        used_by: userId,
        used_at: new Date().toISOString(),
      })
      .eq("id", record.id)
      .is("used_by", null);

    if (updateError) {
      throw new Error(`兌換遷移碼失敗：${updateError.message}`);
    }
  }

  return record as LegacyImportRecord;
}
