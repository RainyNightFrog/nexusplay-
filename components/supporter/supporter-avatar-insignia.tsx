"use client";

import { useTranslations } from "next-intl";
import {
  getSupporterDisplayTier,
  type SupporterDisplayTier,
} from "@/lib/supporter-tier";
import { cn } from "@/lib/utils";

type SupporterAvatarInsigniaProps = {
  isSupporter?: boolean;
  supporterBadge?: string | null;
  tier?: SupporterDisplayTier;
  size?: "xs" | "sm" | "md";
  className?: string;
};

export function SupporterAvatarInsignia({
  isSupporter = false,
  supporterBadge = null,
  tier,
  size = "sm",
  className,
}: SupporterAvatarInsigniaProps) {
  const t = useTranslations("supporter");
  const displayTier =
    tier ?? getSupporterDisplayTier(isSupporter, supporterBadge);

  if (displayTier === "none") return null;

  const isPremium = displayTier === "premium";
  const label = isPremium ? t("badgeLabelPremium") : t("badgeLabel");

  const verticalOffsetClass =
    size === "md"
      ? "-translate-y-[calc(100%+8px)]"
      : size === "sm"
        ? "-translate-y-[calc(100%+5px)]"
        : "-translate-y-[calc(100%+3px)]";

  return (
    <span
      className={cn(
        "absolute left-1/2 top-0 z-20 -translate-x-1/2",
        verticalOffsetClass,
        "rounded-full border font-bold uppercase tracking-wider whitespace-nowrap shadow-lg",
        isPremium
          ? "border-violet-300/45 bg-zinc-950/90 px-1.5 py-0.5"
          : "border-amber-400/50 bg-zinc-950/90 px-1.5 py-0.5 text-amber-300",
        size === "xs" && "text-[8px] px-1 py-px",
        size === "sm" && "text-[9px]",
        size === "md" && "text-[10px] px-2 py-0.5",
        className
      )}
      title={isPremium ? t("badgeTitlePremium") : t("badgeTitle")}
    >
      {isPremium ? (
        <span className="supporter-username supporter-username-premium">
          {label}
        </span>
      ) : (
        label
      )}
    </span>
  );
}
