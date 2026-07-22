import Stripe from "stripe";
import {
  normalizePayoutStatus,
  type PayoutStatus,
} from "@/lib/payout-status";

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

/** 金流是否已正式上線（需 Stripe 金鑰 + 明確開關 + 金鑰模式一致） */
export function isPaymentsLive() {
  if (!isStripeConfigured() || process.env.STRIPE_PAYMENTS_LIVE !== "true") {
    return false;
  }

  const secret = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  const publishable =
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? "";
  const isLiveKey = secret.startsWith("sk_live_");
  const isTestKey = secret.startsWith("sk_test_");
  const publishableLive = publishable.startsWith("pk_live_");
  const publishableTest = publishable.startsWith("pk_test_");

  if (isLiveKey && publishableLive) return true;
  if (isTestKey && publishableTest) return true;

  return false;
}

export function getStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error("Stripe 尚未設定");
  }
  return new Stripe(key);
}

export function resolveSiteUrl(fallbackOrigin: string) {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? fallbackOrigin).replace(/\/$/, "");
}

export function mapStripeAccountToPayoutStatus(
  account: Stripe.Account
): PayoutStatus {
  if (account.requirements?.disabled_reason) {
    return "restricted";
  }
  if (account.charges_enabled && account.payouts_enabled) {
    return "active";
  }
  if (account.details_submitted) {
    return "pending";
  }
  return "none";
}

export async function createExpressConnectAccount(params: {
  userId: string;
  email: string;
  displayName: string;
  country?: string;
}) {
  const stripe = getStripeClient();
  const country = params.country ?? process.env.STRIPE_CONNECT_COUNTRY ?? "HK";

  return stripe.accounts.create({
    type: "express",
    country,
    email: params.email,
    capabilities: {
      transfers: { requested: true },
    },
    business_type: "individual",
    metadata: {
      nexusplay_user_id: params.userId,
      display_name: params.displayName.slice(0, 200),
    },
  });
}

export async function createConnectOnboardingLink(params: {
  accountId: string;
  returnUrl: string;
  refreshUrl: string;
}) {
  const stripe = getStripeClient();
  return stripe.accountLinks.create({
    account: params.accountId,
    type: "account_onboarding",
    return_url: params.returnUrl,
    refresh_url: params.refreshUrl,
  });
}

export async function fetchConnectAccount(accountId: string) {
  const stripe = getStripeClient();
  return stripe.accounts.retrieve(accountId);
}

/** 確認 Connect 收款帳戶仍存在於此平台；無效時回傳 false */
export async function isConnectDestinationValid(
  accountId: string | null | undefined
): Promise<boolean> {
  if (!accountId?.trim()) return false;
  try {
    await fetchConnectAccount(accountId.trim());
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // 帳戶不存在、不屬於此平台、或無權存取 → 視為失效
    if (
      message.includes("No such") ||
      message.includes("No such destination") ||
      message.includes("platform_account_required") ||
      message.includes("does not have access") ||
      message.includes("account_invalid")
    ) {
      return false;
    }
    // 其他暫時性錯誤先當有效，避免誤清
    return true;
  }
}

export async function createStripeCustomer(params: {
  userId: string;
  email: string;
  displayName: string;
}) {
  const stripe = getStripeClient();
  return stripe.customers.create({
    email: params.email,
    name: params.displayName,
    metadata: { nexusplay_user_id: params.userId },
  });
}

export async function listCustomerPaymentMethods(customerId: string) {
  const stripe = getStripeClient();
  return stripe.paymentMethods.list({
    customer: customerId,
    type: "card",
  });
}

export async function fetchConnectAvailableBalanceUsd(accountId: string) {
  const stripe = getStripeClient();
  const balance = await stripe.balance.retrieve(
    {},
    { stripeAccount: accountId }
  );

  const usdAvailable = balance.available.find((entry) => entry.currency === "usd");
  const cents = usdAvailable?.amount ?? 0;
  return Math.round(cents) / 100;
}

export async function createConnectAccountPayout(params: {
  accountId: string;
  amountUsd: number;
  metadata?: Record<string, string>;
}) {
  const stripe = getStripeClient();
  const amountCents = Math.round(params.amountUsd * 100);

  return stripe.payouts.create(
    {
      amount: amountCents,
      currency: "usd",
      metadata: params.metadata,
    },
    { stripeAccount: params.accountId }
  );
}

export function syncPayoutStatusFromAccount(account: Stripe.Account): {
  payoutStatus: PayoutStatus;
  onboardedAt: string | null;
  stripeDetailsSubmitted: boolean;
} {
  const payoutStatus = mapStripeAccountToPayoutStatus(account);
  const stripeDetailsSubmitted = account.details_submitted === true;
  const onboardedAt =
    payoutStatus === "active" && stripeDetailsSubmitted
      ? new Date().toISOString()
      : null;

  return { payoutStatus, onboardedAt, stripeDetailsSubmitted };
}
