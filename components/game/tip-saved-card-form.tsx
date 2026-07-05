"use client";

import { useState } from "react";
import { useStripe } from "@stripe/react-stripe-js";
import { CreditCard, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { TipReceipt } from "@/lib/tip-receipt";

type TipSavedCardFormProps = {
  clientSecret: string;
  paymentMethodId: string;
  cardLabel: string;
  onSuccess: (receipt: TipReceipt | null) => void;
  onError: (message: string) => void;
  onUseNewCard: () => void;
};

export function TipSavedCardForm({
  clientSecret,
  paymentMethodId,
  cardLabel,
  onSuccess,
  onError,
  onUseNewCard,
}: TipSavedCardFormProps) {
  const t = useTranslations("game");
  const stripe = useStripe();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!stripe) return;

    setSubmitting(true);
    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        { payment_method: paymentMethodId }
      );

      if (error) {
        onError(error.message ?? t("tipCheckoutFailed"));
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
          onError(payload.error ?? t("tipCheckoutFailed"));
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
      <div className="flex items-center gap-3 rounded-xl border border-fuchsia-400/20 bg-fuchsia-500/5 px-4 py-3 text-sm text-zinc-200">
        <CreditCard className="size-4 shrink-0 text-fuchsia-300" />
        <span className="capitalize">{cardLabel}</span>
      </div>
      <Button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full gap-2 bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500"
      >
        {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
        {t("tipPayButton")}
      </Button>
      <Button
        type="button"
        variant="ghost"
        disabled={submitting}
        onClick={onUseNewCard}
        className="w-full text-zinc-400"
      >
        {t("tipUseNewCard")}
      </Button>
    </form>
  );
}
