"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  CircleDashed,
  ExternalLink,
  Loader2,
  Rocket,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  LaunchChecklistItem,
  LaunchChecklistPhase,
  LaunchChecklistReport,
} from "@/lib/launch-checklist-service";
import { AdminPanelFrame } from "@/components/admin/admin-panel-frame";
import { AdminLoadingState } from "@/components/admin/admin-loading-state";
import { cn } from "@/lib/utils";

function statusIcon(status: LaunchChecklistItem["status"]) {
  switch (status) {
    case "pass":
      return <CheckCircle2 className="size-4 text-emerald-400" />;
    case "fail":
      return <AlertTriangle className="size-4 text-rose-400" />;
    case "warn":
      return <AlertTriangle className="size-4 text-amber-400" />;
    case "manual":
      return <Circle className="size-4 text-cyan-400" />;
    default:
      return <CircleDashed className="size-4 text-zinc-500" />;
  }
}

function statusBadgeClass(status: LaunchChecklistItem["status"]) {
  switch (status) {
    case "pass":
      return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
    case "fail":
      return "border-rose-400/30 bg-rose-500/10 text-rose-200";
    case "warn":
      return "border-amber-400/30 bg-amber-500/10 text-amber-200";
    case "manual":
      return "border-cyan-400/30 bg-cyan-500/10 text-cyan-200";
    default:
      return "border-white/10 bg-white/5 text-zinc-400";
  }
}

function alertClass(severity: "critical" | "warning" | "info") {
  switch (severity) {
    case "critical":
      return "border-rose-400/30 bg-rose-500/10 text-rose-100";
    case "warning":
      return "border-amber-400/30 bg-amber-500/10 text-amber-100";
    default:
      return "border-cyan-400/30 bg-cyan-500/10 text-cyan-100";
  }
}

type LaunchChecklistPanelProps = {
  onError?: (message: string) => void;
};

