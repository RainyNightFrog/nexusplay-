import type Stripe from "stripe";
import {
  resolveCheckoutOrder,
  resolveCheckoutOrderType,
  type CheckoutSessionWebhookResult,
} from "@/lib/checkout-order-webhook";
import { finalizeGamePurchaseCheckout } from "@/lib/game-purchase-webhook";
import { finalizeSupporterPassCheckout } from "@/lib/supporter-pass-webhook";

export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<CheckoutSessionWebhookResult> {
  const order = await resolveCheckoutOrder(session);

  if (!order) {
    return { handled: false, duplicate: false };
  }

  const orderType = resolveCheckoutOrderType(session, order);
  if (!orderType) {
    return { handled: false, duplicate: false };
  }

  const alreadySucceeded = order.status === "succeeded";

  switch (orderType) {
    case "game_purchase":
      // 即使訂單已 succeeded，仍補發權益（grant 為冪等），避免崩潰後永久缺權益
      await finalizeGamePurchaseCheckout(session, order);
      break;
    case "supporter_pass":
      await finalizeSupporterPassCheckout(session, order);
      break;
    default:
      return { handled: false, duplicate: false };
  }

  return {
    handled: true,
    duplicate: alreadySucceeded,
    orderType,
  };
}
