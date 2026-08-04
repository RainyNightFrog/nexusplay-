"use client";

import { useEffect, useState } from "react";
import { toDisplayAvatarUrl } from "@/lib/avatar-display-url";
import { cn } from "@/lib/utils";

type ChatAvatarProps = {
  url: string | null | undefined;
  name: string;
  className?: string;
};

/** 聊天頭像：同源代理 DiceBear + 載入失敗改顯示名稱首字（避免手機破圖問號） */
export function ChatAvatar({ url, name, className }: ChatAvatarProps) {
  const displayUrl = toDisplayAvatarUrl(url);
  const [failed, setFailed] = useState(false);
  const initial = name.trim().slice(0, 1) || "?";

  useEffect(() => {
    setFailed(false);
  }, [displayUrl]);

  if (!displayUrl || failed) {
    return (
      <span
        className={cn(
          "flex size-full items-center justify-center",
          className
        )}
      >
        {initial}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={displayUrl}
      alt=""
      className={cn("size-full object-cover", className)}
      referrerPolicy="no-referrer"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
