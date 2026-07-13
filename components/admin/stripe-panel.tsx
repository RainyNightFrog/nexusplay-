"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertTriangle,
  CreditCard,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AdminStripeWebhookRecord } from "@/lib/admin-stripe-service";
import {
  AdminPanelHeader,
  adminPanelCenteredCardsClass,
} from "@/components/admin/admin-panel-header";
import { AdminLoadingState } from "@/components/admin/admin-loading-state";
import { cn } from "@/lib/utils";

function stripeEventStatusLabel(
  status: string,
  t: ReturnType<typeof useTranslations<"admin">>
) {
  const key = `stripeEventStatus_${status}` as const;
  return t.has(key) ? t(key) : status;
}

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

function eventStatusClass(status: string) {
  switch (status) {
    case "processed":
      return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
    case "failed":
      return "border-rose-400/30 bg-rose-500/10 text-rose-200";
    default:
      return "border-white/10 bg-white/5 text-zinc-300";
  }
}

type StripeStats = {
  last7DaysTotal: number;
  last7DaysFailed: number;
  last7DaysDisputes: number;
};

export function AdminStripePanel() {
  const t = useTranslations("admin");
  const locale = useLocale();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<AdminStripeWebhookRecord[]>([]);
  const [stats, setStats] = useState<StripeStats | null>(null);

  const loadStripe = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/stripe/events");
      const data = (await response.json()) as {
        events?: AdminStripeWebhookRecord[];
        stats?: StripeStats;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? t("stripeLoadFailed"));
      setEvents(data.events ?? []);
      setStats(data.stats ?? null);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : t("stripeLoadFailed")
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadStripe();
  }, [loadStripe]);

  return (
    <div className={cn("space-y-6", adminPanelCenteredCardsClass)}>
      <AdminPanelHeader
        title={t("tabStripe")}
        description={t("stripeDesc")}
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadStripe()}
            disabled={loading}
            className="gap-2 border-white/10"
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            {t("refresh")}
          </Button>
        }
      />

      {error && <p className="text-center text-sm text-rose-400">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-white/8 bg-zinc-900/60">
          <CardContent className="flex items-center gap-3 pt-6">
            <CreditCard className="size-8 text-emerald-400" />
            <div>
              <p className="text-xs text-zinc-500">{t("stripeStatTotal")}</p>
              <p className="text-2xl font-semibold text-white">
                {loading ? "—" : (stats?.last7DaysTotal ?? 0)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-white/8 bg-zinc-900/60">
          <CardContent className="flex items-center gap-3 pt-6">
            <XCircle className="size-8 text-rose-400" />
            <div>
              <p className="text-xs text-zinc-500">{t("stripeStatFailed")}</p>
              <p className="text-2xl font-semibold text-white">
                {loading ? "—" : (stats?.last7DaysFailed ?? 0)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-white/8 bg-zinc-900/60">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertTriangle className="size-8 text-amber-400" />
            <div>
              <p className="text-xs text-zinc-500">{t("stripeStatDisputes")}</p>
              <p className="text-2xl font-semibold text-white">
                {loading ? "—" : (stats?.last7DaysDisputes ?? 0)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/8 bg-zinc-900/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <CreditCard className="size-4 text-emerald-400" />
            {t("stripeEventsTitle")}
          </CardTitle>
          <CardDescription>{t("stripeEventsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <AdminLoadingState spinnerClassName="text-emerald-400" minHeightClassName="min-h-0" />
          ) : events.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              {t("stripeEventsEmpty")}
            </p>
          ) : (
            events.map((event) => (
              <div
                key={event.eventId}
                className="rounded-xl border border-white/8 bg-black/20 px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-sm text-white">
                      {event.eventType}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-zinc-500">
                      {event.eventId}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {formatDate(event.processedAt, locale)}
                    </p>
                    {event.payloadSummary && (
                      <p className="mt-1 line-clamp-2 text-xs text-zinc-400">
                        {event.payloadSummary}
                      </p>
                    )}
                    {event.errorMessage && (
                      <p className="mt-1 text-xs text-rose-400">
                        {event.errorMessage}
                      </p>
                    )}
                  </div>
                  <Badge className={cn("border", eventStatusClass(event.status))}>
                    {stripeEventStatusLabel(event.status, t)}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
