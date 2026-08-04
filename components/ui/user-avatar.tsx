"use client";

import { useEffect, useState, type ReactNode } from "react";
import { toDisplayAvatarUrl } from "@/lib/avatar-display-url";
import { cn } from "@/lib/utils";

type UserAvatarProps = {
  url: string | null | undefined;
  name: string;
  className?: string;
  /** 載入失敗或無 URL 時的自訂 fallback；預設顯示名稱首字 */
  fallback?: ReactNode;
};

/**
 * 全站頭像：同源代理 DiceBear + 原生 img（避開 next/image 代理超時），
 * 載入失敗改顯示 fallback／名稱首字。
 */
export function UserAvatar({
  url,
  name,
  className,
  fallback,
}: UserAvatarProps) {
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
        {fallback ?? initial}
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
