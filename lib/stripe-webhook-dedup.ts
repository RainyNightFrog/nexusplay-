import { createServerSupabase } from "@/lib/supabase-server";

/** Returns false if this Stripe event was already processed. */
export async function claimStripeWebhookEvent(
  eventId: string,
  eventType: string
): Promise<boolean> {
  const supabase = createServerSupabase();
  const { error } = await supabase.from("stripe_webhook_events").insert({
    event_id: eventId,
    event_type: eventType,
  });

  if (error?.code === "23505") {
    return false;
  }

  if (error) {
    throw new Error(error.message);
  }

  return true;
}