export function AdminLaunchChecklistPanel({ onError }: LaunchChecklistPanelProps) {
  const t = useTranslations("admin");
  const [report, setReport] = useState<LaunchChecklistReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/launch-checklist", {
        credentials: "same-origin",
      });
      const data = (await response.json()) as LaunchChecklistReport & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? t("launchChecklistLoadFailed"));
      }
      setReport(data);
    } catch (error) {
      onError?.(
        error instanceof Error ? error.message : t("launchChecklistLoadFailed")
      );
    } finally {
      setLoading(false);
    }
  }, [onError, t]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  async function toggleManualItem(itemId: string, completed: boolean) {
    setSavingId(itemId);
    try {
      const response = await fetch("/api/admin/launch-checklist", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ itemId, completed }),
      });
      const data = (await response.json()) as LaunchChecklistReport & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? t("launchChecklistSaveFailed"));
      }
      setReport(data);
    } catch (error) {
      onError?.(
        error instanceof Error ? error.message : t("launchChecklistSaveFailed")
      );
    } finally {
      setSavingId(null);
    }
  }

  const grouped = useMemo(() => {
    if (!report) return [] as Array<{ phase: LaunchChecklistPhase; items: LaunchChecklistItem[] }>;

    const phases: LaunchChecklistPhase[] = ["soft", "payments", "optional"];
    return phases.map((phase) => ({
      phase,
      items: report.items.filter((item) => item.phase === phase),
    }));
  }, [report]);

  if (loading && !report) {
    return (
      <AdminPanelFrame
        title={t("tabLaunch")}
        description={t("launchChecklistPhaseDesc_soft")}
        onRefresh={() => void loadReport()}
        refreshing={loading}
        refreshLabel={t("refresh")}
        centerContent
      >
        <AdminLoadingState spinnerClassName="text-cyan-400" minHeightClassName="min-h-48" />
      </AdminPanelFrame>
    );
  }

  if (!report) {
    return (
      <AdminPanelFrame
        title={t("tabLaunch")}
        description={t("launchChecklistPhaseDesc_soft")}
        onRefresh={() => void loadReport()}
        refreshLabel={t("refresh")}
        centerContent
      >
        <Card className="border-white/10 bg-zinc-900/40">
          <CardContent className="py-12 text-center text-sm text-zinc-500">
            {t("launchChecklistLoadFailed")}
          </CardContent>
        </Card>
      </AdminPanelFrame>
    );
  }

  return (
    <AdminPanelFrame
      title={t("tabLaunch")}
      description={t("launchChecklistPhaseDesc_soft")}
      onRefresh={() => void loadReport()}
      refreshing={loading}
      refreshLabel={t("refresh")}
      centerContent
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-cyan-400/20 bg-zinc-900/60">
          <CardHeader className="pb-2 text-center">
            <CardDescription>{t("launchChecklistSoftProgress")}</CardDescription>
            <CardTitle className="text-2xl text-cyan-200">
              {report.summary.softRequiredPass}/{report.summary.softRequiredTotal}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center text-xs text-zinc-500">
            {report.summary.readyForSoftLaunch
              ? t("launchChecklistSoftReady")
              : t("launchChecklistSoftPending")}
          </CardContent>
        </Card>
        <Card className="border-violet-400/20 bg-zinc-900/60">
          <CardHeader className="pb-2 text-center">
            <CardDescription>{t("launchChecklistPaymentsProgress")}</CardDescription>
            <CardTitle className="text-2xl text-violet-200">
              {report.summary.paymentsRequiredPass}/
              {report.summary.paymentsRequiredTotal}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center text-xs text-zinc-500">
            {report.summary.readyForPayments
              ? t("launchChecklistPaymentsReady")
              : t("launchChecklistPaymentsPending")}
          </CardContent>
        </Card>
        <Card className="border-amber-400/20 bg-zinc-900/60">
          <CardHeader className="pb-2 text-center">
            <CardDescription>{t("launchChecklistManualPending")}</CardDescription>
            <CardTitle className="text-2xl text-amber-200">
              {report.summary.manualPending}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center text-xs text-zinc-500">
            {report.siteUrl}
          </CardContent>
        </Card>
      </div>

      {report.alerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-center text-sm font-medium text-zinc-300">
            {t("launchChecklistAlertsTitle")}
          </h3>
          {report.alerts.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                "rounded-xl border px-4 py-3 text-sm",
                alertClass(alert.severity)
              )}
            >
              <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-between">
                <span>{alert.message}</span>
                {alert.actionUrl && (
                  <a
                    href={alert.actionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs underline underline-offset-2"
                  >
                    {t("launchChecklistOpenLink")}
                    <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {grouped.map(({ phase, items }) => (
        <Card key={phase} className="border-white/10 bg-zinc-900/60">
          <CardHeader className="text-center">
            <div className="mb-2 inline-flex items-center gap-2 text-sm text-zinc-400">
              {phase === "soft" ? (
                <Rocket className="size-4 text-cyan-400" />
              ) : phase === "payments" ? (
                <ShieldCheck className="size-4 text-violet-400" />
              ) : (
                <CircleDashed className="size-4 text-zinc-500" />
              )}
              {t(`launchChecklistPhase_${phase}`)}
            </div>
            <CardTitle className="text-lg text-white">
              {t(`launchChecklistPhaseTitle_${phase}`)}
            </CardTitle>
            <CardDescription>
              {t(`launchChecklistPhaseDesc_${phase}`)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item) => {
              const isManual = item.id.startsWith("manual_");
              const isChecked = report.manualState[item.id] === true;

              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1 text-center sm:text-left">
                      <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                        {statusIcon(item.status)}
                        <p className="font-medium text-white">
                          {t(`launchChecklistItem_${item.id}`)}
                        </p>
                        {item.required && (
                          <Badge className="border-rose-400/20 bg-rose-500/10 text-rose-200">
                            {t("launchChecklistRequired")}
                          </Badge>
                        )}
                        <Badge
                          className={cn("border", statusBadgeClass(item.status))}
                        >
                          {t(`launchChecklistStatus_${item.status}`)}
                        </Badge>
                      </div>
                      {item.detail && (
                        <p className="mt-2 text-sm text-zinc-400">{item.detail}</p>
                      )}
                      <p className="mt-1 text-xs text-zinc-500">
                        {t(`launchChecklistHint_${item.id}`)}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap justify-center gap-2">
                      {item.actionUrl && (
                        <a
                          href={item.actionUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            buttonVariants({ variant: "outline", size: "sm" }),
                            "border-white/10 bg-white/5"
                          )}
                        >
                          <ExternalLink className="size-4" />
                          {t("launchChecklistOpenLink")}
                        </a>
                      )}
                      {isManual && (
                        <Button
                          size="sm"
                          disabled={savingId === item.id}
                          onClick={() =>
                            void toggleManualItem(item.id, !isChecked)
                          }
                          className={cn(
                            isChecked
                              ? "bg-emerald-600 hover:bg-emerald-500"
                              : "bg-cyan-600 hover:bg-cyan-500"
                          )}
                        >
                          {savingId === item.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="size-4" />
                          )}
                          {isChecked
                            ? t("launchChecklistMarkIncomplete")
                            : t("launchChecklistMarkComplete")}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </AdminPanelFrame>
  );
}
