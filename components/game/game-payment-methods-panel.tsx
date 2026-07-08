"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { CreditCard, Loader2, Sparkles, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const AddPaymentMethodForm = dynamic(
  () =>
    import("@/components/settings/add-payment-method-form").then(
      (module) => module.AddPaymentMethodForm
    ),
  { ssr: false }
);

type SavedCard = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
};

type GamePaymentMethodsPanelProps = {
  className?: string;
  onCardsChange?: () => void;
};

export function GamePaymentMethodsPanel({
  className,
  onCardsChange,
}: GamePaymentMethodsPanelProps) {
  const tg = useTranslations("game");
  const ta = useTranslations("accountSettings");
  const { profile, loading: authLoading } = useAuth();
  const pathname = usePathname();

  const [fetching, setFetching] = useState(false);
  const [paymentsLive, setPaymentsLive] = useState(false);
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [setupPublishableKey, setSetupPublishableKey] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadCards = useCallback(async () => {
    setFetching(true);
    try {
      const response = await fetch("/api/auth/payment-methods");
      const data = await response.json();
      setPaymentsLive(data.paymentsLive === true);
      setCards(data.cards ?? []);
    } catch {
      setCards([]);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !profile) return;
    void loadCards();
  }, [authLoading, profile, loadCards]);

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
        throw new Error(data.error ?? ta("paymentSetupFailed"));
      }
      setSetupSecret(data.clientSecret);
      setSetupPublishableKey(data.publishableKey ?? "");
    } catch (startError) {
      setSetupError(
        startError instanceof Error
          ? startError.message
          : ta("paymentSetupFailed")
      );
    } finally {
      setSetupLoading(false);
    }
  }

  async function handleRemoveCard(paymentMethodId: string) {
    setRemovingId(paymentMethodId);
    setSetupError(null);
    try {
      const response = await fetch(
        `/api/auth/payment-methods?paymentMethodId=${encodeURIComponent(paymentMethodId)}`,
        { method: "DELETE" }
      );
      const data = (await response.json()) as {
        error?: string;
        cards?: SavedCard[];
      };
      if (!response.ok) throw new Error(data.error ?? ta("paymentRemoveFailed"));
      setCards(data.cards ?? []);
      onCardsChange?.();
    } catch (removeError) {
      setSetupError(
        removeError instanceof Error
          ? removeError.message
          : ta("paymentRemoveFailed")
      );
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className={className}>
      <div className="text-center">
        <div className="flex items-center justify-center gap-2">
          <CreditCard className="size-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-cyan-100">
            {tg("tipPaymentMethodsTitle")}
          </h3>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
          {tg("tipPaymentMethodsDesc")}
        </p>
      </div>

      {authLoading ? (
        <div className="mt-4 flex justify-center py-4">
          <Loader2 className="size-4 animate-spin text-cyan-400" />
        </div>
      ) : !profile ? (
        <div className="mt-4 text-center">
          <p className="text-xs text-zinc-500">{tg("tipPaymentMethodsLogin")}</p>
          <Link
            href={`/auth?redirect=${encodeURIComponent(pathname)}`}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "mt-3 border-cyan-400/25 bg-cyan-500/10 text-cyan-200 hover:border-cyan-400/40"
            )}
          >
            {tg("tipPaymentMethodsLoginButton")}
          </Link>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {!paymentsLive && (
            <div className="flex items-start justify-center gap-2 rounded-xl border border-amber-400/20 bg-amber-500/5 p-3 text-left text-xs text-amber-100/90">
              <Sparkles className="mt-0.5 size-4 shrink-0" />
              <p>{ta("paymentPreviewDesc")}</p>
            </div>
          )}

          {fetching ? (
            <div className="flex justify-center py-4">
              <Loader2 className="size-4 animate-spin text-cyan-400" />
            </div>
          ) : cards.length > 0 ? (
            <ul className="mx-auto max-w-md space-y-2">
              {cards.map((card) => (
                <li
                  key={card.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-zinc-950/40 px-3 py-2 text-xs"
                >
                  <span className="truncate capitalize text-zinc-300">
                    {card.brand} ···· {card.last4}
                  </span>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-zinc-500">
                      {card.expMonth}/{card.expYear}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={!paymentsLive || removingId === card.id}
                      onClick={() => void handleRemoveCard(card.id)}
                      className="size-7 text-rose-300 hover:text-rose-200"
                      aria-label={ta("paymentRemoveCard")}
                    >
                      {removingId === card.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-xs text-zinc-600">{ta("paymentEmpty")}</p>
          )}

          {setupError && (
            <p className="text-center text-xs text-rose-400">{setupError}</p>
          )}

          {setupSecret && setupPublishableKey ? (
            <div className="mx-auto max-w-md">
              <AddPaymentMethodForm
                clientSecret={setupSecret}
                publishableKey={setupPublishableKey}
                onSuccess={() => {
                  setSetupSecret(null);
                  setSetupPublishableKey("");
                  void loadCards();
                  onCardsChange?.();
                }}
                onCancel={() => {
                  setSetupSecret(null);
                  setSetupPublishableKey("");
                }}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Button
                type="button"
                size="sm"
                disabled={!paymentsLive || setupLoading}
                onClick={() => void handleStartAddCard()}
                className="gap-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50"
              >
                {setupLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CreditCard className="size-4" />
                )}
                {ta("paymentAddCard")}
              </Button>
              <Link
                href="/settings/payment"
                className="text-[11px] text-violet-400 hover:underline"
              >
                {tg("tipPaymentMethodsManageLink")}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
