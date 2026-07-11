"use client";

import { Crown, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  getSupporterDisplayTier,
  type SupporterDisplayTier,
} from "@/lib/supporter-tier";
import { cn } from "@/lib/utils";

type SupporterBadgeProps = {
  className?: string;
  size?: "sm" | "md";
  showLabel?: boolean;
  isSupporter?: boolean;
  supporterBadge?: string | null;
  tier?: SupporterDisplayTier;
};

export function SupporterBadge({
  className,
  size = "sm",
  showLabel = false,
  isSupporter = false,
  supporterBadge = null,
  tier,
}: SupporterBadgeProps) {
  const t = useTranslations("supporter");
  const displayTier =
    tier ?? getSupporterDisplayTier(isSupporter, supporterBadge);

  if (displayTier === "none") {
    return null;
  }

  const isPremium = displayTier === "premium";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border font-medium",
        isPremium
          ? "border-violet-300/40 bg-gradient-to-r from-amber-500/20 via-rose-500/15 to-violet-500/20 text-violet-100 shadow-[0_0_14px_rgba(167,139,250,0.18)]"
          : "border-amber-400/30 bg-amber-500/10 text-amber-100",
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
        className
      )}
      title={isPremium ? t("badgeTitlePremium") : t("badgeTitle")}
    >
      {isPremium ? (
        <Crown
          className={cn(
            "text-violet-200",
            size === "sm" ? "size-3" : "size-3.5"
          )}
        />
      ) : (
        <Sparkles
          className={cn(
            "text-amber-300",
            size === "sm" ? "size-3" : "size-3.5"
          )}
        />
      )}
      {showLabel && (
        <span>{isPremium ? t("badgeLabelPremium") : t("badgeLabel")}</span>
      )}
    </span>
  );
}

/** @deprecated Use supporterUsernameClassByTier from lib/supporter-tier */
export const supporterUsernameClassName =
  "bg-gradient-to-r from-amber-100 via-rose-100 to-violet-200 bg-clip-text text-transparent";
