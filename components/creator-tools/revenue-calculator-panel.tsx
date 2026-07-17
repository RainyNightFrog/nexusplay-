"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Calculator, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PLATFORM_FEE_PRESETS,
  projectMonthlyRevenue,
  projectSaleDiscount,
  projectSingleTipNet,
} from "@/lib/creator-tools/revenue-calculator";
import type { GamePricingType } from "@/lib/game-pricing";
import { ToolMetric, ToolSectionCard } from "@/components/creator-tools/tool-section-card";
import { cn } from "@/lib/utils";

const inputClass = cn(
  "h-10 w-full rounded-xl border border-white/10 bg-zinc-950/60 px-3 text-center text-sm text-zinc-100",
  "outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-500/20"
);

export function RevenueCalculatorPanel() {
  const t = useTranslations("creatorTools");

  const [platformFeePercent, setPlatformFeePercent] = useState(0);
  const [monthlyTips, setMonthlyTips] = useState("12");
  const [avgTipUsd, setAvgTipUsd] = useState("5");
  const [pricingType, setPricingType] = useState<GamePricingType>("free");
  const [monthlySales, setMonthlySales] = useState("8");
  const [salePriceUsd, setSalePriceUsd] = useState("4.99");
  const [pwywAvgUsd, setPwywAvgUsd] = useState("3");
  const [discountPercent, setDiscountPercent] = useState("20");

  const projection = useMemo(
    () =>
      projectMonthlyRevenue({
        platformFeePercent,
        monthlyTips: Number.parseFloat(monthlyTips) || 0,
        avgTipUsd: Number.parseFloat(avgTipUsd) || 0,
        monthlySales: Number.parseFloat(monthlySales) || 0,
        salePriceUsd: Number.parseFloat(salePriceUsd) || 0,
        pricingType,
        pwywAvgUsd: Number.parseFloat(pwywAvgUsd) || 0,
      }),
    [
      platformFeePercent,
      monthlyTips,
      avgTipUsd,
      monthlySales,
      salePriceUsd,
      pricingType,
      pwywAvgUsd,
    ]
  );

  const singleTip = useMemo(
    () => projectSingleTipNet(Number.parseFloat(avgTipUsd) || 0, platformFeePercent),
    [avgTipUsd, platformFeePercent]
  );

  const discountPreview = useMemo(
    () =>
      projectSaleDiscount(
        Number.parseFloat(salePriceUsd) || 0,
        Number.parseFloat(discountPercent) || 0,
        platformFeePercent
      ),
    [salePriceUsd, discountPercent, platformFeePercent]
  );

  return (
    <ToolSectionCard
      title={t("revenueTitle")}
      description={t("revenueDesc")}
      icon={<Calculator className="size-5" />}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap justify-center gap-2">
          {PLATFORM_FEE_PRESETS.map((preset) => (
            <Button
              key={preset.labelKey}
              type="button"
              size="sm"
              variant={platformFeePercent === preset.value ? "default" : "outline"}
              onClick={() => setPlatformFeePercent(preset.value)}
              className={cn(
                platformFeePercent === preset.value
                  ? "border-0 bg-gradient-to-r from-cyan-500 to-violet-600 text-white"
                  : "border-white/10 bg-white/5 text-zinc-300"
              )}
            >
              {t(preset.labelKey, { percent: preset.value })}
            </Button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-1.5 text-center">
            <span className="text-xs text-zinc-400">{t("revenueMonthlyTips")}</span>
            <input
              type="number"
              min={0}
              value={monthlyTips}
              onChange={(e) => setMonthlyTips(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="space-y-1.5 text-center">
            <span className="text-xs text-zinc-400">{t("revenueAvgTip")}</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={avgTipUsd}
              onChange={(e) => setAvgTipUsd(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="space-y-1.5 text-center">
            <span className="text-xs text-zinc-400">{t("revenuePricingType")}</span>
            <select
              value={pricingType}
              onChange={(e) => setPricingType(e.target.value as GamePricingType)}
              className={inputClass}
            >
              <option value="free">{t("revenuePricingFree")}</option>
              <option value="fixed">{t("revenuePricingFixed")}</option>
              <option value="pwyw">{t("revenuePricingPwyw")}</option>
            </select>
          </label>
          {pricingType !== "free" && (
            <>
              <label className="space-y-1.5 text-center">
                <span className="text-xs text-zinc-400">{t("revenueMonthlySales")}</span>
                <input
                  type="number"
                  min={0}
                  value={monthlySales}
                  onChange={(e) => setMonthlySales(e.target.value)}
                  className={inputClass}
                />
              </label>
              {pricingType === "fixed" ? (
                <label className="space-y-1.5 text-center">
                  <span className="text-xs text-zinc-400">{t("revenueSalePrice")}</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={salePriceUsd}
                    onChange={(e) => setSalePriceUsd(e.target.value)}
                    className={inputClass}
                  />
                </label>
              ) : (
                <label className="space-y-1.5 text-center">
                  <span className="text-xs text-zinc-400">{t("revenuePwywAvg")}</span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={pwywAvgUsd}
                    onChange={(e) => setPwywAvgUsd(e.target.value)}
                    className={inputClass}
                  />
                </label>
              )}
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <ToolMetric
            label={t("revenueGross")}
            value={`$${projection.grossUsd.toFixed(2)}`}
            accent="cyan"
          />
          <ToolMetric
            label={t("revenuePlatformFee")}
            value={`$${projection.platformFeeUsd.toFixed(2)}`}
            accent="amber"
          />
          <ToolMetric
            label={t("revenueProcessorFee")}
            value={`$${projection.processorFeeUsd.toFixed(2)}`}
            accent="rose"
          />
          <ToolMetric
            label={t("revenueNet")}
            value={`$${projection.netUsd.toFixed(2)}`}
            accent="emerald"
          />
        </div>

        <div className="rounded-xl border border-white/8 bg-zinc-950/50 p-4 text-center">
          <div className="mb-3 flex items-center justify-center gap-2 text-sm font-medium text-zinc-200">
            <TrendingUp className="size-4 text-violet-400" />
            {t("revenueBreakdownTitle")}
          </div>
          <div className="space-y-2">
            {projection.lines.map((line) => (
              <div
                key={line.labelKey}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-zinc-400">{t(line.labelKey)}</span>
                <span
                  className={cn(
                    "font-medium tabular-nums",
                    line.negative ? "text-rose-300" : "text-zinc-200"
                  )}
                >
                  {line.negative ? "-" : ""}${line.amountUsd.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-4 text-center">
            <p className="text-xs text-zinc-400">{t("revenueSingleTipPreview")}</p>
            <p className="mt-1 text-2xl font-bold text-cyan-300 tabular-nums">
              ${singleTip.net.toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {t("revenueSingleTipHint", { amount: avgTipUsd })}
            </p>
          </div>

          <div className="rounded-xl border border-violet-400/20 bg-violet-500/5 p-4 text-center">
            <p className="text-xs text-zinc-400">{t("revenueDiscountPreview")}</p>
            <div className="mt-2 flex items-end gap-2">
              <label className="flex-1 space-y-1 text-center">
                <span className="text-[11px] text-zinc-500">{t("revenueDiscountPercent")}</span>
                <input
                  type="range"
                  min={0}
                  max={80}
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  className="w-full accent-violet-400"
                />
              </label>
              <span className="text-sm font-medium text-violet-300 tabular-nums">
                {discountPercent}%
              </span>
            </div>
            <p className="mt-2 text-sm text-zinc-300">
              {t("revenueDiscountResult", {
                original: discountPreview.originalPriceUsd.toFixed(2),
                discounted: discountPreview.discountedPriceUsd.toFixed(2),
                net: discountPreview.creatorNetUsd.toFixed(2),
              })}
            </p>
          </div>
        </div>
      </div>
    </ToolSectionCard>
  );
}
