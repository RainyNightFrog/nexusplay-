"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Check,
  HeartHandshake,
  Loader2,
  Palette,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { SiteHeader } from "@/components/layout/site-header";
import { RainbowSafeText } from "@/components/supporter/rainbow-safe-text";
import { SupporterBadge } from "@/components/supporter/supporter-badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useApiError } from "@/hooks/use-api-error";
import {
  LIFETIME_SUPPORTER_MIN_USD,
  LIFETIME_SUPPORTER_TIER_ID,
  SUPPORTER_PASS_TIERS,
  formatTierPriceUsd,
  type CheckoutSelectionId,
  type SupporterPassTierId,
} from "@/lib/supporter-pass";
import {
  SUPPORTER_TITLE_V1,
  SUPPORTER_TITLE_V2,
  isPremiumSupporterBadge,
  supporterComposerMirrorClassByTier,
} from "@/lib/supporter-tier";
import { cn } from "@/lib/utils";

const PERK_ICONS = [Sparkles, Palette, HeartHandshake] as const;

function getBillingLabelKey(interval: "month" | "year") {
  return interval === "year" ? "billingYearly" : "billingMonthly";
}

export function SupporterView() {
  const t = useTranslations("supporter");
  const { translateApiError } = useApiError();
  const { profile, refreshProfile } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [selectedTier, setSelectedTier] = useState<CheckoutSelectionId>(
    "supporter_5_monthly"
  );
  const [lifetimeAmount, setLifetimeAmount] = useState(
    String(LIFETIME_SUPPORTER_MIN_USD)
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [paymentsLive, setPaymentsLive] = useState(false);

  const isLifetimeSelected = selectedTier === LIFETIME_SUPPORTER_TIER_ID;

  useEffect(() => {
    fetch("/api/checkout/supporter-pass")
      .then((response) => response.json())
      .then((data: { paymentsLive?: boolean }) => {
        setPaymentsLive(Boolean(data.paymentsLive));
      })
      .catch(() => undefined);
  }, []);

  const showSuccessToast = useCallback(() => {
    setSuccess(true);
    void refreshProfile();
  }, [refreshProfile]);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (checkout === "success") {
      showSuccessToast();
      router.replace("/supporter", { scroll: false });
      return;
    }
    if (checkout === "cancelled") {
      router.replace("/supporter", { scroll: false });
    }
  }, [searchParams, showSuccessToast, router]);

  async function handlePurchase() {
    if (!profile) {
      window.location.href = `/auth?redirect=${encodeURIComponent(pathname)}`;
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const body: {
        tierId: CheckoutSelectionId;
        localePath: string;
        customAmountUsd?: number;
      } = {
        tierId: selectedTier,
        localePath: pathname,
      };

      if (isLifetimeSelected) {
        const amount = Number.parseFloat(lifetimeAmount);
        if (!Number.isFinite(amount)) {
          throw new Error(t("lifetimeInvalidAmount"));
        }
        body.customAmountUsd = amount;
      }

      const response = await fetch("/api/checkout/supporter-pass", {
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
        showSuccessToast();
        return;
      }

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      throw new Error(t("checkoutFailed"));
    } catch (purchaseError) {
      setError(
        purchaseError instanceof Error
          ? translateApiError(purchaseError.message) ??
              purchaseError.message
          : t("checkoutFailed")
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="dark relative min-h-full text-zinc-100">
      <SiteHeader maxWidth="5xl" />

      <main className="relative mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-100">
            <Sparkles className="size-3.5" />
            {t("heroBadge")}
          </div>
          <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
            {t("heroTitle")}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
            {t("heroDesc")}
          </p>
        </div>

        {profile?.is_supporter && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mt-8 flex max-w-xl flex-wrap items-center justify-center gap-2 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
          >
            <Check className="size-4 shrink-0" />
            {profile.supporter_lifetime
              ? t("alreadyLifetime")
              : t("alreadySupporter")}
            <SupporterBadge
              showLabel
              isSupporter
              supporterBadge={profile.supporter_badge}
            />
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mt-6 max-w-xl rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-center text-sm text-emerald-100"
          >
            {paymentsLive ? t("successLive") : t("successPreview")}
          </motion.div>
        )}

        <section className="mt-10 grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((index) => {
            const Icon = PERK_ICONS[index] ?? Sparkles;
            return (
              <div
                key={index}
                className="rounded-2xl border border-white/8 bg-zinc-900/50 p-5 text-center"
              >
                <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-violet-500/20">
                  <Icon className="size-5 text-amber-200" />
                </div>
                <h2 className="mt-4 text-base font-semibold text-white">
                  {t(`perk${index + 1}Title`)}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  {t(`perk${index + 1}Desc`)}
                </p>
              </div>
            );
          })}
        </section>

        <section className="mx-auto mt-10 max-w-3xl rounded-2xl border border-white/8 bg-zinc-900/50 p-6 sm:p-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-white">{t("tiersTitle")}</h2>
            <p className="mt-2 text-sm text-zinc-400">{t("tiersDesc")}</p>
          </div>

          <div className="mx-auto mt-6 grid max-w-2xl gap-4 sm:grid-cols-2">
            {SUPPORTER_PASS_TIERS.map((tier) => {
              const premium = isPremiumSupporterBadge(tier.badge);
              return (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => setSelectedTier(tier.id as SupporterPassTierId)}
                  className={cn(
                    "rounded-2xl border p-5 text-center transition-colors",
                    selectedTier === tier.id
                      ? "border-amber-400/40 bg-amber-500/10 shadow-[0_0_24px_rgba(251,191,36,0.08)]"
                      : "border-white/10 bg-zinc-950/40 hover:border-white/20"
                  )}
                >
                  {selectedTier === tier.id && (
                    <Check className="mx-auto mb-2 size-5 text-amber-300" />
                  )}
                  <p className="text-lg font-semibold text-white">
                    ${formatTierPriceUsd(tier.priceCents)} USD
                  </p>
                  <p className="mt-1 text-sm text-zinc-400">
                    {t(tier.labelKey)}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                    <SupporterBadge
                      showLabel
                      isSupporter
                      supporterBadge={tier.badge}
                    />
                    <span
                      className={cn(
                        "text-xs font-semibold tracking-wide sm:text-sm",
                        premium ? "title-supporter-v2" : "title-supporter-v1"
                      )}
                    >
                      {premium ? SUPPORTER_TITLE_V2 : SUPPORTER_TITLE_V1}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-zinc-500">
                    {t(getBillingLabelKey(tier.interval))}
                  </p>
                  <ul className="mt-4 space-y-1 text-xs text-zinc-500">
                    <li>{t("tierPerkBadge")}</li>
                    <li>{t("tierPerkUsername")}</li>
                    <li>
                      {t(
                        premium
                          ? "tierPerkTitlePremium"
                          : "tierPerkTitleBasic"
                      )}
                    </li>
                    {!premium ? <li>{t("tierPerkVipText")}</li> : null}
                    {premium && (
                      <>
                        <li>{t("tierPerkPremiumBadge")}</li>
                        <li>{t("tierPerkPremiumGlow")}</li>
                        <li>{t("tierPerkComposer")}</li>
                      </>
                    )}
                  </ul>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setSelectedTier(LIFETIME_SUPPORTER_TIER_ID)}
            className={cn(
              "mx-auto mt-4 block w-full max-w-2xl rounded-2xl border p-5 text-center transition-colors",
              isLifetimeSelected
                ? "border-cyan-400/45 bg-gradient-to-br from-amber-500/15 via-fuchsia-500/10 to-cyan-500/15 shadow-[0_0_28px_rgba(34,211,238,0.12)]"
                : "border-white/10 bg-zinc-950/40 hover:border-cyan-400/25"
            )}
          >
            <div className="mx-auto flex max-w-md flex-col items-center">
              <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400/25 to-cyan-500/25">
                <Zap className="size-5 text-amber-200" />
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                {isLifetimeSelected && (
                  <Check className="size-5 text-cyan-300" />
                )}
                <p className="text-lg font-semibold text-white">
                  {t("tierLifetime")}
                </p>
                <SupporterBadge
                  showLabel
                  isSupporter
                  supporterBadge="supporter_v2"
                />
              </div>
              <span className="title-rainynightfrog-frame mt-2">
                <span className="title-rainynightfrog text-xs sm:text-sm">
                  RainyNightFrog
                </span>
              </span>
              <p className="mt-2 text-sm text-zinc-400">
                {t("tierLifetimeDesc")}
              </p>
              <ul className="mt-3 space-y-1 text-xs text-zinc-500">
                <li>{t("tierPerkSvipAll")}</li>
                <li>{t("tierPerkComposer")}</li>
                <li>{t("tierPerkLifetimeTitle")}</li>
                <li>{t("tierPerkLifetimePermanent")}</li>
                <li>{t("tierPerkWorldAnnounce")}</li>
              </ul>

              <div
                className="mt-4 w-full"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <label
                  htmlFor="lifetime-amount"
                  className="mb-1.5 block text-xs font-medium text-zinc-300"
                >
                  {t("lifetimeAmountLabel")}
                </label>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-sm text-zinc-400">$</span>
                  <div
                    className={cn(
                      "relative w-full max-w-[11rem] rounded-xl border bg-zinc-950/70",
                      "border-violet-400/25 focus-within:border-violet-400/45 focus-within:ring-2 focus-within:ring-violet-400/20"
                    )}
                  >
                    <input
                      id="lifetime-amount"
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={lifetimeAmount}
                      onFocus={() => setSelectedTier(LIFETIME_SUPPORTER_TIER_ID)}
                      onChange={(event) => {
                        setSelectedTier(LIFETIME_SUPPORTER_TIER_ID);
                        const next = event.target.value.replace(/[^\d.]/g, "");
                        setLifetimeAmount(next);
                      }}
                      className={cn(
                        "w-full rounded-xl border-0 bg-transparent px-3 py-2 text-center text-sm outline-none",
                        "caret-violet-300 placeholder:text-zinc-600",
                        lifetimeAmount.length > 0
                          ? "text-transparent [-webkit-text-fill-color:transparent]"
                          : "text-white"
                      )}
                      placeholder={String(LIFETIME_SUPPORTER_MIN_USD)}
                    />
                    {lifetimeAmount.length > 0 ? (
                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden px-3 py-2 text-sm"
                      >
                        <RainbowSafeText
                          text={lifetimeAmount}
                          rainbowClassName={
                            supporterComposerMirrorClassByTier.premium
                          }
                        />
                      </div>
                    ) : null}
                  </div>
                  <span className="text-sm text-zinc-500">USD</span>
                </div>
                <p className="mt-1.5 text-[11px] text-zinc-500">
                  {t("lifetimeAmountHint", {
                    min: LIFETIME_SUPPORTER_MIN_USD,
                  })}
                </p>
              </div>
            </div>
          </button>

          <p className="mt-4 text-center text-[11px] leading-relaxed text-zinc-500">
            {t("spendingHint")}
          </p>

          {!paymentsLive && (
            <p className="mt-4 text-center text-xs text-amber-200/80">
              {t("previewNote")}
            </p>
          )}

          {error && (
            <p className="mt-4 text-center text-sm text-rose-300">{error}</p>
          )}

          <div className="mt-6 flex justify-center">
            <Button
              type="button"
              disabled={submitting}
              onClick={() => void handlePurchase()}
              className={cn(
                "w-full max-w-md gap-2 text-white",
                isLifetimeSelected
                  ? "bg-gradient-to-r from-amber-500 via-fuchsia-500 to-cyan-500 hover:from-amber-400 hover:via-fuchsia-400 hover:to-cyan-400"
                  : "bg-gradient-to-r from-amber-500 to-violet-600 hover:from-amber-400 hover:to-violet-500"
              )}
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : isLifetimeSelected ? (
                <Zap className="size-4" />
              ) : (
                <Shield className="size-4" />
              )}
              {isLifetimeSelected
                ? t("ctaLifetime")
                : profile?.is_supporter
                  ? t("extendSupport")
                  : t("cta")}
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
