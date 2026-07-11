import type { SupabaseClient } from "@supabase/supabase-js";
import { readCreatorPayoutRow } from "@/lib/creator-payout-service";
import {
  getStripeClient,
  isPaymentsLive,
  isStripeConfigured,
} from "@/lib/stripe-connect";
import { ensurePayerStripeCustomer } from "@/lib/stripe-payer-customer";
import { createServerSupabase } from "@/lib/supabase-server";

export async function ensureStripeCustomerForUser(params: {
  userId: string;
  email: string;
  displayName: string;
  supabase?: SupabaseClient;
}) {
  const supabase = params.supabase ?? createServerSupabase();
  const row = await readCreatorPayoutRow(supabase, params.userId);

  return ensurePayerStripeCustomer({
    supabase,
    userId: params.userId,
    email: params.email,
    displayName: params.displayName,
    existingCustomerId: row?.stripe_customer_id ?? null,
  });
}

export async function createPaymentMethodSetupIntent(
  userId: string,
  email: string,
  displayName: string
) {
  if (!isStripeConfigured() || !isPaymentsLive()) {
    return { error: "金流尚未上線", status: 503 as const };
  }

  const supabase = createServerSupabase();
  const customerId = await ensureStripeCustomerForUser({
    userId,
    email,
    displayName,
    supabase,
  });

  const stripe = getStripeClient();
  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    automatic_payment_methods: { enabled: true },
    metadata: { nexusplay_user_id: userId },
  });

  if (!setupIntent.client_secret) {
    return { error: "無法建立 SetupIntent", status: 500 as const };
  }

  return {
    clientSecret: setupIntent.client_secret,
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
  };
}

export async function detachCustomerPaymentMethod(params: {
  userId: string;
  paymentMethodId: string;
}) {
  if (!isStripeConfigured() || !isPaymentsLive()) {
    return { error: "金流尚未上線", status: 503 as const };
  }

  const supabase = createServerSupabase();
  const row = await readCreatorPayoutRow(supabase, params.userId);

  if (!row?.stripe_customer_id) {
    return { error: "找不到 Stripe 客戶", status: 404 as const };
  }

  const stripe = getStripeClient();
  const method = await stripe.paymentMethods.retrieve(params.paymentMethodId);

  if (method.customer !== row.stripe_customer_id) {
    return { error: "無權移除此付款方式", status: 403 as const };
  }

  await stripe.paymentMethods.detach(params.paymentMethodId);
  return { ok: true as const };
}

export async function verifyCustomerPaymentMethod(params: {
  userId: string;
  paymentMethodId: string;
}) {
  if (!isStripeConfigured() || !isPaymentsLive()) {
    return { error: "金流尚未上線", status: 503 as const };
  }

  const supabase = createServerSupabase();
  const row = await readCreatorPayoutRow(supabase, params.userId);

  if (!row?.stripe_customer_id) {
    return { error: "找不到 Stripe 客戶", status: 404 as const };
  }

  const stripe = getStripeClient();
  const method = await stripe.paymentMethods.retrieve(params.paymentMethodId);

  if (method.customer !== row.stripe_customer_id) {
    return { error: "無權使用此付款方式", status: 403 as const };
  }

  if (!method.card) {
    return { error: "不支援的付款方式", status: 400 as const };
  }

  return {
    ok: true as const,
    customerId: row.stripe_customer_id,
    brand: method.card.brand,
    last4: method.card.last4,
  };
}
