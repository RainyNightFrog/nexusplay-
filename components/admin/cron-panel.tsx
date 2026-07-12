"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Clock, Loader2, Play, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AdminCronRunRecord } from "@/lib/admin-cron-service";
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

function cronStatusClass(status: string | null) {
  switch (status) {
    case "success":
      return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
    case "failed":
      return "border-rose-400/30 bg-rose-500/10 text-rose-200";
    case "running":
      return "border-amber-400/30 bg-amber-500/10 text-amber-200";
    default:
      return "border-white/10 bg-white/5 text-zinc-300";
  }
}

export function AdminCronPanel() {
  const t = useTranslations("admin");
  const locale = useLocale();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<AdminCronRunRecord[]>([]);
  const [triggering, setTriggering] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/cron");
      const data = (await response.json()) as {
        jobs?: AdminCronRunRecord[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? t("cronLoadFailed"));
      setJobs(data.jobs ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : t("cronLoadFailed")
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  async function handleTrigger(jobName: string) {
    if (!window.confirm(t("cronTriggerConfirm", { job: jobName }))) return;

    setTriggering(jobName);
    setError(null);
    try {
      const response = await fetch("/api/admin/cron", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobName }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? t("cronTriggerFailed"));
      await loadJobs();
    } catch (triggerError) {
      setError(
        triggerError instanceof Error
          ? triggerError.message
          : t("cronTriggerFailed")
      );
    } finally {
      setTriggering(null);
    }
  }

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">{t("tabCron")}</h2>
          <p className="mt-1 text-sm text-zinc-500">{t("cronDesc")}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void loadJobs()}
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
            <Clock className="size-4 text-cyan-400" />
            {t("cronJobsTitle")}
          </CardTitle>
          <CardDescription>{t("cronJobsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-6 animate-spin text-cyan-400" />
            </div>
          ) : jobs.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              {t("cronJobsEmpty")}
            </p>
          ) : (
            jobs.map((job) => (
              <div
                key={job.name}
                className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-white/8 bg-black/20 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-white">{job.label}</p>
                    <Badge className="border border-white/10 bg-white/5 font-mono text-xs text-zinc-400">
                      {job.name}
                    </Badge>
                    {job.lastStatus && (
                      <Badge
                        className={cn("border", cronStatusClass(job.lastStatus))}
                      >
                        {job.lastStatus}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">{job.description}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {job.lastRunAt
                      ? t("cronLastRun", {
                          date: formatDate(job.lastRunAt, locale),
                        })
                      : t("cronNeverRun")}
                    {job.lastDurationMs != null &&
                      ` · ${job.lastDurationMs}ms`}
                  </p>
                  {job.lastError && (
                    <p className="mt-1 text-xs text-rose-400">{job.lastError}</p>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={triggering === job.name}
                  onClick={() => void handleTrigger(job.name)}
                  className="gap-1.5 border-cyan-400/20 text-cyan-200"
                >
                  {triggering === job.name ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Play className="size-3.5" />
                  )}
                  {t("cronTriggerBtn")}
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
