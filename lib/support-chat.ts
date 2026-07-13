/** 創作者與平台管理員的支援私訊 */

export const ADMIN_SUPPORT_CONTACT_ID = "__platform_admin__";

export const SUPPORT_CHAT_LIMITS = {
  content: 500,
  historyDays: 180,
  pageSize: 200,
} as const;

export type SupportThreadStatus = "open" | "resolved" | "closed";

export type SupportMessageSenderType = "user" | "admin";

export type SupportThreadSummary = {
  id: string;
  user_id: string;
  status: SupportThreadStatus;
  last_message_at: string;
  last_message_preview: string | null;
  unread_by_admin: boolean;
  unread_by_user: boolean;
  created_at: string;
};

export type SupportMessage = {
  id: string;
  thread_id: string;
  sender_type: SupportMessageSenderType;
  sender_user_id: string;
  sender_display_name: string;
  content: string;
  created_at: string;
  is_own: boolean;
};

export type AdminSupportThread = SupportThreadSummary & {
  creator_display_name: string;
  creator_role: string;
};

export type CreatorAdminContactSummary = {
  id: typeof ADMIN_SUPPORT_CONTACT_ID;
  displayName: string;
  avatarUrl: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unread: boolean;
  pinned: true;
};
