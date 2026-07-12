"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, RefreshCw, RotateCcw, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdminOrderRecord } from "@/lib/admin-orders-service";
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

function orderStatusClass(status: string) {
  switch (status) {
    case "succeeded":
      return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
    case "pending":
      return "border-amber-400/30 bg-amber-500/10 text-amber-200";
    case "refunded":
    case "failed":
      return "border-rose-400/30 bg-rose-500/10 text-rose-200";
    default:
      return "border-white/10 bg-white/5 text-zinc-300";
  }
}

export function AdminOrdersPanel() {
  const t = useTranslations("admin");
  const locale = useLocale();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("all");
  const [orders, setOrders] = useState<AdminOrderRecord[]>([]);
  const [refundingId, setRefundingId] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ status });
      const response = await fetch(`/api/admin/orders?${params.toString()}`);
      const data = (await response.json()) as {
        orders?: AdminOrderRecord[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? t("ordersLoadFailed"));
      setOrders(data.orders ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : t("ordersLoadFailed")
      );
    } finally {
      setLoading(false);
    }
  }, [status, t]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  async function handleRefund(orderId: string) {
    if (!window.confirm(t("ordersRefundConfirm"))) return;

    setRefundingId(orderId);
    setError(null);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/refund`, {
        method: "POST",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? t("ordersRefundFailed"));
      await loadOrders();
    } catch (refundError) {
      setError(
        refundError instanceof Error
          ? refundError.message
          : t("ordersRefundFailed")
      );
    } finally {
      setRefundingId(null);
    }
  }

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">{t("tabOrders")}</h2>
          <p className="mt-1 text-sm text-zinc-500">{t("ordersDesc")}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void loadOrders()}
          disabled={loading}
          className="gap-2 border-white/10"
        >
          <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          {t("refresh")}
        </Button>
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      <div className="flex items-center gap-3">
        <span className="text-sm text-zinc-400">{t("ordersStatusFilter")}</span>
        <Select
          value={status}
          onValueChange={(value) => {
            if (value) setStatus(value);
          }}
        >
          <SelectTrigger className="w-40 border-white/10 bg-zinc-900/60 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterAll")}</SelectItem>
            <SelectItem value="succeeded">{t("ordersStatusSucceeded")}</SelectItem>
            <SelectItem value="pending">{t("ordersStatusPending")}</SelectItem>
            <SelectItem value="refunded">{t("ordersStatusRefunded")}</SelectItem>
            <SelectItem value="failed">{t("ordersStatusFailed")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-white/8 bg-zinc-900/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <ShoppingBag className="size-4 text-fuchsia-400" />
            {t("ordersListTitle")}
          </CardTitle>
          <CardDescription>{t("ordersListDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-6 animate-spin text-fuchsia-400" />
            </div>
          ) : orders.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              {t("ordersEmpty")}
            </p>
          ) : (
            orders.map((order) => (
              <div
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/20 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {order.gameTitle ?? order.orderType}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {formatDate(order.createdAt, locale)}
                    {order.buyerEmail
                      ? ` · ${order.buyerName} (${order.buyerEmail})`
                      : ` · ${order.buyerName}`}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {t("ordersType")}: {order.orderType}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm text-fuchsia-200">
                    ${(order.totalAmountCents / 100).toFixed(2)}
                  </span>
                  <Badge className={cn("border", orderStatusClass(order.status))}>
                    {order.status}
                  </Badge>
                  {order.status === "succeeded" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={refundingId === order.id}
                      onClick={() => void handleRefund(order.id)}
                      className="gap-1.5 border-rose-400/20 text-rose-200 hover:bg-rose-500/10"
                    >
                      {refundingId === order.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="size-3.5" />
                      )}
                      {t("ordersRefundBtn")}
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
