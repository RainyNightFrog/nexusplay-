import type { SupabaseClient } from "@supabase/supabase-js";
import {
  formatPayoutMoney,
  MIN_PAYOUT_THRESHOLD_USD,
  normalizePayoutStatus,
  isPayoutReady,
  type CreatorPayoutSnapshot,
  type PayoutStatus,
} from "@/lib/payout-status";
import {
  createConnectOnboardingLink,
  createExpressConnectAccount,
  fetchConnectAccount,
  fetchConnectAvailableBalanceUsd,
  isPaymentsLive,
  isStripeConfigured,
  resolveSiteUrl,
  syncPayoutStatusFromAccount,
} from "@/lib/stripe-connect";
import { computeCanWithdraw } from "@/lib/creator-payout-withdraw";
import { createServerSupabase } from "@/lib/supabase-server";

type ProfilePayoutRow = {
  stripe_connect_account_id: string | null;
  payout_status: string;
  creator_balance_usd: number | string | null;
  payout_onboarded_at: string | null;
  stripe_customer_id: string | null;
  display_name: string;
};

export async function readCreatorPayoutRow(
  supabase: SupabaseClient,
  userId: string
): Promise<ProfilePayoutRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "stripe_connect_account_id, payout_status, creator_balance_usd, payout_onboarded_at, stripe_customer_id, display_name"
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as ProfilePayoutRow | null;
}

export function buildPayoutSnapshot(
  row: ProfilePayoutRow | null,
  options?: { stripeAvailableUsd?: number | null }
): CreatorPayoutSnapshot {
  const balanceRaw = row?.creator_balance_usd ?? 0;
  const balance =
    typeof balanceRaw === "number"
      ? balanceRaw
      : Number.parseFloat(String(balanceRaw)) || 0;

  const paymentsLive = isPaymentsLive();
  const payoutStatus = normalizePayoutStatus(row?.payout_status);
  const stripeAvailable =
    paymentsLive && options?.stripeAvailableUsd != null
      ? options.stripeAvailableUsd
      : null;

  let withdrawalMode: CreatorPayoutSnapshot["withdrawalMode"] = "disabled";
  if (isPayoutReady(payoutStatus)) {
    withdrawalMode = paymentsLive ? "live" : "preview";
  }

  return {
    payoutStatus,
    stripeConnectAccountId: row?.stripe_connect_account_id ?? null,
    creatorBalanceUsd: Math.round(balance * 100) / 100,
    payoutOnboardedAt: row?.payout_onboarded_at ?? null,
    stripeConfigured: isStripeConfigured(),
    paymentsLive,
    availableStripeBalanceUsd: stripeAvailable,
    minPayoutThresholdUsd: MIN_PAYOUT_THRESHOLD_USD,
    canWithdraw: computeCanWithdraw({
      payoutStatus,
      ledgerBalance: balance,
      stripeAvailable,
      paymentsLive,
    }),
    withdrawalMode,
  };
}

export async function syncConnectAccountStatus(userId: string, accountId: string) {
  const account = await fetchConnectAccount(accountId);
  const { payoutStatus, onboardedAt } = syncPayoutStatusFromAccount(account);
  const supabase = createServerSupabase();

  const updates: Record<string, unknown> = {
    payout_status: payoutStatus,
  };

  if (onboardedAt && payoutStatus === "active") {
    const { data: existing } = await supabase
      .from("profiles")
      .select("payout_onboarded_at")
      .eq("id", userId)
      .maybeSingle();

    if (!existing?.payout_onboarded_at) {
      updates.payout_onboarded_at = onboardedAt;
    }
  }

  await supabase.from("profiles").update(updates).eq("id", userId);

  return payoutStatus as PayoutStatus;
}

export async function startConnectOnboarding(params: {
  userId: string;
  email: string;
  displayName: string;
  origin: string;
  locale?: string;
}) {
  if (!isStripeConfigured()) {
    return { mode: "preview" as const };
  }

  if (!isPaymentsLive()) {
    return { mode: "preview" as const };
  }

  const supabase = createServerSupabase();
  const row = await readCreatorPayoutRow(supabase, params.userId);
  let accountId = row?.stripe_connect_account_id ?? null;

  if (!accountId) {
    const account = await createExpressConnectAccount({
      userId: params.userId,
      email: params.email,
      displayName: params.displayName,
    });
    accountId = account.id;

    await supabase
      .from("profiles")
      .update({
        stripe_connect_account_id: accountId,
        payout_status: "pending",
      })
      .eq("id", params.userId);
  }

  const siteUrl = resolveSiteUrl(params.origin);
  const localePrefix =
    params.locale && params.locale !== "zh-HK" ? `/${params.locale}` : "";
  const returnPath = `${localePrefix}/settings/payout?onboard=return`;
  const refreshPath = `${localePrefix}/settings/payout?onboard=refresh`;

  const link = await createConnectOnboardingLink({
    accountId,
    returnUrl: `${siteUrl}${returnPath}`,
    refreshUrl: `${siteUrl}${refreshPath}`,
  });

  return { mode: "live" as const, url: link.url };
}

export { formatPayoutMoney, MIN_PAYOUT_THRESHOLD_USD };
