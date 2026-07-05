import Stripe from "stripe";
import {
  normalizePayoutStatus,
  type PayoutStatus,
} from "@/lib/payout-status";

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

/** 金流是否已正式上線（需 Stripe 金鑰 + 明確開關） */
export function isPaymentsLive() {
  return isStripeConfigured() && process.env.STRIPE_PAYMENTS_LIVE === "true";
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
} {
  const payoutStatus = mapStripeAccountToPayoutStatus(account);
  const onboardedAt =
    payoutStatus === "active" && account.details_submitted
      ? new Date().toISOString()
      : null;

  return { payoutStatus, onboardedAt };
}
