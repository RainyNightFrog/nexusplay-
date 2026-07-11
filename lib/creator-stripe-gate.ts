import type { GamePricingPayload, GamePricingType } from "@/lib/game-pricing";
import { isPayoutReady, normalizePayoutStatus } from "@/lib/payout-status";

export type CreatorStripeConnectRow = {
  stripe_account_id?: string | null;
  stripe_connect_account_id?: string | null;
  stripe_details_submitted?: boolean | null;
  payout_status?: string | null;
};

export function resolveStripeAccountId(
  row: CreatorStripeConnectRow | null | undefined
): string | null {
  if (!row) return null;
  return row.stripe_account_id ?? row.stripe_connect_account_id ?? null;
}

export function pricingRequiresStripeConnect(
  pricing: Pick<GamePricingPayload, "pricing_type">
): boolean {
  return pricing.pricing_type !== "free";
}

export function pricingValuesRequireStripeConnect(input: {
  pricingType: GamePricingType;
}): boolean {
  return input.pricingType !== "free";
}

export function canCreatorReceivePaidPayments(
  row: CreatorStripeConnectRow | null | undefined
): boolean {
  const accountId = resolveStripeAccountId(row);
  if (!accountId) return false;

  const payoutStatus = normalizePayoutStatus(row?.payout_status);
  if (!isPayoutReady(payoutStatus)) {
    return false;
  }

  if (row?.stripe_details_submitted === false) {
    return false;
  }

  return true;
}

export function paidPublishStripeConnectError(): string {
  return "發布付費遊戲前，請先完成 Stripe 收款帳戶連結";
}
