import {
  estimateCreatorNetFromTip,
  PAYMENT_PROCESSOR_FEE_FIXED_USD,
  PAYMENT_PROCESSOR_FEE_PERCENT,
  PLANNED_FUTURE_PLATFORM_FEE_PERCENT,
  PLANNED_PLATFORM_FEE_PERCENT,
  resolveEffectivePlatformFeePercent,
} from "@/lib/tip-fee-policy";
import type { GamePricingType } from "@/lib/game-pricing";

export type RevenueScenario = {
  platformFeePercent: number;
  monthlyTips: number;
  avgTipUsd: number;
  monthlySales: number;
  salePriceUsd: number;
  pricingType: GamePricingType;
  pwywAvgUsd: number;
};

export type RevenueBreakdownLine = {
  labelKey: string;
  amountUsd: number;
  negative?: boolean;
};

export type RevenueProjection = {
  grossUsd: number;
  platformFeeUsd: number;
  processorFeeUsd: number;
  netUsd: number;
  lines: RevenueBreakdownLine[];
  platformFeePercent: number;
};

function estimateProcessorFee(grossUsd: number) {
  return (
    Math.round(
      (grossUsd * (PAYMENT_PROCESSOR_FEE_PERCENT / 100) +
        PAYMENT_PROCESSOR_FEE_FIXED_USD *
          Math.max(1, Math.ceil(grossUsd > 0 ? 1 : 0))) *
        100
    ) / 100
  );
}

function estimateSaleNet(
  grossUsd: number,
  transactionCount: number,
  platformFeePercent: number
) {
  const platformFee =
    Math.round(grossUsd * (platformFeePercent / 100) * 100) / 100;
  const processorFee =
    Math.round(
      transactionCount *
        (PAYMENT_PROCESSOR_FEE_FIXED_USD +
          (grossUsd / Math.max(transactionCount, 1)) *
            (PAYMENT_PROCESSOR_FEE_PERCENT / 100)) *
        100
    ) / 100;
  const net = Math.round((grossUsd - platformFee - processorFee) * 100) / 100;
  return {
    platformFee,
    processorFee,
    net: Math.max(0, net),
  };
}

export function projectMonthlyRevenue(
  scenario: RevenueScenario,
  lockedPlatformFeePercent?: number | null
): RevenueProjection {
  const platformFeePercent = resolveEffectivePlatformFeePercent(
    scenario.platformFeePercent ?? lockedPlatformFeePercent
  );

  let grossUsd = 0;
  let transactionCount = 0;
  const lines: RevenueBreakdownLine[] = [];

  if (scenario.monthlyTips > 0 && scenario.avgTipUsd > 0) {
    const tipGross = scenario.monthlyTips * scenario.avgTipUsd;
    grossUsd += tipGross;
    transactionCount += scenario.monthlyTips;
    lines.push({
      labelKey: "revenueLineTips",
      amountUsd: tipGross,
    });
  }

  if (scenario.pricingType === "fixed" && scenario.monthlySales > 0) {
    const saleGross = scenario.monthlySales * scenario.salePriceUsd;
    grossUsd += saleGross;
    transactionCount += scenario.monthlySales;
    lines.push({
      labelKey: "revenueLineFixedSales",
      amountUsd: saleGross,
    });
  }

  if (scenario.pricingType === "pwyw" && scenario.monthlySales > 0) {
    const saleGross = scenario.monthlySales * scenario.pwywAvgUsd;
    grossUsd += saleGross;
    transactionCount += scenario.monthlySales;
    lines.push({
      labelKey: "revenueLinePwywSales",
      amountUsd: saleGross,
    });
  }

  const saleNet = estimateSaleNet(grossUsd, transactionCount, platformFeePercent);

  if (saleNet.platformFee > 0) {
    lines.push({
      labelKey: "revenueLinePlatformFee",
      amountUsd: saleNet.platformFee,
      negative: true,
    });
  }

  if (saleNet.processorFee > 0) {
    lines.push({
      labelKey: "revenueLineProcessorFee",
      amountUsd: saleNet.processorFee,
      negative: true,
    });
  }

  return {
    grossUsd: Math.round(grossUsd * 100) / 100,
    platformFeeUsd: saleNet.platformFee,
    processorFeeUsd: saleNet.processorFee,
    netUsd: saleNet.net,
    lines,
    platformFeePercent,
  };
}

export function projectSingleTipNet(
  tipAmountUsd: number,
  platformFeePercent = PLANNED_PLATFORM_FEE_PERCENT
) {
  return estimateCreatorNetFromTip(tipAmountUsd, platformFeePercent);
}

export function projectSaleDiscount(
  priceUsd: number,
  discountPercent: number,
  platformFeePercent = PLANNED_PLATFORM_FEE_PERCENT
) {
  const discounted =
    Math.round(priceUsd * (1 - discountPercent / 100) * 100) / 100;
  const net = estimateSaleNet(discounted, 1, platformFeePercent);
  return {
    originalPriceUsd: priceUsd,
    discountedPriceUsd: discounted,
    discountPercent,
    creatorNetUsd: net.net,
    platformFeeUsd: net.platformFee,
    processorFeeUsd: net.processorFee,
  };
}

export const PLATFORM_FEE_PRESETS = [
  { labelKey: "feePresetCurrent", value: PLANNED_PLATFORM_FEE_PERCENT },
  { labelKey: "feePresetFuture", value: PLANNED_FUTURE_PLATFORM_FEE_PERCENT },
] as const;
