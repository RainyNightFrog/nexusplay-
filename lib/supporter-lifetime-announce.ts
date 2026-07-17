import {
  SUPPORTER_BADGE_V2,
  SUPPORTER_TITLE_LIFETIME,
} from "@/lib/supporter-tier";
import { createServerSupabase } from "@/lib/supabase-server";

/** 同一支持者世界頻道上線廣播最短間隔（4 小時） */
export const LIFETIME_ONLINE_ANNOUNCE_COOLDOWN_MS = 4 * 60 * 60 * 1000;

function formatDisplayName(name: string | null | undefined) {
  const trimmed = name?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "一位玩家";
}

export function buildLifetimeBecomeAnnouncement(
  displayName: string | null | undefined
) {
  return `⚡ 傳說降臨！「${formatDisplayName(displayName)}」成為永久支持者，獲頒稱號 ${SUPPORTER_TITLE_LIFETIME}！`;
}

export function buildLifetimeOnlineAnnouncement(
  displayName: string | null | undefined
) {
  return `⚡【${SUPPORTER_TITLE_LIFETIME}】${formatDisplayName(displayName)}已上線！`;
}

export function buildSvipOnlineAnnouncement(
  displayName: string | null | undefined
) {
  return `✨【SVIP】${formatDisplayName(displayName)}已上線！`;
}

async function insertWorldAnnouncement(params: {
  userId: string;
  content: string;
}) {
  const supabase = createServerSupabase();
  const { error } = await supabase.from("chat_messages").insert({
    channel: "world",
    user_id: params.userId,
    content: params.content,
  });

  if (error) {
    throw new Error(`世界頻道廣播失敗：${error.message}`);
  }
}

/** 成為永久支持者時廣播（不節流） */
export async function announceLifetimeSupporterBecome(params: {
  userId: string;
  displayName?: string | null;
}) {
  const supabase = createServerSupabase();
  let displayName = params.displayName;

  if (!displayName) {
    const { data } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", params.userId)
      .maybeSingle();
    displayName = data?.display_name ?? null;
  }

  await insertWorldAnnouncement({
    userId: params.userId,
    content: buildLifetimeBecomeAnnouncement(displayName ?? null),
  });
}

export type PremiumOnlineAnnounceResult =
  | { announced: true; kind: "lifetime" | "svip" }
  | {
      announced: false;
      reason: "not_eligible" | "cooldown" | "missing_column";
    };

/**
 * SVIP／永久傳說支持者上線時世界頻道廣播。
 * 永久傳說優先使用傳說文案；一般 SVIP 使用 SVIP 文案。
 * 成功回傳 announced；冷卻中或不符資格回傳 skipped。
 */
export async function announcePremiumSupporterOnline(
  userId: string
): Promise<PremiumOnlineAnnounceResult> {
  const supabase = createServerSupabase();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "display_name, is_supporter, supporter_badge, supporter_lifetime, supporter_lifetime_announced_at"
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    if (
      error.message.includes("supporter_lifetime") ||
      error.message.includes("does not exist")
    ) {
      return { announced: false, reason: "missing_column" };
    }
    throw new Error(error.message);
  }

  if (!profile) {
    return { announced: false, reason: "not_eligible" };
  }

  const isLifetime = profile.supporter_lifetime === true;
  const isSvip =
    profile.is_supporter === true &&
    profile.supporter_badge === SUPPORTER_BADGE_V2;

  if (!isLifetime && !isSvip) {
    return { announced: false, reason: "not_eligible" };
  }

  const kind = isLifetime ? "lifetime" : "svip";

  const lastAt = profile.supporter_lifetime_announced_at
    ? new Date(profile.supporter_lifetime_announced_at).getTime()
    : 0;
  if (
    Number.isFinite(lastAt) &&
    Date.now() - lastAt < LIFETIME_ONLINE_ANNOUNCE_COOLDOWN_MS
  ) {
    return { announced: false, reason: "cooldown" };
  }

  const nowIso = new Date().toISOString();
  await insertWorldAnnouncement({
    userId,
    content: isLifetime
      ? buildLifetimeOnlineAnnouncement(profile.display_name)
      : buildSvipOnlineAnnouncement(profile.display_name),
  });

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ supporter_lifetime_announced_at: nowIso })
    .eq("id", userId);

  if (updateError) {
    if (
      updateError.message.includes("supporter_lifetime_announced_at") ||
      updateError.message.includes("does not exist")
    ) {
      return { announced: true, kind };
    }
    throw new Error(updateError.message);
  }

  return { announced: true, kind };
}

/** @deprecated 請改用 announcePremiumSupporterOnline；保留給既有 API 路徑相容 */
export async function announceLifetimeSupporterOnline(userId: string) {
  return announcePremiumSupporterOnline(userId);
}
