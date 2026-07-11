import type { SupabaseClient } from "@supabase/supabase-js";
import { createStripeCustomer } from "@/lib/stripe-connect";

export async function ensurePayerStripeCustomer(params: {
  supabase: SupabaseClient;
  userId: string;
  email: string;
  displayName: string;
  existingCustomerId: string | null;
}) {
  if (params.existingCustomerId) {
    return params.existingCustomerId;
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
