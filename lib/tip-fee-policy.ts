/** 打賞／贊助費用政策常數（金流上線前之規劃基準，可集中調整） */

/** RainyNightFrog 目前全站預設平台服務費（每筆）；早期以 0% 起步 */
export const PLANNED_PLATFORM_FEE_PERCENT = 0;

/** 日後若調整全站費率時的規劃參考值（非目前生效費率） */
export const PLANNED_FUTURE_PLATFORM_FEE_PERCENT = 5;

/** 調整全站平台費率時，最少提前公告天數 */
export const FEE_CHANGE_NOTICE_DAYS = 30;

/** 金流商典型手續費率（Stripe / PayPal 等，每筆另計） */
export const PAYMENT_PROCESSOR_FEE_PERCENT = 2.9;

/** 金流商典型固定手續費（USD，每筆） */
export const PAYMENT_PROCESSOR_FEE_FIXED_USD = 0.3;

export function resolveEffectivePlatformFeePercent(
  lockedPercent?: number | null
): number {
  if (
    lockedPercent != null &&
    Number.isFinite(lockedPercent) &&
    lockedPercent >= 0 &&
    lockedPercent <= 100
  ) {
    return lockedPercent;
  }
  return PLANNED_PLATFORM_FEE_PERCENT;
}

/** 首次開啟打賞時鎖定當下全站費率，供早期創作者 grandfather 使用 */
export function resolvePlatformFeePercentForSave(
  existingLocked: number | null | undefined,
  tipsEnabled: boolean
): number | null {
  if (!tipsEnabled) {
    return existingLocked ?? null;
  }
  if (existingLocked != null) {
    return existingLocked;
  }
  return PLANNED_PLATFORM_FEE_PERCENT;
}

export function estimateCreatorNetFromTip(
  tipAmountUsd: number,
  platformFeePercent = PLANNED_PLATFORM_FEE_PERCENT
) {
  const platformFee =
    Math.round(tipAmountUsd * (platformFeePercent / 100) * 100) / 100;
  const processorFee =
    Math.round(
      (tipAmountUsd * (PAYMENT_PROCESSOR_FEE_PERCENT / 100) +
        PAYMENT_PROCESSOR_FEE_FIXED_USD) *
        100
    ) / 100;
  const net =
    Math.round((tipAmountUsd - platformFee - processorFee) * 100) / 100;

  return {
    tipAmountUsd,
    platformFee,
    processorFee,
    net: Math.max(0, net),
    platformFeePercent,
  };
}

export function isPlatformFeeWaived(platformFeePercent: number) {
  return platformFeePercent <= 0;
}
