import { createServerSupabase } from "@/lib/supabase-server";

export type AccountStatus = "active" | "suspended" | "banned";

export type AccountStatusRecord = {
  account_status: AccountStatus;
  suspended_until: string | null;
  ban_reason: string | null;
  chat_muted_until: string | null;
  forum_posting_disabled: boolean;
};

export function isSuspensionExpired(suspendedUntil: string | null | undefined) {
  if (!suspendedUntil) return true;
  return new Date(suspendedUntil).getTime() <= Date.now();
}

export function isAccountRestricted(record: AccountStatusRecord) {
  if (record.account_status === "banned") return true;
  if (record.account_status === "suspended") {
    return !isSuspensionExpired(record.suspended_until);
  }
  return false;
}

export function isChatMuted(chatMutedUntil: string | null | undefined) {
  if (!chatMutedUntil) return false;
  return new Date(chatMutedUntil).getTime() > Date.now();
}

export function isForumPostingBlocked(record: AccountStatusRecord) {
  if (isAccountRestricted(record)) return true;
  return record.forum_posting_disabled === true;
}

export async function getAccountStatusRecord(
  userId: string
): Promise<AccountStatusRecord | null> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "account_status, suspended_until, ban_reason, chat_muted_until, forum_posting_disabled"
    )
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;

  const record = data as AccountStatusRecord;

  if (
    record.account_status === "suspended" &&
    isSuspensionExpired(record.suspended_until)
  ) {
    await supabase
      .from("profiles")
      .update({
        account_status: "active",
        suspended_until: null,
        ban_reason: null,
      })
      .eq("id", userId);

    return {
      ...record,
      account_status: "active",
      suspended_until: null,
      ban_reason: null,
    };
  }

  return record;
}

export async function assertAccountCanAct(userId: string) {
  const record = await getAccountStatusRecord(userId);
  if (!record) return;

  if (isAccountRestricted(record)) {
    const reason = record.ban_reason?.trim();
    throw new Error(
      reason
        ? `帳號已被停權：${reason}`
        : "帳號已被停權，暫時無法使用此功能"
    );
  }
}

export async function assertCanPostChat(userId: string) {
  await assertAccountCanAct(userId);
  const record = await getAccountStatusRecord(userId);
  if (record && isChatMuted(record.chat_muted_until)) {
    throw new Error("你已被禁言，暫時無法發送聊天訊息");
  }
}

export async function assertCanPostForum(userId: string) {
  const record = await getAccountStatusRecord(userId);
  if (!record) return;

  if (isForumPostingBlocked(record)) {
    throw new Error("你已被禁止發表論壇內容");
  }
}
