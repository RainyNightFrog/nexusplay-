"use client";

import { useTranslations } from "next-intl";
import {
  getSupporterDisplayTier,
  isSvipLikeTier,
  type SupporterDisplayTier,
} from "@/lib/supporter-tier";
import { cn } from "@/lib/utils";

type SupporterBadgeProps = {
  className?: string;
  size?: "sm" | "md";
  showLabel?: boolean;
  isSupporter?: boolean;
  supporterBadge?: string | null;
  supporterLifetime?: boolean;
  tier?: SupporterDisplayTier;
};

export function SupporterBadge({
  className,
  size = "sm",
  showLabel = true,
  isSupporter = false,
  supporterBadge = null,
  supporterLifetime = false,
  tier,
}: SupporterBadgeProps) {
  const t = useTranslations("supporter");
  const displayTier =
    tier ??
    getSupporterDisplayTier(
      isSupporter,
      supporterBadge,
      null,
      supporterLifetime
    );

  if (displayTier === "none") {
    return null;
  }

  const isLifetime = displayTier === "lifetime";
  const isPremiumLike = isSvipLikeTier(displayTier);
  const label = isLifetime
    ? t("badgeLabelLifetime")
    : isPremiumLike
      ? t("badgeLabelPremium")
      : t("badgeLabel");
  const title = isLifetime
    ? t("badgeTitleLifetime")
    : isPremiumLike
      ? t("badgeTitlePremium")
      : t("badgeTitle");

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border font-bold uppercase tracking-wider",
        isLifetime
          ? "border-amber-300/50 bg-zinc-950/80 shadow-[0_0_14px_rgba(251,191,36,0.28)]"
          : isPremiumLike
            ? "border-violet-300/40 bg-zinc-950/75 shadow-[0_0_12px_rgba(167,139,250,0.2)]"
            : "border-amber-400/40 bg-amber-500/10 text-amber-200",
        size === "sm" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]",
        className
      )}
      title={title}
    >
      {showLabel ? (
        isLifetime ? (
          <span className="supporter-username supporter-username-lifetime">
            {label}
          </span>
        ) : isPremiumLike ? (
          <span className="supporter-username supporter-username-premium">
            {label}
          </span>
        ) : (
          label
        )
      ) : null}
    </span>
  );
}

/** @deprecated Use supporterUsernameClassByTier from lib/supporter-tier */
export const supporterUsernameClassName =
  "bg-gradient-to-r from-amber-100 via-rose-100 to-violet-200 bg-clip-text text-transparent";
