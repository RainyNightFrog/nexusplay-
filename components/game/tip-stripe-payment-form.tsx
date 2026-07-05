"use client";

import { useState } from "react";
import {
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { TipReceipt } from "@/lib/tip-receipt";

type TipStripePaymentFormProps = {
  onSuccess: (receipt: TipReceipt | null) => void;
  onError: (message: string) => void;
};

export function TipStripePaymentForm({
  onSuccess,
  onError,
}: TipStripePaymentFormProps) {
  const t = useTranslations("game");
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });

      if (error) {
        onError(error.message ?? "Payment failed");
        return;
      }

      if (paymentIntent?.id) {
        const confirmResponse = await fetch("/api/games/tips/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
        });

        const payload = (await confirmResponse.json()) as {
          error?: string;
          receipt?: TipReceipt | null;
        };

        if (!confirmResponse.ok) {
          onError(payload.error ?? "Confirm failed");
          return;
        }

        onSuccess(payload.receipt ?? null);
        return;
      }

      onSuccess(null);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        options={{
          layout: "tabs",
        }}
      />
      <Button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full gap-2 bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500"
      >
        {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
        {t("tipPayButton")}
      </Button>
    </form>
  );
}
