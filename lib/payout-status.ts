/** 創作者收款／Stripe Connect 狀態 */

export type PayoutStatus = "none" | "pending" | "active" | "restricted";

export type CreatorPayoutSnapshot = {
  payoutStatus: PayoutStatus;
  stripeConnectAccountId: string | null;
  stripeDetailsSubmitted: boolean;
  creatorBalanceUsd: number;
  payoutOnboardedAt: string | null;
  stripeConfigured: boolean;
  paymentsLive: boolean;
  availableStripeBalanceUsd: number | null;
  minPayoutThresholdUsd: number;
  canWithdraw: boolean;
  withdrawalMode: "preview" | "live" | "disabled";
};

export type CreatorPayoutRecord = {
  id: string;
  amount_usd: number;
  status: string;
  mode: string;
  created_at: string;
  completed_at: string | null;
  failure_reason: string | null;
};

/** 最低提領門檻（USD），上線時可調整 */
export const MIN_PAYOUT_THRESHOLD_USD = 25;

export function normalizePayoutStatus(value: unknown): PayoutStatus {
  if (
    value === "pending" ||
    value === "active" ||
    value === "restricted" ||
    value === "none"
  ) {
    return value;
  }
  return "none";
}

export function isPayoutReady(status: PayoutStatus) {
  return status === "active";
}

export function formatPayoutMoney(value: number) {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
