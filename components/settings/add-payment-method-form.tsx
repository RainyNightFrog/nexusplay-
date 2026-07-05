"use client";

import { useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

type AddPaymentMethodFormProps = {
  clientSecret: string;
  publishableKey: string;
  onSuccess: () => void;
  onCancel: () => void;
};

function SetupForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("accountSettings");
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError(null);

    const { error: setupError } = await stripe.confirmSetup({
      elements,
      redirect: "if_required",
    });

    if (setupError) {
      setError(setupError.message ?? t("paymentSetupFailed"));
      setSubmitting(false);
      return;
    }

    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-4">
      <PaymentElement options={{ layout: "tabs" }} />
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={!stripe || submitting} className="gap-2 bg-cyan-600">
          {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {t("paymentSaveCard")}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          {t("paymentSetupCancel")}
        </Button>
      </div>
    </form>
  );
}

export function AddPaymentMethodForm({
  clientSecret,
  publishableKey,
  onSuccess,
  onCancel,
}: AddPaymentMethodFormProps) {
  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey]
  );

  if (!stripePromise) return null;

  return (
    <Elements
      stripe={stripePromise}
      options={{ clientSecret, appearance: { theme: "night" } }}
    >
      <SetupForm onSuccess={onSuccess} onCancel={onCancel} />
    </Elements>
  );
}
