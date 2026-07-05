import { createServerSupabase } from "@/lib/supabase-server";
import type { UserNotificationKind } from "@/lib/user-notifications-service";

export type NotificationPrefs = {
  tipNotifyEmail: boolean;
  tipNotifyInApp: boolean;
  forumReplyNotifyEmail: boolean;
  forumReplyNotifyInApp: boolean;
  followNewGameEmail: boolean;
  followNewGameInApp: boolean;
  pushNotifyEnabled: boolean;
  pushNotifyTip: boolean;
  pushNotifyForum: boolean;
  pushNotifyFollow: boolean;
  forumEmailDigest: boolean;
};

export async function readNotificationPrefs(
  userId: string
): Promise<NotificationPrefs> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "tip_notify_email, tip_notify_in_app, forum_reply_notify_email, forum_reply_notify_in_app, follow_new_game_email, follow_new_game_in_app, push_notify_enabled, push_notify_tip, push_notify_forum, push_notify_follow, forum_email_digest"
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return {
    tipNotifyEmail: data?.tip_notify_email !== false,
    tipNotifyInApp: data?.tip_notify_in_app !== false,
    forumReplyNotifyEmail: data?.forum_reply_notify_email !== false,
    forumReplyNotifyInApp: data?.forum_reply_notify_in_app !== false,
    followNewGameEmail: data?.follow_new_game_email !== false,
    followNewGameInApp: data?.follow_new_game_in_app !== false,
    pushNotifyEnabled: data?.push_notify_enabled === true,
    pushNotifyTip: data?.push_notify_tip !== false,
    pushNotifyForum: data?.push_notify_forum !== false,
    pushNotifyFollow: data?.push_notify_follow !== false,
    forumEmailDigest: data?.forum_email_digest !== false,
  };
}

export async function updateNotificationPrefs(
  userId: string,
  patch: Partial<NotificationPrefs>
) {
  const supabase = createServerSupabase();
  const update: Record<string, boolean> = {};

  if (patch.tipNotifyEmail !== undefined) {
    update.tip_notify_email = patch.tipNotifyEmail;
  }
  if (patch.tipNotifyInApp !== undefined) {
    update.tip_notify_in_app = patch.tipNotifyInApp;
  }
  if (patch.forumReplyNotifyEmail !== undefined) {
    update.forum_reply_notify_email = patch.forumReplyNotifyEmail;
  }
  if (patch.forumReplyNotifyInApp !== undefined) {
    update.forum_reply_notify_in_app = patch.forumReplyNotifyInApp;
  }
  if (patch.followNewGameEmail !== undefined) {
    update.follow_new_game_email = patch.followNewGameEmail;
  }
  if (patch.followNewGameInApp !== undefined) {
    update.follow_new_game_in_app = patch.followNewGameInApp;
  }
  if (patch.pushNotifyEnabled !== undefined) {
    update.push_notify_enabled = patch.pushNotifyEnabled;
  }
  if (patch.pushNotifyTip !== undefined) {
    update.push_notify_tip = patch.pushNotifyTip;
  }
  if (patch.pushNotifyForum !== undefined) {
    update.push_notify_forum = patch.pushNotifyForum;
  }
  if (patch.pushNotifyFollow !== undefined) {
    update.push_notify_follow = patch.pushNotifyFollow;
  }
  if (patch.forumEmailDigest !== undefined) {
    update.forum_email_digest = patch.forumEmailDigest;
  }

  if (Object.keys(update).length === 0) {
    return readNotificationPrefs(userId);
  }

  const { error } = await supabase.from("profiles").update(update).eq("id", userId);

  if (error) throw new Error(error.message);

  return readNotificationPrefs(userId);
}

export async function shouldCreateInAppNotification(
  userId: string,
  kind: UserNotificationKind
) {
  const prefs = await readNotificationPrefs(userId);

  if (kind === "tip_received") return prefs.tipNotifyInApp;
  if (kind === "forum_reply") return prefs.forumReplyNotifyInApp;
  return prefs.followNewGameInApp;
}

export async function shouldSendPushNotification(
  userId: string,
  kind: UserNotificationKind
) {
  const prefs = await readNotificationPrefs(userId);
  if (!prefs.pushNotifyEnabled) return false;

  if (kind === "tip_received") return prefs.pushNotifyTip;
  if (kind === "forum_reply") return prefs.pushNotifyForum;
  return prefs.pushNotifyFollow;
}
