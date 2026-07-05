"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Coins,
  Heart,
  Info,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { TipStripePaymentForm } from "@/components/game/tip-stripe-payment-form";
import { TipSavedCardForm } from "@/components/game/tip-saved-card-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useApiError } from "@/hooks/use-api-error";
import {
  estimateCreatorNetFromTip,
  isPlatformFeeWaived,
} from "@/lib/tip-fee-policy";
import { MIN_TIP_USD, MAX_TIP_USD } from "@/lib/tip-limits";
import type { TipReceipt } from "@/lib/tip-receipt";
import { formatBillingLines } from "@/lib/tip-receipt";
import { cn } from "@/lib/utils";

type SavedCard = {
  id: string;
  brand: string;
  last4: string;
};

type TipInfo = {
  tipsEnabled: boolean;
  suggestedTipAmount: number | null;
  platformFeePercent: number;
  creatorPayoutReady: boolean;
  paymentsLive: boolean;
  publishableKey: string | null;
};

type TipSupportPanelProps = {
  gameId: number;
  gameTitle: string;
  tipsEnabled?: boolean;
  suggestedTipAmount?: number | null;
  className?: string;
};

export function TipSupportPanel({
  gameId,
  gameTitle,
  tipsEnabled: tipsEnabledProp = false,
  suggestedTipAmount: suggestedProp = null,
  className,
}: TipSupportPanelProps) {
  const t = useTranslations("game");
  const { translateApiError } = useApiError();
  const { profile } = useAuth();

  const [tipInfo, setTipInfo] = useState<TipInfo | null>(null);
  const [loading, setLoading] = useState(tipsEnabledProp);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [receipt, setReceipt] = useState<TipReceipt | null>(null);
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<
    string | null
  >(null);
  const [savedCardLabel, setSavedCardLabel] = useState("");
  const [publicAnonymous, setPublicAnonymous] = useState(false);

  const tipsEnabled = tipInfo?.tipsEnabled ?? tipsEnabledProp;
  const suggestedTipAmount = tipInfo?.suggestedTipAmount ?? suggestedProp;
  const platformFeePercent = tipInfo?.platformFeePercent ?? 0;
  const paymentsLive = tipInfo?.paymentsLive ?? false;

  useEffect(() => {
    if (!tipsEnabledProp) {
      setLoading(false);
      return;
    }

    fetch(`/api/games/${gameId}/tips`)
      .then((response) => response.json())
      .then((data: TipInfo & { error?: string }) => {
        if (data.tipsEnabled) {
          setTipInfo(data);
          if (data.suggestedTipAmount != null) {
            setAmount(String(data.suggestedTipAmount));
          }
        }
      })
      .finally(() => setLoading(false));
  }, [gameId, tipsEnabledProp]);

  useEffect(() => {
    if (!open || !profile || !paymentsLive) return;

    fetch("/api/auth/payment-methods")
      .then((response) => response.json())
      .then((data: { cards?: SavedCard[]; paymentsLive?: boolean }) => {
        const cards = data.cards ?? [];
        setSavedCards(cards);
        if (cards[0]) {
          setSelectedPaymentMethodId(cards[0].id);
        }
      })
      .catch(() => setSavedCards([]));
  }, [open, profile, paymentsLive]);

  const parsedAmount = useMemo(() => {
    const value = Number.parseFloat(amount);
    return Number.isFinite(value) ? value : 0;
  }, [amount]);

  const breakdown = useMemo(
    () => estimateCreatorNetFromTip(parsedAmount, platformFeePercent),
    [parsedAmount, platformFeePercent]
  );

  const feeWaived = isPlatformFeeWaived(platformFeePercent);

  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey]
  );

  const presetAmounts = useMemo(() => {
    const base = suggestedTipAmount ?? 5;
    return Array.from(new Set([base, 3, 10, 20].filter((v) => v >= MIN_TIP_USD))).sort(
      (a, b) => a - b
    );
  }, [suggestedTipAmount]);

  const resetModal = useCallback(() => {
    setOpen(false);
    setError(null);
    setClientSecret(null);
    setPublishableKey(null);
    setSuccess(false);
    setReceipt(null);
    setSubmitting(false);
    setSavedCards([]);
    setSelectedPaymentMethodId(null);
    setSavedCardLabel("");
    setPublicAnonymous(false);
    if (suggestedTipAmount != null) {
      setAmount(String(suggestedTipAmount));
    }
  }, [suggestedTipAmount]);

  async function startCheckout() {
    if (!profile) {
      window.location.href = `/auth?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }

    const value = Number.parseFloat(amount);
    if (!Number.isFinite(value) || value < MIN_TIP_USD || value > MAX_TIP_USD) {
      setError(t("tipAmountInvalid", { min: MIN_TIP_USD, max: MAX_TIP_USD }));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/games/${gameId}/tips`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountUsd: value,
          paymentMethodId: selectedPaymentMethodId ?? undefined,
          publicAnonymous,
        }),
      });

      const data = (await response.json()) as {
        mode?: string;
        clientSecret?: string;
        publishableKey?: string;
        paymentMethodId?: string | null;
        tipId?: string;
        receipt?: TipReceipt;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? t("tipCheckoutFailed"));
      }

      if (data.mode === "preview") {
        setReceipt(data.receipt ?? null);
        setSuccess(true);
        return;
      }

      if (data.clientSecret && data.publishableKey) {
        setClientSecret(data.clientSecret);
        setPublishableKey(data.publishableKey);
        if (data.paymentMethodId) {
          const card = savedCards.find((item) => item.id === data.paymentMethodId);
          setSelectedPaymentMethodId(data.paymentMethodId);
          setSavedCardLabel(
            card ? `${card.brand} ···· ${card.last4}` : data.paymentMethodId
          );
        }
        return;
      }

      throw new Error(t("tipCheckoutFailed"));
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? translateApiError(checkoutError.message)
          : t("tipCheckoutFailed")
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!tipsEnabledProp && !loading && !tipsEnabled) {
    return null;
  }

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-2xl border border-white/10 bg-zinc-900/60 p-6",
          className
        )}
      >
        <Loader2 className="size-5 animate-spin text-fuchsia-400" />
      </div>
    );
  }

  if (!tipsEnabled) {
    return null;
  }

  return (
    <>
      <div
        className={cn(
          "rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/[0.05] p-5",
          "shadow-[0_0_28px_rgba(217,70,239,0.08)]",
          className
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Coins className="size-5 text-fuchsia-400" />
          <h3 className="text-sm font-semibold text-fuchsia-100">
            {t("tipSupportTitle")}
          </h3>
          {!paymentsLive && (
            <Badge className="border-0 bg-amber-500/20 text-amber-200">
              <Sparkles className="mr-1 size-3" />
              {t("tipPreviewBadge")}
            </Badge>
          )}
        </div>

        <p className="mt-2 text-xs leading-relaxed text-zinc-500">
          {t("tipSupportDesc")}
        </p>

        {suggestedTipAmount != null && (
          <p className="mt-2 text-xs text-zinc-400">
            {t("tipSuggestedAmount", { amount: suggestedTipAmount.toFixed(2) })}
          </p>
        )}

        <Button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 w-full gap-2 bg-gradient-to-r from-fuchsia-500 to-violet-600 hover:from-fuchsia-400 hover:to-violet-500"
        >
          <Heart className="size-4" />
          {t("tipSupportButton")}
        </Button>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm"
              onClick={resetModal}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className={cn(
                "fixed left-1/2 top-1/2 z-[71] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2",
                "rounded-2xl border border-fuchsia-400/20 bg-zinc-900 p-5 shadow-2xl"
              )}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-white">{t("tipModalTitle")}</h3>
                  <p className="mt-1 text-xs text-zinc-500">{gameTitle}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={resetModal}
                  className="shrink-0 text-zinc-400"
                >
                  <X className="size-4" />
                </Button>
              </div>

              {success ? (
                <div className="py-4 text-center">
                  <Check className="mx-auto size-10 text-emerald-400" />
                  <p className="mt-3 text-sm font-medium text-white">
                    {paymentsLive ? t("tipSuccessLive") : t("tipSuccessPreview")}
                  </p>

                  {receipt && (
                    <div className="mt-4 rounded-xl border border-white/8 bg-zinc-950/60 p-4 text-left text-xs text-zinc-400">
                      <p className="font-medium text-zinc-200">{t("tipReceiptTitle")}</p>
                      <p className="mt-2 text-zinc-500">{receipt.gameTitle}</p>
                      <p className="mt-1 font-mono text-fuchsia-200">
                        ${receipt.amountUsd.toFixed(2)} USD
                      </p>
                      <p className="mt-2 text-[11px] text-zinc-600">
                        {new Date(receipt.createdAt).toLocaleString()}
                      </p>

                      {receipt.billingComplete && receipt.billing ? (
                        <div className="mt-3 border-t border-white/8 pt-3">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                            {t("tipReceiptBilling")}
                          </p>
                          {formatBillingLines(receipt.billing).map((line) => (
                            <p key={line} className="mt-1 text-zinc-300">
                              {line}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 border-t border-white/8 pt-3 text-[11px] text-zinc-500">
                          {t("tipReceiptNoBilling")}{" "}
                          <Link
                            href="/settings/billing"
                            className="text-violet-400 hover:underline"
                          >
                            {t("tipReceiptBillingLink")}
                          </Link>
                        </p>
                      )}
                    </div>
                  )}

                  <Button
                    type="button"
                    onClick={resetModal}
                    className="mt-4"
                    variant="outline"
                  >
                    {t("tipClose")}
                  </Button>
                </div>
              ) : clientSecret && stripePromise && selectedPaymentMethodId ? (
                <TipSavedCardForm
                  clientSecret={clientSecret}
                  paymentMethodId={selectedPaymentMethodId}
                  cardLabel={savedCardLabel}
                  onSuccess={(nextReceipt) => {
                    setReceipt(nextReceipt);
                    setSuccess(true);
                  }}
                  onError={(message) => setError(message)}
                  onUseNewCard={() => {
                    setClientSecret(null);
                    setPublishableKey(null);
                    setSelectedPaymentMethodId(null);
                    setSavedCardLabel("");
                  }}
                />
              ) : clientSecret && stripePromise ? (
                <Elements
                  stripe={stripePromise}
                  options={{ clientSecret, appearance: { theme: "night" } }}
                >
                  <TipStripePaymentForm
                    onSuccess={(nextReceipt) => {
                      setReceipt(nextReceipt);
                      setSuccess(true);
                    }}
                    onError={(message) => setError(message)}
                  />
                </Elements>
              ) : (
                <div className="space-y-4">
                  {!paymentsLive && (
                    <div className="flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-500/5 p-3 text-xs text-amber-100/90">
                      <Info className="mt-0.5 size-4 shrink-0" />
                      {t("tipPreviewModalNote")}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {presetAmounts.map((preset) => (
                      <Button
                        key={preset}
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setAmount(String(preset))}
                        className={cn(
                          "border-white/10 bg-white/5",
                          parsedAmount === preset &&
                            "border-fuchsia-400/40 bg-fuchsia-500/15 text-fuchsia-200"
                        )}
                      >
                        ${preset}
                      </Button>
                    ))}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs text-zinc-400">
                      {t("tipAmountLabel")}
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-fuchsia-300">
                        $
                      </span>
                      <Input
                        type="number"
                        min={MIN_TIP_USD}
                        max={MAX_TIP_USD}
                        step="0.01"
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                        className="border-white/10 bg-white/5 pl-7 text-zinc-100"
                      />
                    </div>
                  </div>

                  {parsedAmount >= MIN_TIP_USD && paymentsLive && savedCards.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-zinc-400">
                        {t("tipSavedCardsTitle")}
                      </p>
                      <div className="space-y-2">
                        {savedCards.map((card) => (
                          <button
                            key={card.id}
                            type="button"
                            onClick={() => setSelectedPaymentMethodId(card.id)}
                            className={cn(
                              "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm",
                              selectedPaymentMethodId === card.id
                                ? "border-fuchsia-400/40 bg-fuchsia-500/10 text-fuchsia-100"
                                : "border-white/10 bg-white/5 text-zinc-300"
                            )}
                          >
                            <span className="capitalize">
                              {card.brand} ···· {card.last4}
                            </span>
                            {selectedPaymentMethodId === card.id && (
                              <Check className="size-4 text-fuchsia-300" />
                            )}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setSelectedPaymentMethodId(null)}
                          className={cn(
                            "w-full rounded-xl border px-3 py-2 text-left text-sm",
                            !selectedPaymentMethodId
                              ? "border-fuchsia-400/40 bg-fuchsia-500/10 text-fuchsia-100"
                              : "border-white/10 bg-white/5 text-zinc-400"
                          )}
                        >
                          {t("tipUseNewCard")}
                        </button>
                      </div>
                    </div>
                  )}

                  {parsedAmount >= MIN_TIP_USD && (
                    <div className="rounded-xl border border-white/8 bg-zinc-950/50 p-3 text-xs text-zinc-500">
                      <p className="font-medium text-zinc-300">{t("tipBreakdownTitle")}</p>
                      <p className="mt-2 font-mono text-cyan-300/90">
                        {feeWaived
                          ? t("tipBreakdownZeroFee", {
                              tip: breakdown.tipAmountUsd.toFixed(2),
                              processor: breakdown.processorFee.toFixed(2),
                              net: breakdown.net.toFixed(2),
                            })
                          : t("tipBreakdownLine", {
                              tip: breakdown.tipAmountUsd.toFixed(2),
                              platform: breakdown.platformFee.toFixed(2),
                              processor: breakdown.processorFee.toFixed(2),
                              net: breakdown.net.toFixed(2),
                            })}
                      </p>
                      <p className="mt-2 text-[11px] text-zinc-600">
                        {t("tipVoluntaryNote")}
                      </p>
                    </div>
                  )}

                  {error && <p className="text-sm text-rose-400">{error}</p>}

                  <label className="flex items-start gap-3 rounded-xl border border-white/8 bg-zinc-950/40 px-3 py-3 text-left">
                    <Checkbox
                      checked={publicAnonymous}
                      onCheckedChange={(value) =>
                        setPublicAnonymous(value === true)
                      }
                      className="mt-0.5 border-white/20 data-checked:border-fuchsia-500 data-checked:bg-fuchsia-500"
                    />
                    <span>
                      <span className="block text-sm text-zinc-200">
                        {t("tipAnonymousLabel")}
                      </span>
                      <span className="mt-0.5 block text-xs text-zinc-500">
                        {t("tipAnonymousDesc")}
                      </span>
                    </span>
                  </label>

                  <Button
                    type="button"
                    onClick={startCheckout}
                    disabled={submitting}
                    className="w-full gap-2 bg-gradient-to-r from-fuchsia-500 to-violet-600"
                  >
                    {submitting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Heart className="size-4" />
                    )}
                    {paymentsLive ? t("tipContinuePay") : t("tipPreviewSubmit")}
                  </Button>

                  <p className="text-center text-[11px] text-zinc-600">
                    <Link href="/settings/billing" className="text-violet-400 hover:underline">
                      {t("tipBillingHint")}
                    </Link>
                    {" · "}
                    <Link href="/legal#payments" className="text-violet-400 hover:underline">
                      {t("tipLegalLink")}
                    </Link>
                  </p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
