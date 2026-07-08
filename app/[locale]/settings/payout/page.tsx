"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Banknote,
  Check,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Loader2,
  Sparkles,
  Wallet,
  XCircle,
} from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { AccountSettingsPageHeader } from "@/components/settings/account-settings-layout";
import {
  accountCardClassName,
  accountSectionClassName,
  accountSectionCompactClassName,
  accountSectionIntroClassName,
  accountSectionTitleClassName,
  settingsListRowClassName,
  settingsSectionHeaderRowClassName,
} from "@/components/settings/account-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useApiError } from "@/hooks/use-api-error";
import type { CreatorPayoutSnapshot, CreatorPayoutRecord } from "@/lib/payout-status";
import { MIN_PAYOUT_THRESHOLD_USD } from "@/lib/payout-status";
import { cn } from "@/lib/utils";

function payoutRecordStatusLabel(
  status: string,
  t: ReturnType<typeof useTranslations>
) {
  const keyMap: Record<string, string> = {
    paid: "payoutRecordStatus_paid",
    processing: "payoutRecordStatus_processing",
    preview_paid: "payoutRecordStatus_preview_paid",
    failed: "payoutRecordStatus_failed",
    pending: "payoutRecordStatus_pending",
  };
  return t((keyMap[status] ?? "payoutRecordStatus_processing") as "payoutRecordStatus_paid");
}

function StatusBadge({ status }: { status: CreatorPayoutSnapshot["payoutStatus"] }) {
  const t = useTranslations("accountSettings");

  const config = {
    none: {
      label: t("payoutStatusNone"),
      className: "bg-zinc-500/20 text-zinc-300",
      icon: Clock3,
    },
    pending: {
      label: t("payoutStatusPending"),
      className: "bg-amber-500/20 text-amber-200",
      icon: Clock3,
    },
    active: {
      label: t("payoutStatusActive"),
      className: "bg-emerald-500/20 text-emerald-200",
      icon: CheckCircle2,
    },
    restricted: {
      label: t("payoutStatusRestricted"),
      className: "bg-rose-500/20 text-rose-200",
      icon: XCircle,
    },
  }[status];

  const Icon = config.icon;

  return (
    <Badge className={cn("gap-1 border-0", config.className)}>
      <Icon className="size-3" />
      {config.label}
    </Badge>
  );
}

export default function PayoutSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="size-8 animate-spin text-violet-400" />
        </div>
      }
    >
      <PayoutSettingsContent />
    </Suspense>
  );
}

