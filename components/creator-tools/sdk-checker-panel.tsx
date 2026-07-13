"use client";

import { useTranslations } from "next-intl";
import { CheckCircle2, Circle, Code2, ExternalLink } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buildSdkChecklist } from "@/lib/creator-tools/devlog-templates";
import { ToolSectionCard } from "@/components/creator-tools/tool-section-card";
import { cn } from "@/lib/utils";

type SdkCheckerPanelProps = {
  sdkSignals?: string[];
  compact?: boolean;
};

export function SdkCheckerPanel({ sdkSignals = [], compact = false }: SdkCheckerPanelProps) {
  const t = useTranslations("creatorTools");
  const items = buildSdkChecklist(sdkSignals.map((s) => s.toLowerCase()));

  const content = (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left",
              item.detected
                ? "border-emerald-400/25 bg-emerald-500/10"
                : "border-white/8 bg-zinc-950/50"
            )}
          >
            {item.detected ? (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
            ) : (
              <Circle className="size-4 shrink-0 text-zinc-600" />
            )}
            <div>
              <p className="text-sm text-zinc-200">{t(`sdkItem_${item.id}`)}</p>
              {item.optional && (
                <p className="text-[11px] text-zinc-500">{t("sdkOptional")}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 px-4 py-3 text-sm text-cyan-100">
        <p>{t("sdkHint")}</p>
        <Link
          href="/dashboard/tools"
          className="mt-2 inline-flex items-center gap-1.5 text-cyan-300 underline-offset-2 hover:underline"
        >
          {t("sdkDocsLink")}
          <ExternalLink className="size-3.5" />
        </Link>
      </div>
    </div>
  );

  if (compact) {
    return (
      <div className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/5 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-fuchsia-200">
          <Code2 className="size-4" />
          {t("sdkTitle")}
        </div>
        {content}
      </div>
    );
  }

  return (
    <ToolSectionCard
      title={t("sdkTitle")}
      description={t("sdkDesc")}
      icon={<Code2 className="size-5" />}
    >
      {content}
    </ToolSectionCard>
  );
}
