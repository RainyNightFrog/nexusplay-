import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SUPPORTER_TITLE_V1,
  SUPPORTER_TITLE_V2,
  getSupporterTitleNameForBadge,
} from "@/lib/supporter-tier";

const SUPPORTER_TITLE_NAMES = [SUPPORTER_TITLE_V1, SUPPORTER_TITLE_V2] as const;

function isMissingGamificationTable(error: { message?: string } | null) {
  const message = error?.message ?? "";
  return (
    message.includes("user_titles") ||
    message.includes("titles") ||
    message.includes("does not exist")
  );
}

async function loadSupporterTitleIds(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("titles")
    .select("id, name")
    .in("name", [...SUPPORTER_TITLE_NAMES]);

  if (error) {
    if (isMissingGamificationTable(error)) {
      return null;
    }
    throw new Error(`讀取支持者稱號失敗：${error.message}`);
  }

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    if (row.name && row.id) {
      map.set(row.name, row.id);
    }
  }
  return map;
}

async function ensureUserOwnsTitle(
  supabase: SupabaseClient,
  userId: string,
  titleId: string
) {
  const { data: existing, error: readError } = await supabase
    .from("user_titles")
    .select("title_id")
    .eq("user_id", userId)
    .eq("title_id", titleId)
    .maybeSingle();

  if (readError) {
    if (isMissingGamificationTable(readError)) {
      return false;
    }
    throw new Error(`讀取支持者稱號失敗：${readError.message}`);
  }

  if (existing) {
    return true;
  }

  const { error } = await supabase.from("user_titles").insert({
    user_id: userId,
    title_id: titleId,
  });

  if (error) {
    if (isMissingGamificationTable(error)) {
      return false;
    }
    throw new Error(`授予支持者稱號失敗：${error.message}`);
  }

  return true;
}

async function maybeAutoEquipSupporterTitle(
  supabase: SupabaseClient,
  userId: string,
  titleId: string
) {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("equipped_title_id")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    if (isMissingGamificationTable(profileError)) {
      return;
    }
    throw new Error(`讀取佩戴稱號失敗：${profileError.message}`);
  }

  let shouldEquip = !profile?.equipped_title_id;

  if (profile?.equipped_title_id) {
    const { data: equippedTitle } = await supabase
      .from("titles")
      .select("name")
      .eq("id", profile.equipped_title_id)
      .maybeSingle();

    if (
      equippedTitle?.name &&
      SUPPORTER_TITLE_NAMES.includes(
        equippedTitle.name as (typeof SUPPORTER_TITLE_NAMES)[number]
      )
    ) {
      shouldEquip = true;
    }
  }

  if (!shouldEquip) {
    return;
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ equipped_title_id: titleId })
    .eq("id", userId);

  if (updateError) {
    if (isMissingGamificationTable(updateError)) {
      return;
    }
    throw new Error(`自動佩戴支持者稱號失敗：${updateError.message}`);
  }
}

/** 收回支持者稱號所有權；若正在佩戴支持者稱號則一併卸下 */
export async function revokeSupporterTitles(params: {
  supabase: SupabaseClient;
  userId: string;
}) {
  const titleMap = await loadSupporterTitleIds(params.supabase);
  if (!titleMap || titleMap.size === 0) {
    return { revoked: false, reason: "titles_table_missing" as const };
  }

  const titleIds = [...titleMap.values()];

  const { data: profile, error: profileError } = await params.supabase
    .from("profiles")
    .select("equipped_title_id")
    .eq("id", params.userId)
    .maybeSingle();

  if (profileError) {
    if (isMissingGamificationTable(profileError)) {
      return { revoked: false, reason: "titles_table_missing" as const };
    }
    throw new Error(`讀取佩戴稱號失敗：${profileError.message}`);
  }

  if (
    profile?.equipped_title_id &&
    titleIds.includes(profile.equipped_title_id)
  ) {
    const { error: unequipError } = await params.supabase
      .from("profiles")
      .update({ equipped_title_id: null })
      .eq("id", params.userId);

    if (unequipError) {
      if (isMissingGamificationTable(unequipError)) {
        return { revoked: false, reason: "titles_table_missing" as const };
      }
      throw new Error(`卸下支持者稱號失敗：${unequipError.message}`);
    }
  }

  const { error: deleteError } = await params.supabase
    .from("user_titles")
    .delete()
    .eq("user_id", params.userId)
    .in("title_id", titleIds);

  if (deleteError) {
    if (isMissingGamificationTable(deleteError)) {
      return { revoked: false, reason: "titles_table_missing" as const };
    }
    throw new Error(`收回支持者稱號失敗：${deleteError.message}`);
  }

  return { revoked: true as const };
}

export async function grantSupporterTitlesForBadge(params: {
  supabase: SupabaseClient;
  userId: string;
  badge: string;
  /** 僅在首次成為支持者／升級時自動佩戴，日常同步不應強制戴上 */
  autoEquip?: boolean;
}) {
  const titleMap = await loadSupporterTitleIds(params.supabase);
  if (!titleMap) {
    return { synced: false, reason: "titles_table_missing" as const };
  }

  const primaryTitleName = getSupporterTitleNameForBadge(params.badge);
  const primaryTitleId = titleMap.get(primaryTitleName);
  if (!primaryTitleId) {
    return { synced: false, reason: "title_rows_missing" as const };
  }

  const basicTitleId = titleMap.get(SUPPORTER_TITLE_V1);
  if (basicTitleId) {
    await ensureUserOwnsTitle(params.supabase, params.userId, basicTitleId);
  }

  const granted = await ensureUserOwnsTitle(
    params.supabase,
    params.userId,
    primaryTitleId
  );
  if (!granted) {
    return { synced: false, reason: "grant_failed" as const };
  }

  if (params.autoEquip) {
    await maybeAutoEquipSupporterTitle(
      params.supabase,
      params.userId,
      primaryTitleId
    );
  }

  return { synced: true as const, titleId: primaryTitleId };
}

export async function syncSupporterTitlesIfNeeded(params: {
  supabase: SupabaseClient;
  userId: string;
}) {
  const { data: profile, error } = await params.supabase
    .from("profiles")
    .select("is_supporter, supporter_badge")
    .eq("id", params.userId)
    .maybeSingle();

  if (error || profile?.is_supporter !== true) {
    return { synced: false, reason: "not_supporter" as const };
  }

  return grantSupporterTitlesForBadge({
    supabase: params.supabase,
    userId: params.userId,
    badge: profile.supporter_badge ?? "supporter_v1",
    autoEquip: false,
  });
}

export async function backfillAllSupporterTitles(supabase: SupabaseClient) {
  const { data: supporters, error } = await supabase
    .from("profiles")
    .select("id, supporter_badge")
    .eq("is_supporter", true);

  if (error) {
    throw new Error(`讀取支持者清單失敗：${error.message}`);
  }

  let synced = 0;
  let skipped = 0;

  for (const profile of supporters ?? []) {
    const result = await grantSupporterTitlesForBadge({
      supabase,
      userId: profile.id,
      badge: profile.supporter_badge ?? "supporter_v1",
    });
    if (result.synced) {
      synced += 1;
    } else {
      skipped += 1;
    }
  }

  return {
    total: supporters?.length ?? 0,
    synced,
    skipped,
  };
}
