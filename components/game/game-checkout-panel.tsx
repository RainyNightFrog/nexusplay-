"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Info,
  Loader2,
  ShoppingCart,
  Sparkles,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useApiError } from "@/hooks/use-api-error";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import {
  computeStripeConnectAmounts,
  MAX_PLATFORM_TIP_USD,
  PLATFORM_TIP_PRESETS_USD,
} from "@/lib/checkout-order";
import {
  formatCentsAsUsd,
  parseDisplayAmountToCents,
} from "@/lib/game-checkout-service";
import { cn } from "@/lib/utils";

type TipPreset = (typeof PLATFORM_TIP_PRESETS_USD)[number] | "custom";

type GameCheckoutPanelProps = {
  gameId: number;
  gameTitle: string;
  pricingType: "fixed" | "pwyw";
  priceCents: number;
  minPriceCents?: number;
  currency?: string;
  platformFeePercent?: number;
  isGameOwner?: boolean;
  embedded?: boolean;
  className?: string;
  onCheckoutSuccess?: () => void;
};

export function GameCheckoutPanel({
  gameId,
  gameTitle,
  pricingType,
  priceCents,
  minPriceCents = 0,
  currency = "USD",
  platformFeePercent = 0,
  isGameOwner = false,
  embedded = false,
  className,
  onCheckoutSuccess,
}: GameCheckoutPanelProps) {
  const t = useTranslations("game");
  const { translateApiError } = useApiError();
  const { profile } = useAuth();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [tipPreset, setTipPreset] = useState<TipPreset>(0);
  const [customTipAmount, setCustomTipAmount] = useState("");
  const [pwywAmount, setPwywAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [paymentsLive, setPaymentsLive] = useState(false);
  const [creatorPayoutReady, setCreatorPayoutReady] = useState(true);
  const [loadingInfo, setLoadingInfo] = useState(false);

  useScrollLock(open);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadInfo() {
      setLoadingInfo(true);
      try {
        const response = await fetch(`/api/checkout?gameId=${gameId}`);
        const data = (await response.json()) as {
          paymentsLive?: boolean;
          creatorPayoutReady?: boolean;
          error?: string;
        };
        if (!cancelled && response.ok) {
          setPaymentsLive(Boolean(data.paymentsLive));
          setCreatorPayoutReady(data.creatorPayoutReady !== false);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoadingInfo(false);
      }
    }
    void loadInfo();
    return () => {
      cancelled = true;
    };
  }, [gameId]);

  const gamePriceCents = useMemo(() => {
    if (pricingType === "fixed") {
      return Math.max(0, priceCents);
    }
    const parsed = parseDisplayAmountToCents(pwywAmount);
    return parsed ?? 0;
  }, [pricingType, priceCents, pwywAmount]);

  const platformTipCents = useMemo(() => {
    if (tipPreset === "custom") {
      const parsed = parseDisplayAmountToCents(customTipAmount);
      return parsed ?? 0;
    }
    return Math.round(tipPreset * 100);
  }, [tipPreset, customTipAmount]);

  const amounts = useMemo(
    () =>
      computeStripeConnectAmounts({
        gamePriceCents,
        platformTipCents,
        platformCommissionRate: platformFeePercent / 100,
      }),
    [gamePriceCents, platformTipCents, platformFeePercent]
  );

  const canSubmit = useMemo(() => {
    if (pricingType === "pwyw") {
      const parsed = parseDisplayAmountToCents(pwywAmount);
      if (parsed == null || parsed < minPriceCents || parsed <= 0) {
        return false;
      }
    } else if (gamePriceCents <= 0) {
      return false;
    }

    if (tipPreset === "custom") {
      const parsed = parseDisplayAmountToCents(customTipAmount);
      if (parsed == null || parsed < 0 || parsed > MAX_PLATFORM_TIP_USD * 100) {
        return false;
      }
    }

    return amounts.total_amount_cents > 0;
  }, [
    pricingType,
    pwywAmount,
    minPriceCents,
    gamePriceCents,
    tipPreset,
    customTipAmount,
    amounts.total_amount_cents,
  ]);

  const resetModal = useCallback(() => {
    setOpen(false);
    setError(null);
    setSuccess(false);
    setSubmitting(false);
    setTipPreset(0);
    setCustomTipAmount("");
  }, []);

  async function startCheckout() {
    if (!profile) {
      window.location.href = `/auth?redirect=${encodeURIComponent(pathname)}`;
      return;
    }

    if (!canSubmit) {
      if (pricingType === "pwyw") {
        setError(
          t("checkoutPwywInvalid", {
            min: formatCentsAsUsd(minPriceCents),
          })
        );
      } else if (tipPreset === "custom") {
        setError(
          t("checkoutPlatformTipInvalid", { max: String(MAX_PLATFORM_TIP_USD) })
        );
      }
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        gameId,
        platformTipCents,
        localePath: pathname,
      };

      if (pricingType === "pwyw") {
        body.gameAmount = Number.parseFloat(pwywAmount);
      }

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = (await response.json()) as {
        mode?: string;
        url?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? t("checkoutFailed"));
      }

      if (data.mode === "preview") {
        setSuccess(true);
        onCheckoutSuccess?.();
        return;
      }

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      throw new Error(t("checkoutFailed"));
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? translateApiError(checkoutError.message) ??
              checkoutError.message
          : t("checkoutFailed")
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (isGameOwner) {
    return null;
  }

  const triggerButton = (
    <Button
      type="button"
      onClick={() => setOpen(true)}
      disabled={loadingInfo}
      className={cn(
        "gap-2 border-emerald-400/30 bg-emerald-500/10 text-emerald-100",
        "hover:border-emerald-400/50 hover:bg-emerald-500/15",
        embedded ? "w-full justify-center" : undefined,
        className
      )}
    >
      <ShoppingCart className="size-4" />
      {pricingType === "pwyw"
        ? t("checkoutPwywButton")
        : t("checkoutBuyButton", {
            price: formatCentsAsUsd(priceCents),
            currency,
          })}
    </Button>
  );

  const modal = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={resetModal}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            onClick={(event) => event.stopPropagation()}
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-emerald-400/20 bg-zinc-900 p-5 shadow-2xl shadow-black/60"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-300/80">
                  {t("checkoutModalBadge")}
                </p>
                <h3 className="mt-1 text-lg font-semibold text-white">
                  {t("checkoutModalTitle")}
                </h3>
                <p className="mt-1 text-sm text-zinc-400">{gameTitle}</p>
              </div>
              <button
                type="button"
                onClick={resetModal}
                className="rounded-lg border border-white/10 p-1.5 text-zinc-400 hover:text-white"
                aria-label={t("checkoutClose")}
              >
                <X className="size-4" />
              </button>
            </div>

            {success ? (
              <div className="py-6 text-center">
                <Check className="mx-auto size-10 text-emerald-400" />
                <p className="mt-3 text-sm font-medium text-white">
                  {paymentsLive
                    ? t("checkoutSuccessLive")
                    : t("checkoutSuccessPreview")}
                </p>
                <Button
                  type="button"
                  onClick={resetModal}
                  className="mt-4"
                  variant="outline"
                >
                  {t("checkoutClose")}
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                {paymentsLive && !creatorPayoutReady && (
                  <div className="flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-500/5 p-3 text-xs text-amber-100/90">
                    <Info className="mt-0.5 size-4 shrink-0" />
                    {t("checkoutCreatorNotReady")}
                  </div>
                )}

                {!paymentsLive && (
                  <div className="flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-500/5 p-3 text-xs text-amber-100/90">
                    <Info className="mt-0.5 size-4 shrink-0" />
                    {t("checkoutPreviewNote")}
                  </div>
                )}

                {pricingType === "pwyw" && (
                  <div>
                    <label className="mb-1.5 block text-xs text-zinc-400">
                      {t("checkoutPwywLabel", {
                        min: formatCentsAsUsd(minPriceCents),
                      })}
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-emerald-300">
                        $
                      </span>
                      <Input
                        type="number"
                        min={minPriceCents / 100}
                        step="0.01"
                        value={pwywAmount}
                        onChange={(event) => setPwywAmount(event.target.value)}
                        className="border-white/10 bg-white/5 pl-7 text-zinc-100"
                      />
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-white/8 bg-zinc-950/50 p-4">
                  <p className="text-sm font-medium text-zinc-200">
                    {t("checkoutPlatformTipSection")}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {t("checkoutPlatformTipDesc")}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setTipPreset(0);
                        setCustomTipAmount("");
                      }}
                      className={cn(
                        "border-white/10 bg-white/5",
                        tipPreset === 0 &&
                          "border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
                      )}
                    >
                      {t("checkoutTipNone")}
                    </Button>
                    {PLATFORM_TIP_PRESETS_USD.filter((value) => value > 0).map(
                      (preset) => (
                        <Button
                          key={preset}
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setTipPreset(preset);
                            setCustomTipAmount("");
                          }}
                          className={cn(
                            "border-white/10 bg-white/5",
                            tipPreset === preset &&
                              "border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
                          )}
                        >
                          ${preset.toFixed(2)}
                        </Button>
                      )
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setTipPreset("custom")}
                      className={cn(
                        "border-white/10 bg-white/5",
                        tipPreset === "custom" &&
                          "border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
                      )}
                    >
                      {t("checkoutTipCustom")}
                    </Button>
                  </div>

                  {tipPreset === "custom" && (
                    <div className="relative mt-3 w-36">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-emerald-300">
                        $
                      </span>
                      <Input
                        type="number"
                        min={0}
                        max={MAX_PLATFORM_TIP_USD}
                        step="0.01"
                        value={customTipAmount}
                        onChange={(event) =>
                          setCustomTipAmount(event.target.value)
                        }
                        placeholder="0.00"
                        className="border-white/10 bg-white/5 pl-7 text-zinc-100"
                      />
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-emerald-400/15 bg-emerald-500/5 p-4 text-sm">
                  <p className="font-medium text-emerald-100">
                    {t("checkoutBreakdownTitle")}
                  </p>
                  <div className="mt-3 space-y-2 text-zinc-300">
                    <div className="flex items-center justify-between">
                      <span>{t("checkoutLineGamePrice")}</span>
                      <span className="font-mono">
                        ${formatCentsAsUsd(amounts.game_price_cents)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{t("checkoutLinePlatformTip")}</span>
                      <span className="font-mono">
                        ${formatCentsAsUsd(amounts.platform_tip_cents)}
                      </span>
                    </div>
                    <div className="border-t border-white/10 pt-2 flex items-center justify-between font-medium text-white">
                      <span>{t("checkoutLineTotal")}</span>
                      <span className="font-mono text-emerald-200">
                        ${formatCentsAsUsd(amounts.total_amount_cents)}
                      </span>
                    </div>
                  </div>
                </div>

                {error && (
                  <p className="text-center text-sm text-rose-300">{error}</p>
                )}

                <Button
                  type="button"
                  disabled={submitting || !canSubmit}
                  onClick={() => void startCheckout()}
                  className="w-full gap-2 bg-gradient-to-r from-emerald-500 to-cyan-600 text-white hover:from-emerald-400 hover:to-cyan-500"
                >
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  {paymentsLive
                    ? t("checkoutContinuePay")
                    : t("checkoutPreviewSubmit")}
                </Button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (embedded) {
    return (
      <>
        {triggerButton}
        {portalReady && createPortal(modal, document.body)}
      </>
    );
  }

  return (
    <div className={cn("rounded-2xl border border-white/10 bg-zinc-900/60 p-5", className)}>
      {triggerButton}
      {portalReady && createPortal(modal, document.body)}
    </div>
  );
}
