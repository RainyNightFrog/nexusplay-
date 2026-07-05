"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Banknote, Loader2, RefreshCw, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AdminTipRow, FinanceReconcileRow } from "@/lib/admin-finance-service";
import { cn } from "@/lib/utils";

function formatDate(value: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function tipStatusClass(status: string) {
  switch (status) {
    case "succeeded":
      return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
    case "preview":
      return "border-amber-400/30 bg-amber-500/10 text-amber-200";
    case "refunded":
    case "failed":
      return "border-rose-400/30 bg-rose-500/10 text-rose-200";
    default:
      return "border-white/10 bg-white/5 text-zinc-300";
  }
}

export function AdminFinancePanel() {
  const t = useTranslations("admin");
  const locale = useLocale();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reconcile, setReconcile] = useState<FinanceReconcileRow[]>([]);
  const [tips, setTips] = useState<AdminTipRow[]>([]);
  const [refundingId, setRefundingId] = useState<string | null>(null);

  const loadFinance = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/finance");
      const data = (await response.json()) as {
        reconcile?: FinanceReconcileRow[];
        tips?: AdminTipRow[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? t("financeLoadFailed"));
      setReconcile(data.reconcile ?? []);
      setTips(data.tips ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : t("financeLoadFailed")
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadFinance();
  }, [loadFinance]);

  async function handleRefund(tipId: string) {
    if (!window.confirm(t("financeRefundConfirm"))) return;

    setRefundingId(tipId);
    setError(null);
    try {
      const response = await fetch(`/api/admin/tips/${tipId}/refund`, {
        method: "POST",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? t("financeRefundFailed"));
      await loadFinance();
    } catch (refundError) {
      setError(
        refundError instanceof Error
          ? refundError.message
          : t("financeRefundFailed")
      );
    } finally {
      setRefundingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">{t("tabFinance")}</h2>
          <p className="mt-1 text-sm text-zinc-500">{t("financeDesc")}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void loadFinance()}
          disabled={loading}
          className="gap-2 border-white/10"
        >
          <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          {t("refresh")}
        </Button>
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      <Card className="border-white/8 bg-zinc-900/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <Banknote className="size-4 text-emerald-400" />
            {t("financeReconcileTitle")}
          </CardTitle>
          <CardDescription>{t("financeReconcileDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-6 animate-spin text-emerald-400" />
            </div>
          ) : reconcile.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              {t("financeReconcileEmpty")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/8 text-xs text-zinc-500">
                    <th className="pb-2 pr-4">{t("financeCreator")}</th>
                    <th className="pb-2 pr-4">{t("financeLedger")}</th>
                    <th className="pb-2 pr-4">{t("financeStripe")}</th>
                    <th className="pb-2 pr-4">{t("financeDiff")}</th>
                    <th className="pb-2">{t("financePayoutStatus")}</th>
                  </tr>
                </thead>
                <tbody>
                  {reconcile.map((row) => (
                    <tr key={row.creatorId} className="border-b border-white/5">
                      <td className="py-3 pr-4 text-zinc-200">{row.displayName}</td>
                      <td className="py-3 pr-4 font-mono text-cyan-200">
                        ${row.ledgerUsd.toFixed(2)}
                      </td>
                      <td className="py-3 pr-4 font-mono text-zinc-400">
                        {row.stripeAvailableUsd != null
                          ? `$${row.stripeAvailableUsd.toFixed(2)}`
                          : "—"}
                      </td>
                      <td
                        className={cn(
                          "py-3 pr-4 font-mono",
                          row.diffUsd != null && Math.abs(row.diffUsd) > 0.01
                            ? "text-amber-300"
                            : "text-zinc-500"
                        )}
                      >
                        {row.diffUsd != null ? `$${row.diffUsd.toFixed(2)}` : "—"}
                      </td>
                      <td className="py-3 text-xs text-zinc-500">
                        {row.payoutStatus}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-white/8 bg-zinc-900/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <RotateCcw className="size-4 text-rose-400" />
            {t("financeTipsTitle")}
          </CardTitle>
          <CardDescription>{t("financeTipsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-6 animate-spin text-rose-400" />
            </div>
          ) : tips.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              {t("financeTipsEmpty")}
            </p>
          ) : (
            tips.map((tip) => (
              <div
                key={tip.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/20 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {tip.gameTitle || `#${tip.gameId}`}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {formatDate(tip.createdAt, locale)}
                    {tip.payerEmail ? ` · ${tip.payerEmail}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm text-fuchsia-200">
                    ${tip.amountUsd.toFixed(2)}
                  </span>
                  <Badge className={cn("border", tipStatusClass(tip.status))}>
                    {tip.status}
                  </Badge>
                  {tip.status === "succeeded" && tip.stripePaymentIntentId && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={refundingId === tip.id}
                      onClick={() => void handleRefund(tip.id)}
                      className="border-rose-400/20 text-rose-200 hover:bg-rose-500/10"
                    >
                      {refundingId === tip.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        t("financeRefundBtn")
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
