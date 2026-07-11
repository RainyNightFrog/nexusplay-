"use client";

import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type SupporterBadgeProps = {
  className?: string;
  size?: "sm" | "md";
  showLabel?: boolean;
};

export function SupporterBadge({
  className,
  size = "sm",
  showLabel = false,
}: SupporterBadgeProps) {
  const t = useTranslations("supporter");

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/10 font-medium text-amber-100",
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
        className
      )}
      title={t("badgeTitle")}
    >
      <Sparkles
        className={cn(
          "text-amber-300",
          size === "sm" ? "size-3" : "size-3.5"
        )}
      />
      {showLabel && <span>{t("badgeLabel")}</span>}
    </span>
  );
}

export const supporterUsernameClassName =
  "bg-gradient-to-r from-amber-100 via-rose-100 to-violet-200 bg-clip-text text-transparent";
