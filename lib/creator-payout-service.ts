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
import { resolveStripeAccountId } from "@/lib/creator-stripe-gate";
import { createServerSupabase } from "@/lib/supabase-server";

type ProfilePayoutRow = {
  stripe_account_id: string | null;
  stripe_connect_account_id: string | null;
  stripe_details_submitted: boolean;
  payout_status: string;
  creator_balance_usd: number | string | null;
  payout_onboarded_at: string | null;
  stripe_customer_id: string | null;
  display_name: string;
};

export type ConnectOnboardingReturnTo =
  | "settings"
  | "dashboard"
  | "upload"
  | "edit";

export async function readCreatorPayoutRow(
  supabase: SupabaseClient,
  userId: string
): Promise<ProfilePayoutRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "stripe_account_id, stripe_connect_account_id, stripe_details_submitted, payout_status, creator_balance_usd, payout_onboarded_at, stripe_customer_id, display_name"
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
    stripeConnectAccountId: resolveStripeAccountId(row),
    stripeDetailsSubmitted: row?.stripe_details_submitted ?? false,
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
  const { payoutStatus, onboardedAt, stripeDetailsSubmitted } =
    syncPayoutStatusFromAccount(account);
  const supabase = createServerSupabase();

  const updates: Record<string, unknown> = {
    payout_status: payoutStatus,
    stripe_account_id: accountId,
    stripe_connect_account_id: accountId,
    stripe_details_submitted: stripeDetailsSubmitted,
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

export async function clearInvalidConnectAccount(userId: string) {
  const supabase = createServerSupabase();
  await supabase
    .from("profiles")
    .update({
      stripe_account_id: null,
      stripe_connect_account_id: null,
      payout_status: "none",
      stripe_details_submitted: false,
    })
    .eq("id", userId);
}

function resolveOnboardingPaths(params: {
  returnTo: ConnectOnboardingReturnTo;
  locale?: string;
  gameId?: number;
}) {
  const localePrefix =
    params.locale && params.locale !== "zh-HK" ? `/${params.locale}` : "";

  switch (params.returnTo) {
    case "dashboard":
      return {
        returnPath: `${localePrefix}/dashboard?stripeConnect=return`,
        refreshPath: `${localePrefix}/dashboard?stripeConnect=refresh`,
      };
    case "upload":
      return {
        returnPath: `${localePrefix}/dashboard/upload?stripeConnect=return`,
        refreshPath: `${localePrefix}/dashboard/upload?stripeConnect=refresh`,
      };
    case "edit":
      return {
        returnPath: `${localePrefix}/dashboard/edit/${params.gameId}?stripeConnect=return`,
        refreshPath: `${localePrefix}/dashboard/edit/${params.gameId}?stripeConnect=refresh`,
      };
    default:
      return {
        returnPath: `${localePrefix}/settings/payout?onboard=return`,
        refreshPath: `${localePrefix}/settings/payout?onboard=refresh`,
      };
  }
}

export async function startConnectOnboarding(params: {
  userId: string;
  email: string;
  displayName: string;
  origin: string;
  locale?: string;
  returnTo?: ConnectOnboardingReturnTo;
  gameId?: number;
}) {
  if (!isStripeConfigured()) {
    return { mode: "preview" as const };
  }

  if (!isPaymentsLive()) {
    return { mode: "preview" as const };
  }

  const supabase = createServerSupabase();
  const row = await readCreatorPayoutRow(supabase, params.userId);
  let accountId = resolveStripeAccountId(row);

  if (accountId) {
    const { isConnectDestinationValid } = await import("@/lib/stripe-connect");
    const valid = await isConnectDestinationValid(accountId);
    if (!valid) {
      await clearInvalidConnectAccount(params.userId);
      accountId = null;
    }
  }

  if (!accountId) {
    let account;
    try {
      account = await createExpressConnectAccount({
        userId: params.userId,
        email: params.email,
        displayName: params.displayName,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        message.includes("signed up for Connect") ||
        message.includes("dashboard.stripe.com/connect")
      ) {
        throw new Error(
          "平台尚未在 Stripe 開通 Connect。請用平台 Stripe 帳號登入後台，前往 https://dashboard.stripe.com/connect 完成 Connect 註冊後再試。"
        );
      }
      throw error;
    }
    accountId = account.id;

    await supabase
      .from("profiles")
      .update({
        stripe_account_id: accountId,
        stripe_connect_account_id: accountId,
        payout_status: "pending",
        stripe_details_submitted: false,
      })
      .eq("id", params.userId);
  }

  const siteUrl = resolveSiteUrl(params.origin);
  const { returnPath, refreshPath } = resolveOnboardingPaths({
    returnTo: params.returnTo ?? "settings",
    locale: params.locale,
    gameId: params.gameId,
  });

  const link = await createConnectOnboardingLink({
    accountId,
    returnUrl: `${siteUrl}${returnPath}`,
    refreshUrl: `${siteUrl}${refreshPath}`,
  });

  return { mode: "live" as const, url: link.url };
}

export { formatPayoutMoney, MIN_PAYOUT_THRESHOLD_USD };
