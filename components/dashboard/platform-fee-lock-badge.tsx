"use client";

import { Badge } from "@/components/ui/badge";
import { isPlatformFeeWaived } from "@/lib/tip-fee-policy";
import { cn } from "@/lib/utils";
import { Lock, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

type PlatformFeeLockBadgeProps = {
  lockedPercent: number | null | undefined;
  tipsEnabled: boolean;
  className?: string;
};

export function PlatformFeeLockBadge({
  lockedPercent,
  tipsEnabled,
  className,
}: PlatformFeeLockBadgeProps) {
  const t = useTranslations("dashboard");

  if (!tipsEnabled || lockedPercent == null) {
    return null;
  }

  const waived = isPlatformFeeWaived(lockedPercent);

  return (
    <div
      className={cn(
        "rounded-xl border border-emerald-400/20 bg-emerald-500/[0.06] px-4 py-3",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Lock className="size-4 text-emerald-400" />
        <p className="text-sm font-medium text-emerald-100">
          {t("platformFeeLockedTitle")}
        </p>
        <Badge
          className={cn(
            "border-0",
            waived
              ? "bg-emerald-500/20 text-emerald-200"
              : "bg-amber-500/20 text-amber-200"
          )}
        >
          {waived
            ? t("platformFeeLockedZero")
            : t("platformFeeLockedPercent", { percent: lockedPercent })}
        </Badge>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-zinc-500">
        {t("platformFeeLockedDesc")}
      </p>
      {waived && (
        <p className="mt-1 flex items-center gap-1 text-[11px] text-emerald-400/80">
          <Sparkles className="size-3" />
          {t("platformFeeLockedGrandfatherNote")}
        </p>
      )}
    </div>
  );
}
