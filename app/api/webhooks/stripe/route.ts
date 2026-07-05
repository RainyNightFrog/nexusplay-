import { NextResponse } from "next/server";
import Stripe from "stripe";
import { syncConnectAccountFromWebhook } from "@/lib/creator-connect-webhook";
import { syncCreatorPayoutFromStripeEvent } from "@/lib/creator-payout-webhook";
import { finalizeTipPayment } from "@/lib/tip-checkout-service";
import {
  handleTipDisputeCreated,
  handleTipRefund,
  markTipPaymentFailed,
} from "@/lib/tip-payment-webhook";
import { getStripeClient, isStripeConfigured } from "@/lib/stripe-connect";

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

  try {
    switch (event.type) {
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
        await handleTipRefund(charge);
        break;
      }
      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        await handleTipDisputeCreated(dispute);
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook 處理失敗";
    console.error("[stripe webhook]", event.type, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
