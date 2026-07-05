"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { CreditCard, Heart, Loader2, Sparkles, Trash2 } from "lucide-react";
import { AddPaymentMethodForm } from "@/components/settings/add-payment-method-form";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { AccountSettingsPageHeader } from "@/components/settings/account-settings-layout";
import {
  accountCardClassName,
  accountSectionTitleClassName,
} from "@/components/settings/account-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import type { PayerTipRecord } from "@/lib/payer-tips-service";
import { cn } from "@/lib/utils";

type SavedCard = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
};

function tipStatusLabel(
  status: string,
  t: ReturnType<typeof useTranslations<"accountSettings">>
) {
  const labels: Record<string, string> = {
    succeeded: t("paymentTipStatus_succeeded"),
    preview: t("paymentTipStatus_preview"),
    pending: t("paymentTipStatus_pending"),
    failed: t("paymentTipStatus_failed"),
    refunded: t("paymentTipStatus_refunded"),
  };
  return labels[status] ?? status;
}

function tipStatusClass(status: string) {
  switch (status) {
    case "succeeded":
      return "bg-emerald-500/15 text-emerald-200";
    case "preview":
      return "bg-amber-500/15 text-amber-200";
    case "failed":
    case "refunded":
      return "bg-rose-500/15 text-rose-200";
    default:
      return "bg-zinc-700/50 text-zinc-300";
  }
}

