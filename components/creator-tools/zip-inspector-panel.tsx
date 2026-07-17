"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Archive, CheckCircle2, Loader2, Zap } from "lucide-react";
import {
  formatZipBytes,
  inspectGameZipFile,
  type ZipInspectorReport,
} from "@/lib/creator-tools/zip-inspector";
import { ToolMetric, ToolSectionCard } from "@/components/creator-tools/tool-section-card";
import { cn } from "@/lib/utils";

type ZipInspectorPanelProps = {
  file: File | null;
  compact?: boolean;
  onReport?: (report: ZipInspectorReport | null) => void;
};

export function ZipInspectorPanel({ file, compact = false, onReport }: ZipInspectorPanelProps) {
  const t = useTranslations("creatorTools");
  const [report, setReport] = useState<ZipInspectorReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!file) {
      setReport(null);
      onReport?.(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    inspectGameZipFile(file)
      .then((result) => {
        if (!cancelled) {
          setReport(result);
          onReport?.(result);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [file, onReport]);

  if (!file) {
    if (compact) return null;
    return (
      <ToolSectionCard
        title={t("zipInspectorTitle")}
        description={t("zipInspectorDesc")}
        icon={<Archive className="size-5" />}
      >
        <p className="text-center text-sm text-zinc-500">{t("zipInspectorEmpty")}</p>
      </ToolSectionCard>
    );
  }

  const inner = (
    <div className="space-y-4">
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-zinc-400">
          <Loader2 className="size-5 animate-spin text-cyan-400" />
          {t("zipInspectorAnalyzing")}
        </div>
      ) : report ? (
        <>
          {!report.ok && report.error && (
            <div className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-center text-sm text-rose-200">
              {report.error}
            </div>
          )}

          {report.ok && (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <ToolMetric
                  label={t("zipMetricFiles")}
                  value={String(report.fileCount)}
                  accent="cyan"
                />
                <ToolMetric
                  label={t("zipMetricCompressed")}
                  value={formatZipBytes(report.totalCompressedBytes)}
                  accent="violet"
                />
                <ToolMetric
                  label={t("zipMetricUncompressed")}
                  value={formatZipBytes(report.totalUncompressedBytes)}
                  accent="amber"
                />
                <ToolMetric
                  label={t("zipMetricLoadTime")}
                  value={t("zipMetricLoadSeconds", { seconds: report.estimatedLoadSeconds })}
                  accent="emerald"
                />
              </div>

              {report.entryPath && (
                <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 px-4 py-3 text-center text-sm text-cyan-100">
                  <span className="text-zinc-400">{t("zipEntryPath")}: </span>
                  <code className="font-mono text-cyan-200">{report.entryPath}</code>
                </div>
              )}

              {report.warnings.length > 0 && (
                <div className="space-y-2">
                  <p className="text-center text-xs font-medium tracking-wide text-zinc-500 uppercase">
                    {t("zipWarningsTitle")}
                  </p>
                  {report.warnings.map((warning, index) => (
                    <div
                      key={`${warning.id}-${index}`}
                      className={cn(
                        "flex items-start gap-2 rounded-xl border px-3 py-2.5 text-left text-sm",
                        warning.severity === "critical" &&
                          "border-rose-400/25 bg-rose-500/10 text-rose-200",
                        warning.severity === "warning" &&
                          "border-amber-400/25 bg-amber-500/10 text-amber-200",
                        warning.severity === "info" &&
                          "border-white/10 bg-zinc-950/50 text-zinc-300"
                      )}
                    >
                      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                      <span>{t(`zipWarning_${warning.id}`, warning.meta ?? {})}</span>
                    </div>
                  ))}
                </div>
              )}

              {report.largestFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-center text-xs font-medium tracking-wide text-zinc-500 uppercase">
                    {t("zipLargestFiles")}
                  </p>
                  <div className="overflow-hidden rounded-xl border border-white/8">
                    {report.largestFiles.map((item) => (
                      <div
                        key={item.path}
                        className="flex items-center justify-between gap-3 border-b border-white/5 px-3 py-2 text-xs last:border-b-0"
                      >
                        <span className="truncate font-mono text-zinc-400">{item.path}</span>
                        <span className="shrink-0 text-zinc-300 tabular-nums">
                          {formatZipBytes(item.uncompressedBytes ?? item.compressedBytes)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-2">
                {report.hasSdkReference ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
                    <CheckCircle2 className="size-3.5" />
                    {t("zipSdkDetected")}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-600/40 bg-zinc-800/50 px-3 py-1 text-xs text-zinc-400">
                    <Zap className="size-3.5" />
                    {t("zipSdkNotDetected")}
                  </span>
                )}
                {report.sdkSignals.map((signal) => (
                  <span
                    key={signal}
                    className="rounded-full border border-violet-400/25 bg-violet-500/10 px-2.5 py-0.5 text-[11px] text-violet-200"
                  >
                    {signal}
                  </span>
                ))}
              </div>
            </>
          )}
        </>
      ) : null}
    </div>
  );

  if (compact) {
    return (
      <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-4">
        <div className="mb-3 flex items-center justify-center gap-2 text-sm font-medium text-cyan-200">
          <Archive className="size-4" />
          {t("zipInspectorTitle")}
        </div>
        {inner}
      </div>
    );
  }

  return (
    <ToolSectionCard
      title={t("zipInspectorTitle")}
      description={t("zipInspectorDesc")}
      icon={<Archive className="size-5" />}
    >
      {inner}
    </ToolSectionCard>
  );
}
