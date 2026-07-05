"use client";

import { Info, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import {
  estimateCreatorNetFromTip,
  FEE_CHANGE_NOTICE_DAYS,
  isPlatformFeeWaived,
  PAYMENT_PROCESSOR_FEE_FIXED_USD,
  PAYMENT_PROCESSOR_FEE_PERCENT,
  PLANNED_FUTURE_PLATFORM_FEE_PERCENT,
  PLANNED_PLATFORM_FEE_PERCENT,
} from "@/lib/tip-fee-policy";
import { cn } from "@/lib/utils";

type TipsFeeDisclosureProps = {
  variant?: "compact" | "full";
  exampleTipAmount?: number;
  className?: string;
};

export function TipsFeeDisclosure({
  variant = "full",
  exampleTipAmount = 10,
  className,
}: TipsFeeDisclosureProps) {
  const t = useTranslations("dashboard");
  const platformPercent = PLANNED_PLATFORM_FEE_PERCENT;
  const feeWaived = isPlatformFeeWaived(platformPercent);
  const example = estimateCreatorNetFromTip(exampleTipAmount, platformPercent);

  return (
    <div
      className={cn(
        "rounded-2xl border border-cyan-400/15 bg-cyan-500/[0.04] p-4 text-left",
        "shadow-[0_0_24px_rgba(34,211,238,0.06)]",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Info className="size-4 shrink-0 text-cyan-400" />
        <p className="text-sm font-medium text-cyan-100">
          {t("tipsFeeDisclosureTitle")}
        </p>
        {feeWaived && (
          <Badge className="border-0 bg-emerald-500/20 text-emerald-200">
            {t("tipsFeeWaivedBadge")}
          </Badge>
        )}
        <Badge
          variant="outline"
          className="border-amber-400/30 bg-amber-500/10 text-amber-200"
        >
          <Sparkles className="mr-1 size-3" />
          {t("tipsPreviewBanner")}
        </Badge>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-zinc-400">
        {t("tipsFeeDisclosureIntro")}
      </p>

      <div className="mt-4 space-y-3">
        <FeeBlock
          title={t("tipsFeePerTransactionTitle")}
          description={t("tipsFeePerTransactionDesc")}
        />
        <FeeBlock
          title={
            feeWaived
              ? t("tipsFeePlatformTitleZero")
              : t("tipsFeePlatformTitle", { percent: platformPercent })
          }
          description={
            feeWaived
              ? t("tipsFeePlatformDescZero")
              : t("tipsFeePlatformDesc", { percent: platformPercent })
          }
        />
        <FeeBlock
          title={t("tipsFeePaymentTitle")}
          description={t("tipsFeePaymentDesc", {
            percent: PAYMENT_PROCESSOR_FEE_PERCENT,
            fixed: PAYMENT_PROCESSOR_FEE_FIXED_USD.toFixed(2),
          })}
        />
        {variant === "full" && (
          <>
            <FeeBlock
              title={t("tipsFeeChangePolicyTitle")}
              description={t("tipsFeeChangePolicyDesc", {
                days: FEE_CHANGE_NOTICE_DAYS,
                futurePercent: PLANNED_FUTURE_PLATFORM_FEE_PERCENT,
              })}
              accent="amber"
            />
            <FeeBlock
              title={t("tipsFeeGrandfatherTitle")}
              description={t("tipsFeeGrandfatherDesc")}
              accent="violet"
            />
            <FeeBlock
              title={t("tipsFeeItchCompareTitle")}
              description={t("tipsFeeItchCompareDesc", {
                futurePercent: PLANNED_FUTURE_PLATFORM_FEE_PERCENT,
              })}
              accent="violet"
            />
            <FeeBlock
              title={t("tipsFeePlayerBriefTitle")}
              description={t("tipsFeePlayerBriefDesc")}
              accent="emerald"
            />
          </>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-white/8 bg-zinc-950/60 p-3">
        <p className="text-xs font-medium text-zinc-300">
          {t("tipsFeeCreatorNetTitle")}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          {feeWaived
            ? t("tipsFeeCreatorNetFormulaZero")
            : t("tipsFeeCreatorNetFormula")}
        </p>
        <p className="mt-2 font-mono text-xs text-cyan-300/90">
          {feeWaived
            ? t("tipsFeeExampleLineZero", {
                tip: example.tipAmountUsd.toFixed(2),
                processor: example.processorFee.toFixed(2),
                net: example.net.toFixed(2),
              })
            : t("tipsFeeExampleLine", {
                tip: example.tipAmountUsd.toFixed(2),
                platform: example.platformFee.toFixed(2),
                processor: example.processorFee.toFixed(2),
                net: example.net.toFixed(2),
              })}
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-zinc-600">
          {t("tipsFeeSettlementDesc")}
        </p>
      </div>
    </div>
  );
}

function FeeBlock({
  title,
  description,
  accent = "cyan",
}: {
  title: string;
  description: string;
  accent?: "cyan" | "violet" | "emerald" | "amber";
}) {
  const dotClass =
    accent === "violet"
      ? "bg-violet-400"
      : accent === "emerald"
        ? "bg-emerald-400"
        : accent === "amber"
          ? "bg-amber-400"
          : "bg-cyan-400";

  return (
    <div className="flex gap-2.5">
      <span
        className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", dotClass)}
      />
      <div>
        <p className="text-xs font-medium text-zinc-200">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
          {description}
        </p>
      </div>
    </div>
  );
}
