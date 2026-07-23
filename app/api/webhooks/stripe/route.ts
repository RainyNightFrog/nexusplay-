import { NextResponse } from "next/server";
import Stripe from "stripe";
import { syncConnectAccountFromWebhook } from "@/lib/creator-connect-webhook";
import { syncCreatorPayoutFromStripeEvent } from "@/lib/creator-payout-webhook";
import { finalizeTipPayment } from "@/lib/tip-checkout-service";
import { handleCheckoutSessionCompleted } from "@/lib/checkout-session-webhook";
import { handleCheckoutSessionExpired } from "@/lib/checkout-order-webhook";
import {
  handleTipDisputeClosed,
  handleTipDisputeCreated,
  handleTipRefund,
  markTipPaymentFailed,
} from "@/lib/tip-payment-webhook";
import { handleSupporterSubscriptionDeleted } from "@/lib/supporter-subscription-webhook";
import { handleSupporterInvoicePaid } from "@/lib/supporter-invoice-webhook";
import {
  handleSupporterPassDisputeLost,
  handleSupporterPassRefund,
} from "@/lib/supporter-pass-refund";
import { getStripeClient, isStripeConfigured } from "@/lib/stripe-connect";
import {
  claimStripeWebhookEventDetailed,
  markStripeWebhookEventFailed,
  markStripeWebhookEventProcessed,
} from "@/lib/stripe-webhook-dedup";

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe 未設定" }, { status: 503 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook 未設定" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "缺少簽章" }, { status: 400 });
  }

  const body = await request.text();
  const stripe = getStripeClient();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "簽章驗證失敗" }, { status: 400 });
  }

  const claim = await claimStripeWebhookEventDetailed(event.id, event.type);
  if (!claim.claimed) {
    return NextResponse.json({
      received: true,
      duplicate: claim.reason === "duplicate",
      inFlight: claim.reason === "in_flight",
    });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionExpired(session);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSupporterSubscriptionDeleted(subscription);
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleSupporterInvoicePaid(invoice);
        break;
      }
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await finalizeTipPayment(paymentIntent.id);
        break;
      }
      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await markTipPaymentFailed(paymentIntent.id);
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const tipResult = await handleTipRefund(charge);
        if (!tipResult.handled) {
          await handleSupporterPassRefund(charge);
        }
        break;
      }
      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        await handleTipDisputeCreated(dispute);
        break;
      }
      case "charge.dispute.closed": {
        const dispute = event.data.object as Stripe.Dispute;
        await handleTipDisputeClosed(dispute);
        if (dispute.status === "lost") {
          await handleSupporterPassDisputeLost(dispute);
        }
        break;
      }
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        await syncConnectAccountFromWebhook(account);
        break;
      }
      case "payout.paid":
      case "payout.failed":
      case "payout.canceled":
      case "payout.updated": {
        const payout = event.data.object as Stripe.Payout;
        await syncCreatorPayoutFromStripeEvent(payout);
        break;
      }
      default:
        break;
    }

    await markStripeWebhookEventProcessed(event.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook 處理失敗";
    console.error("[stripe webhook]", event.type, message);
    try {
      await markStripeWebhookEventFailed(event.id, message);
    } catch (markError) {
      console.error("[stripe webhook] mark failed", markError);
    }
    // 回 500 讓 Stripe 重試；failed 狀態允許再次 claim
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