function PayoutSettingsContent() {
  const t = useTranslations("accountSettings");
  const { translateApiError } = useApiError();
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const { profile, loading, isCreator } = useAuth();

  const [payout, setPayout] = useState<CreatorPayoutSnapshot | null>(null);
  const [history, setHistory] = useState<CreatorPayoutRecord[]>([]);
  const [fetching, setFetching] = useState(true);
  const [onboarding, setOnboarding] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const loadPayout = useCallback(async () => {
    setFetching(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/payout");
      const data = (await response.json()) as {
        payout?: CreatorPayoutSnapshot;
        history?: CreatorPayoutRecord[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? t("payoutLoadFailed"));
      }
      setPayout(data.payout ?? null);
      setHistory(data.history ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? translateApiError(loadError.message)
          : t("payoutLoadFailed")
      );
    } finally {
      setFetching(false);
    }
  }, [t, translateApiError]);

  useEffect(() => {
    if (loading) return;
    if (!profile) {
      router.replace("/auth?redirect=/settings/payout");
      return;
    }
    if (!isCreator) {
      router.replace("/settings");
      return;
    }
    void loadPayout();
  }, [loading, profile, isCreator, router, loadPayout]);

  useEffect(() => {
    const onboard = searchParams.get("onboard");
    if (onboard === "return") {
      showToast(t("payoutOnboardReturn"));
      void loadPayout();
    }
  }, [searchParams, showToast, t, loadPayout]);

  async function handleConnectStripe() {
    setOnboarding(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/payout/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      const data = (await response.json()) as {
        mode?: string;
        url?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? t("payoutOnboardFailed"));
      }

      if (data.mode === "preview") {
        showToast(t("payoutPreviewMode"));
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (onboardError) {
      setError(
        onboardError instanceof Error
          ? translateApiError(onboardError.message)
          : t("payoutOnboardFailed")
      );
    } finally {
      setOnboarding(false);
    }
  }

  async function handleWithdraw() {
    setWithdrawing(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/payout/withdraw", {
        method: "POST",
        credentials: "same-origin",
      });
      const data = (await response.json()) as {
        error?: string;
        mode?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? t("payoutWithdrawFailed"));
      }

      showToast(
        data.mode === "preview"
          ? t("payoutWithdrawPreviewSuccess")
          : t("payoutWithdrawSuccess")
      );
      await loadPayout();
    } catch (withdrawError) {
      setError(
        withdrawError instanceof Error
          ? translateApiError(withdrawError.message)
          : t("payoutWithdrawFailed")
      );
    } finally {
      setWithdrawing(false);
    }
  }

  if (loading || !profile || !isCreator) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-violet-400" />
      </div>
    );
  }

  const isPreview = !payout?.stripeConfigured || !payout?.paymentsLive;
  const balance = payout?.creatorBalanceUsd ?? 0;
  const canWithdraw = payout?.canWithdraw ?? false;

  return (
    <>
      <AccountSettingsPageHeader
        title={t("payoutTitle")}
        description={t("payoutDesc")}
      />

      <div className="space-y-6">
        {isPreview && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-amber-400/25 bg-amber-500/5 p-4 text-center">
            <Sparkles className="size-5 shrink-0 text-amber-400" />
            <div>
              <p className="text-sm font-medium text-amber-100">
                {t("payoutPreviewBanner")}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                {t("payoutPreviewDesc")}
              </p>
            </div>
          </div>
        )}

        <div className={accountCardClassName}>
          <section className={accountSectionClassName}>
            <div className={settingsSectionHeaderRowClassName}>
              <h2 className={accountSectionTitleClassName}>
                <Wallet className="size-4 text-emerald-400" />
                {t("payoutBalanceSection")}
              </h2>
              {payout && <StatusBadge status={payout.payoutStatus} />}
            </div>

            {fetching ? (
              <div className="flex justify-center py-8">
                <Loader2 className="size-6 animate-spin text-cyan-400" />
              </div>
            ) : (
              <>
                <div className="rounded-xl border border-white/8 bg-zinc-950/50 p-4">
                  <p className="text-xs text-zinc-500">{t("payoutBalanceLabel")}</p>
                  <p className="mt-1 font-mono text-3xl font-semibold text-emerald-300">
                    ${balance.toFixed(2)}
                  </p>
                  <p className="mt-2 text-xs text-zinc-600">
                    {t("payoutThresholdNote", { amount: MIN_PAYOUT_THRESHOLD_USD })}
                  </p>
                  {payout?.availableStripeBalanceUsd != null && (
                    <p className="mt-1 text-xs text-cyan-400/80">
                      {t("payoutStripeAvailable", {
                        amount: payout.availableStripeBalanceUsd.toFixed(2),
                      })}
                    </p>
                  )}
                </div>

                <ul className="space-y-2 text-left text-xs text-zinc-500">
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-cyan-400" />
                    {t("payoutFlowStep1")}
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-cyan-400" />
                    {t("payoutFlowStep2")}
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-cyan-400" />
                    {t("payoutFlowStep3")}
                  </li>
                </ul>

                {canWithdraw && (
                  <Button
                    type="button"
                    onClick={handleWithdraw}
                    disabled={withdrawing || fetching}
                    className="w-full gap-2 bg-emerald-600 hover:bg-emerald-500"
                  >
                    {withdrawing ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Banknote className="size-4" />
                    )}
                    {isPreview
                      ? t("payoutWithdrawPreviewBtn")
                      : t("payoutWithdrawBtn")}
                  </Button>
                )}

                {!canWithdraw && payout?.withdrawalMode !== "disabled" && (
                  <p className="text-xs text-zinc-500">{t("payoutBelowThreshold")}</p>
                )}
              </>
            )}
          </section>
        </div>

        {history.length > 0 && (
          <div className={accountCardClassName}>
            <section className="space-y-3 text-center">
              <h2 className={accountSectionTitleClassName}>
                {t("payoutHistoryTitle")}
              </h2>
              <ul className="space-y-2">
                {history.map((item) => (
                  <li key={item.id} className={settingsListRowClassName}>
                    <div>
                      <p className="font-medium text-white">
                        ${item.amount_usd.toFixed(2)}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {new Date(item.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Badge className="border-0 bg-zinc-700/40 text-zinc-300">
                      {payoutRecordStatusLabel(item.status, t)}
                    </Badge>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}

        <div className={accountCardClassName}>
          <section className={accountSectionCompactClassName}>
            <h2 className={accountSectionTitleClassName}>
              <Banknote className="size-4 text-violet-400" />
              {t("payoutStripeSection")}
            </h2>
            <p className={accountSectionIntroClassName}>
              {t("payoutStripeDesc")}
            </p>

            {payout?.payoutStatus === "active" ? (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-3 text-center text-sm text-emerald-200">
                <CheckCircle2 className="size-4 shrink-0" />
                {t("payoutStripeConnected")}
              </div>
            ) : (
              <Button
                type="button"
                onClick={handleConnectStripe}
                disabled={onboarding || fetching}
                className="gap-2 bg-violet-600 hover:bg-violet-500"
              >
                {onboarding ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ExternalLink className="size-4" />
                )}
                {t("payoutConnectStripe")}
              </Button>
            )}

            {payout?.payoutStatus === "restricted" && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-400/20 bg-rose-500/5 p-3 text-xs text-rose-200">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                {t("payoutRestrictedHint")}
              </div>
            )}

            {error && <p className="text-center text-sm text-rose-400">{error}</p>}

            <p className="text-[11px] text-zinc-600">
              {t("payoutTaxNote")}{" "}
              <Link href="/legal#payments" className="text-violet-400 hover:underline">
                {t("platformFeeLegalLink")}
              </Link>
            </p>
          </section>
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={cn(
              "fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2",
              "rounded-full border border-violet-400/30 bg-zinc-900/95 px-5 py-2.5",
              "text-sm text-violet-100 shadow-xl backdrop-blur-md"
            )}
          >
            <Check className="size-4 text-violet-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
