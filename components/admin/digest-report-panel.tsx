"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Mail, Radio, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ForumDigestAdminReport } from "@/lib/forum-digest-admin-service";
import type { FeedHealthReport } from "@/lib/feed-health-service";
import { AdminPanelFrame } from "@/components/admin/admin-panel-frame";
import { cn } from "@/lib/utils";

type AdminDigestReportPanelProps = {
  onError?: (message: string) => void;
  onSuccess?: (message: string) => void;
};

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

export function AdminDigestReportPanel({ onError, onSuccess }: AdminDigestReportPanelProps) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ForumDigestAdminReport | null>(null);
  const [health, setHealth] = useState<FeedHealthReport | null>(null);
  const [actionKey, setActionKey] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const [reportResponse, healthResponse] = await Promise.all([
        fetch("/api/admin/forum-digest/report", { credentials: "same-origin" }),
        fetch("/api/feeds/health"),
      ]);

      const reportData = (await reportResponse.json()) as {
        report?: ForumDigestAdminReport;
        error?: string;
      };
      if (!reportResponse.ok) {
        throw new Error(reportData.error ?? t("actionFailed"));
      }

      const healthData = (await healthResponse.json()) as FeedHealthReport & {
        error?: string;
      };

      setReport(reportData.report ?? null);
      setHealth(healthResponse.ok ? healthData : null);
    } catch (error) {
      onError?.(error instanceof Error ? error.message : t("actionFailed"));
    } finally {
      setLoading(false);
    }
  }, [onError, t]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const runAction = async (key: string, path: string, successKey: string) => {
    setActionKey(key);
    try {
      const response = await fetch(path, { method: "POST", credentials: "same-origin" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? t("actionFailed"));
      }
      onSuccess?.(t(successKey));
      await loadReport();
    } catch (error) {
      onError?.(error instanceof Error ? error.message : t("actionFailed"));
    } finally {
      setActionKey(null);
    }
  };

  if (loading) {
    return (
      <AdminPanelFrame
        title={t("tabDigest")}
        description={t("digestRecentTitle")}
        onRefresh={() => void loadReport()}
        refreshing={loading}
        refreshLabel={t("refresh")}
        centerContent
      >
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-violet-400" />
        </div>
      </AdminPanelFrame>
    );
  }

  if (!report) {
    return (
      <AdminPanelFrame
        title={t("tabDigest")}
        description={t("digestRecentTitle")}
        onRefresh={() => void loadReport()}
        refreshLabel={t("refresh")}
        centerContent
      >
        <Card className="border-white/10 bg-zinc-900/40">
          <CardContent className="py-12 text-center text-sm text-zinc-500">
            {t("digestReportEmpty")}
          </CardContent>
        </Card>
      </AdminPanelFrame>
    );
  }

  const digestActions = (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={Boolean(actionKey)}
        onClick={() => void runAction("retry", "/api/admin/forum-digest/retry", "digestRetryTriggered")}
        className="border-amber-400/20 bg-amber-500/10 text-amber-200"
      >
        {actionKey === "retry" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Zap className="size-4" />
        )}
        {t("digestRetryNow")}
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={Boolean(actionKey) || !report.websub.configured}
        onClick={() =>
          void runAction("websub-sub", "/api/admin/websub/subscribe", "websubSubscribeTriggered")
        }
        className="border-cyan-400/20 bg-cyan-500/10 text-cyan-200"
      >
        {actionKey === "websub-sub" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Radio className="size-4" />
        )}
        {t("websubSubscribeNow")}
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={Boolean(actionKey) || !report.websub.configured}
        onClick={() => void runAction("websub-ping", "/api/admin/websub/ping", "websubPingTriggered")}
        className="border-cyan-400/20 bg-cyan-500/10 text-cyan-200"
      >
        {actionKey === "websub-ping" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Radio className="size-4" />
        )}
        {t("websubPingNow")}
      </Button>
    </>
  );

  return (
    <AdminPanelFrame
      title={t("tabDigest")}
      description={t("digestRecentTitle")}
      onRefresh={() => void loadReport()}
      refreshing={loading}
      refreshLabel={t("refresh")}
      actions={digestActions}
      centerContent
    >
      {health ? (
        <Card
          className={cn(
            "border-white/10 bg-zinc-900/60",
            health.healthy ? "border-emerald-400/20" : "border-rose-400/20"
          )}
        >
          <CardHeader className="pb-2 text-center">
            <CardTitle className="text-base">
              {health.healthy ? t("feedHealthOk") : t("feedHealthFail")}
            </CardTitle>
            <CardDescription>{formatDate(health.checkedAt, locale)}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap justify-center gap-2">
            {health.checks.map((check) => (
              <Badge
                key={check.id}
                className={cn(
                  "border",
                  check.ok
                    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                    : "border-rose-400/30 bg-rose-500/10 text-rose-200"
                )}
              >
                {check.id}
              </Badge>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-violet-400/20 bg-zinc-900/60">
          <CardHeader className="pb-2 text-center">
            <CardDescription>{t("digestSubscribers")}</CardDescription>
            <CardTitle className="text-3xl text-violet-200">{report.subscribers}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-emerald-400/20 bg-zinc-900/60">
          <CardHeader className="pb-2 text-center">
            <CardDescription>{t("digestSent7d")}</CardDescription>
            <CardTitle className="text-3xl text-emerald-200">{report.sentLast7Days}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-rose-400/20 bg-zinc-900/60">
          <CardHeader className="pb-2 text-center">
            <CardDescription>{t("digestFailed7d")}</CardDescription>
            <CardTitle className="text-3xl text-rose-200">{report.failedLast7Days}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-amber-400/20 bg-zinc-900/60">
          <CardHeader className="pb-2 text-center">
            <CardDescription>{t("digestPendingRetries")}</CardDescription>
            <CardTitle className="text-3xl text-amber-200">{report.pendingRetries}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {report.retryQueue.length > 0 ? (
        <Card className="border-amber-400/20 bg-zinc-900/60">
          <CardHeader className="text-center">
            <CardTitle className="text-base">{t("digestRetryQueueTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-white/5 p-0">
            {report.retryQueue.map((entry) => (
              <div key={entry.id} className="px-4 py-3 text-center text-sm sm:text-left">
                <p className="text-zinc-300">
                  {entry.userId.slice(0, 8)}… · {entry.attemptCount}/{entry.maxAttempts}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {t("digestRetryDue", { date: formatDate(entry.nextRetryAt, locale) })}
                  {entry.lastError ? ` · ${entry.lastError}` : ""}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-white/10 bg-zinc-900/60">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-base">
            <Radio className="size-4 text-cyan-400" />
            {t("websubTitle")}
          </CardTitle>
          <CardDescription>
            {report.websub.configured
              ? t("websubConfigured")
              : t("websubNotConfigured")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-center text-sm text-zinc-400">
          <p>
            {t("websubActive", { count: report.websub.activeSubscriptions })} ·{" "}
            {t("websubNotifications7d", { count: report.websub.notificationsLast7Days })}
          </p>
          {report.websub.subscriptions.length > 0 ? (
            <ul className="divide-y divide-white/5 rounded-xl border border-white/5 text-left text-xs">
              {report.websub.subscriptions.map((sub) => (
                <li key={sub.id} className="px-3 py-2">
                  <p className="truncate text-zinc-300">{sub.topicUrl}</p>
                  <p className="mt-0.5 text-zinc-500">
                    {sub.status}
                    {sub.lastError ? ` · ${sub.lastError}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-zinc-500">{t("websubEmpty")}</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-zinc-900/60">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-base">
            <Mail className="size-4 text-violet-400" />
            {t("digestRecentTitle")}
          </CardTitle>
          <CardDescription>
            {t("digestSent30d", { count: report.sentLast30Days })} ·{" "}
            {t("digestFailed30d", { count: report.failedLast30Days })}
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-white/5 p-0">
          {report.recent.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-zinc-500">
              {t("digestReportEmpty")}
            </p>
          ) : (
            report.recent.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col gap-2 px-4 py-3 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left"
              >
                <div>
                  <p className="text-sm text-zinc-300">
                    {entry.userId.slice(0, 8)}… · {entry.locale}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {formatDate(entry.createdAt, locale)}
                    {entry.status === "sent"
                      ? ` · ${t("digestHistorySent", { count: entry.postCount })}`
                      : entry.errorMessage
                        ? ` · ${entry.errorMessage}`
                        : ` · ${t("digestHistoryFailed")}`}
                  </p>
                </div>
                <Badge
                  className={cn(
                    "mx-auto border sm:mx-0",
                    entry.status === "sent"
                      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                      : "border-rose-400/30 bg-rose-500/10 text-rose-200"
                  )}
                >
                  {entry.status === "sent" ? t("digestStatusSent") : t("digestStatusFailed")}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </AdminPanelFrame>
  );
}
