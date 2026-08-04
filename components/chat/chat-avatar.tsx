"use client";

import { UserAvatar } from "@/components/ui/user-avatar";

type ChatAvatarProps = {
  url: string | null | undefined;
  name: string;
  className?: string;
};

/** 聊天頭像：同源代理 DiceBear + 載入失敗改顯示名稱首字（避免手機破圖問號） */
export function ChatAvatar({ url, name, className }: ChatAvatarProps) {
  return <UserAvatar url={url} name={name} className={className} />;
}