export default function PaymentSettingsPage() {
  const t = useTranslations("accountSettings");
  const router = useRouter();
  const { profile, loading } = useAuth();

  const [fetching, setFetching] = useState(true);
  const [paymentsLive, setPaymentsLive] = useState(false);
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [tips, setTips] = useState<PayerTipRecord[]>([]);
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [setupPublishableKey, setSetupPublishableKey] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function reloadCards() {
    const response = await fetch("/api/auth/payment-methods");
    const data = await response.json();
    setPaymentsLive(data.paymentsLive === true);
    setCards(data.cards ?? []);
  }

  useEffect(() => {
    if (loading) return;
    if (!profile) {
      router.replace("/auth?redirect=/settings/payment");
      return;
    }

    Promise.all([
      fetch("/api/auth/payment-methods").then((response) => response.json()),
      fetch("/api/auth/tips").then((response) => response.json()),
    ])
      .then(([paymentData, tipsData]) => {
        setPaymentsLive(paymentData.paymentsLive === true);
        setCards(paymentData.cards ?? []);
        setTips(tipsData.tips ?? []);
      })
      .finally(() => setFetching(false));
  }, [loading, profile, router]);

  async function handleStartAddCard() {
    setSetupLoading(true);
    setSetupError(null);
    try {
      const response = await fetch("/api/auth/payment-methods", {
        method: "POST",
      });
      const data = (await response.json()) as {
        clientSecret?: string;
        publishableKey?: string;
        error?: string;
      };
      if (!response.ok || !data.clientSecret) {
        throw new Error(data.error ?? t("paymentSetupFailed"));
      }
      setSetupSecret(data.clientSecret);
      setSetupPublishableKey(data.publishableKey ?? "");
    } catch (startError) {
      setSetupError(
        startError instanceof Error ? startError.message : t("paymentSetupFailed")
      );
    } finally {
      setSetupLoading(false);
    }
  }

  async function handleRemoveCard(paymentMethodId: string) {
    setRemovingId(paymentMethodId);
    try {
      const response = await fetch(
        `/api/auth/payment-methods?paymentMethodId=${encodeURIComponent(paymentMethodId)}`,
        { method: "DELETE" }
      );
      const data = (await response.json()) as { error?: string; cards?: SavedCard[] };
      if (!response.ok) throw new Error(data.error ?? t("paymentRemoveFailed"));
      setCards(data.cards ?? []);
    } catch (removeError) {
      setSetupError(
        removeError instanceof Error
          ? removeError.message
          : t("paymentRemoveFailed")
      );
    } finally {
      setRemovingId(null);
    }
  }

  if (loading || !profile) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <>
      <AccountSettingsPageHeader
        title={t("paymentTitle")}
        description={t("paymentDesc")}
      />

      <div className="space-y-6">
        {!paymentsLive && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-400/25 bg-amber-500/5 p-4">
            <Sparkles className="mt-0.5 size-5 shrink-0 text-amber-400" />
            <div>
              <p className="text-sm font-medium text-amber-100">
                {t("paymentPreviewBanner")}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                {t("paymentPreviewDesc")}
              </p>
            </div>
          </div>
        )}

        <div className={accountCardClassName}>
          <section className="space-y-4 text-left">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className={accountSectionTitleClassName}>
                <CreditCard className="size-4 text-cyan-400" />
                {t("paymentCardsSection")}
              </h2>
              {!paymentsLive && (
                <Badge className="border-0 bg-zinc-700/50 text-zinc-300">
                  {t("paymentComingSoon")}
                </Badge>
              )}
            </div>

            <p className="text-xs leading-relaxed text-zinc-500">
              {t("paymentCardsDesc")}
            </p>

            {fetching ? (
              <div className="flex justify-center py-6">
                <Loader2 className="size-6 animate-spin text-cyan-400" />
              </div>
            ) : cards.length > 0 ? (
              <ul className="space-y-2">
                {cards.map((card) => (
                  <li
                    key={card.id}
                    className="flex items-center justify-between rounded-xl border border-white/8 bg-zinc-950/40 px-4 py-3 text-sm"
                  >
                    <span className="capitalize text-zinc-200">
                      {card.brand} ···· {card.last4}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-zinc-500">
                        {card.expMonth}/{card.expYear}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={!paymentsLive || removingId === card.id}
                        onClick={() => void handleRemoveCard(card.id)}
                        className="h-8 gap-1 text-rose-300 hover:text-rose-200"
                      >
                        {removingId === card.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                        {t("paymentRemoveCard")}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-white/10 py-8 text-center text-sm text-zinc-600">
                {t("paymentEmpty")}
              </p>
            )}

            {setupError && (
              <p className="text-sm text-rose-400">{setupError}</p>
            )}

            {setupSecret && setupPublishableKey ? (
              <AddPaymentMethodForm
                clientSecret={setupSecret}
                publishableKey={setupPublishableKey}
                onSuccess={() => {
                  setSetupSecret(null);
                  setSetupPublishableKey("");
                  void reloadCards();
                }}
                onCancel={() => {
                  setSetupSecret(null);
                  setSetupPublishableKey("");
                }}
              />
            ) : (
              <Button
                type="button"
                disabled={!paymentsLive || setupLoading}
                onClick={() => void handleStartAddCard()}
                className="gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50"
              >
                {setupLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CreditCard className="size-4" />
                )}
                {t("paymentAddCard")}
              </Button>
            )}
          </section>
        </div>

        <div className={accountCardClassName}>
          <section className="space-y-4 text-left">
            <h2 className={accountSectionTitleClassName}>
              <Heart className="size-4 text-fuchsia-400" />
              {t("paymentTipsSection")}
            </h2>
            <p className="text-xs leading-relaxed text-zinc-500">
              {t("paymentTipsDesc")}
            </p>

            {fetching ? (
              <div className="flex justify-center py-6">
                <Loader2 className="size-6 animate-spin text-fuchsia-400" />
              </div>
            ) : tips.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/10 py-8 text-center text-sm text-zinc-600">
                {t("paymentTipsEmpty")}
              </p>
            ) : (
              <ul className="space-y-2">
                {tips.map((tip) => (
                  <li
                    key={tip.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/8 bg-zinc-950/40 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-100">
                        {tip.gameTitle || `#${tip.gameId}`}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {new Date(tip.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-fuchsia-200">
                        ${tip.amountUsd.toFixed(2)}
                      </span>
                      <Badge
                        className={cn("border-0 text-[10px]", tipStatusClass(tip.status))}
                      >
                        {tipStatusLabel(tip.status, t)}
                      </Badge>
                      <Link
                        href={`/api/games/tips/${tip.id}/receipt`}
                        className="text-xs text-violet-400 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t("paymentTipsReceipt")}
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
