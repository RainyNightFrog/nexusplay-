import { SUPPORTER_TITLE_LIFETIME } from "@/lib/supporter-tier";
import { createServerSupabase } from "@/lib/supabase-server";

/** 同一永久支持者世界頻道上線廣播最短間隔（6 小時） */
export const LIFETIME_ONLINE_ANNOUNCE_COOLDOWN_MS = 6 * 60 * 60 * 1000;

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
  return `⚡【${SUPPORTER_TITLE_LIFETIME}】「${formatDisplayName(displayName)}」已上線！`;
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

/**
 * 永久支持者每次上線時世界頻道廣播。
 * 成功回傳 announced；冷卻中回傳 skipped。
 */
export async function announceLifetimeSupporterOnline(userId: string): Promise<
  | { announced: true }
  | { announced: false; reason: "not_lifetime" | "cooldown" | "missing_column" }
> {
  const supabase = createServerSupabase();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("display_name, supporter_lifetime, supporter_lifetime_announced_at")
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

  if (profile?.supporter_lifetime !== true) {
    return { announced: false, reason: "not_lifetime" };
  }

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
    content: buildLifetimeOnlineAnnouncement(profile.display_name),
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
      return { announced: true };
    }
    throw new Error(updateError.message);
  }

  return { announced: true };
}
