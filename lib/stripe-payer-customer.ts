import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createStripeCustomer, getStripeClient } from "@/lib/stripe-connect";

function isMissingStripeCustomerError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const stripeError = error as Stripe.errors.StripeInvalidRequestError;
  return (
    stripeError.type === "StripeInvalidRequestError" &&
    (stripeError.code === "resource_missing" ||
      stripeError.param === "customer" ||
      stripeError.message?.includes("No such customer"))
  );
}

async function retrieveActiveStripeCustomer(customerId: string) {
  const stripe = getStripeClient();

  try {
    const customer = await stripe.customers.retrieve(customerId);
    if ("deleted" in customer && customer.deleted) {
      return null;
    }
    return customer;
  } catch (error) {
    if (isMissingStripeCustomerError(error)) {
      return null;
    }
    throw error;
  }
}

export async function ensurePayerStripeCustomer(params: {
  supabase: SupabaseClient;
  userId: string;
  email: string;
  displayName: string;
  existingCustomerId: string | null;
}) {
  if (params.existingCustomerId) {
    const existing = await retrieveActiveStripeCustomer(
      params.existingCustomerId
    );
    if (existing) {
      return params.existingCustomerId;
    }
  }

  const customer = await createStripeCustomer({
    userId: params.userId,
    email: params.email,
    displayName: params.displayName,
  });

  await params.supabase
    .from("profiles")
    .update({ stripe_customer_id: customer.id })
    .eq("id", params.userId);

  return customer.id;
}
