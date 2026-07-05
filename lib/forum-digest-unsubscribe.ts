import {
  readNotificationPrefs,
  updateNotificationPrefs,
} from "@/lib/notification-prefs-service";

export type ForumDigestUnsubscribeResult =
  | "success"
  | "already"
  | "invalid"
  | "misconfigured";

export async function unsubscribeForumDigestEmail(
  userId: string
): Promise<"success" | "already"> {
  const prefs = await readNotificationPrefs(userId);
  if (!prefs.forumEmailDigest) {
    return "already";
  }

  await updateNotificationPrefs(userId, { forumEmailDigest: false });
  return "success";
}
