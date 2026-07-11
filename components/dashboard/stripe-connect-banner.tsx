"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ConnectOnboardingReturnTo } from "@/lib/creator-payout-service";
import { cn } from "@/lib/utils";

type StripeConnectStatus = {
  stripeAccountId: string | null;
  stripeDetailsSubmitted: boolean;
  canReceivePaidPayments: boolean;
  payoutStatus: string;
};

type StripeConnectBannerProps = {
  returnTo?: ConnectOnboardingReturnTo;
  gameId?: number;
  required?: boolean;
  className?: string;
  onStatusChange?: (status: StripeConnectStatus | null) => void;
};

export function StripeConnectBanner({
  returnTo = "dashboard",
  gameId,
  required = false,
  className,
  onStatusChange,
}: StripeConnectBannerProps) {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<StripeConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/stripe/connect");
      const data = (await response.json()) as StripeConnectStatus & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? t("stripeConnectLoadFailed"));
      }
      setStatus(data);
      onStatusChange?.(data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : t("stripeConnectLoadFailed")
      );
      setStatus(null);
      onStatusChange?.(null);
    } finally {
      setLoading(false);
    }
  }, [onStatusChange, t]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    const stripeConnect = searchParams.get("stripeConnect");
    if (stripeConnect === "return" || stripeConnect === "refresh") {
      void loadStatus();
    }
  }, [searchParams, loadStatus]);

  async function handleConnect() {
    setConnecting(true);
    setError(null);
    try {
      const response = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, returnTo, gameId }),
      });
      const data = (await response.json()) as {
        mode?: string;
        url?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? t("stripeConnectFailed"));
      }

      if (data.mode === "preview") {
        setError(t("stripeConnectPreviewMode"));
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (connectError) {
      setError(
        connectError instanceof Error
          ? connectError.message
          : t("stripeConnectFailed")
      );
    } finally {
      setConnecting(false);
    }
  }

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-zinc-500",
          className
        )}
      >
        <Loader2 className="size-4 animate-spin" />
        {t("stripeConnectLoading")}
      </div>
    );
  }

  if (status?.canReceivePaidPayments) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-4 sm:px-5 sm:py-5",
        required
          ? "border-amber-400/30 bg-amber-500/[0.08]"
          : "border-white/10 bg-white/[0.03]",
        className
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1 text-left">
          <p className="text-sm font-semibold text-zinc-100">
            {required ? t("stripeConnectRequiredTitle") : t("stripeConnectTitle")}
          </p>
          <p className="text-xs leading-relaxed text-zinc-400">
            {status?.stripeDetailsSubmitted
              ? t("stripeConnectPendingDesc")
              : t("stripeConnectDesc")}
          </p>
          {error && <p className="text-xs text-rose-300">{error}</p>}
        </div>
        <Button
          type="button"
          onClick={handleConnect}
          disabled={connecting}
          className="h-10 shrink-0 gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500"
        >
          {connecting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ExternalLink className="size-4" />
          )}
          {t("stripeConnectButton")}
        </Button>
      </div>
    </div>
  );
}
