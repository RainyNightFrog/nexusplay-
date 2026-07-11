import type Stripe from "stripe";
import {
  isOrderAlreadyProcessed,
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

  if (isOrderAlreadyProcessed(order)) {
    return {
      handled: true,
      duplicate: true,
      orderType: order.order_type,
    };
  }

  const orderType = resolveCheckoutOrderType(session, order);
  if (!orderType) {
    return { handled: false, duplicate: false };
  }

  switch (orderType) {
    case "game_purchase":
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
    duplicate: false,
    orderType,
  };
}
