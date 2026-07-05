"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Mail, RefreshCw } from "lucide-react";
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
import { cn } from "@/lib/utils";

type AdminDigestReportPanelProps = {
  onError?: (message: string) => void;
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

export function AdminDigestReportPanel({ onError }: AdminDigestReportPanelProps) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ForumDigestAdminReport | null>(null);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/forum-digest/report", {
        credentials: "same-origin",
      });
      const data = (await response.json()) as {
        report?: ForumDigestAdminReport;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? t("actionFailed"));
      }
      setReport(data.report ?? null);
    } catch (error) {
      onError?.(error instanceof Error ? error.message : t("actionFailed"));
    } finally {
      setLoading(false);
    }
  }, [onError, t]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-violet-400" />
      </div>
    );
  }

  if (!report) {
    return (
      <Card className="border-white/10 bg-zinc-900/40">
        <CardContent className="py-12 text-center text-sm text-zinc-500">
          {t("digestReportEmpty")}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadReport()}
          disabled={loading}
          className="border-white/10 bg-white/5"
        >
          <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          {t("refresh")}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        <Card className="border-rose-400/20 bg-zinc-900/60 sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2 text-center">
            <CardDescription>{t("digestFailed7d")}</CardDescription>
            <CardTitle className="text-3xl text-rose-200">{report.failedLast7Days}</CardTitle>
          </CardHeader>
        </Card>
      </div>

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
    </div>
  );
}
