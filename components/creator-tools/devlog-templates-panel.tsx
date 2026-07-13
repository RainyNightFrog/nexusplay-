"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Copy, FileText, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEVLOG_TEMPLATES } from "@/lib/creator-tools/devlog-templates";
import { ToolSectionCard } from "@/components/creator-tools/tool-section-card";
import { cn } from "@/lib/utils";

export function DevlogTemplatesPanel() {
  const t = useTranslations("creatorTools");
  const [selectedId, setSelectedId] = useState(DEVLOG_TEMPLATES[0].id);
  const [copied, setCopied] = useState(false);

  const selected = DEVLOG_TEMPLATES.find((item) => item.id === selectedId) ?? DEVLOG_TEMPLATES[0];
  const title = t(selected.titleKey);
  const body = t(selected.bodyKey);

  const handleCopy = async () => {
    const text = `# ${title}\n\n${body}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <ToolSectionCard
      title={t("devlogTitle")}
      description={t("devlogDesc")}
      icon={<FileText className="size-5" />}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap justify-center gap-2">
          {DEVLOG_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => setSelectedId(template.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                selectedId === template.id
                  ? "border-violet-400/50 bg-violet-500/15 text-violet-100"
                  : "border-white/10 bg-zinc-950/50 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
              )}
            >
              {t(template.titleKey)}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-white/10 bg-zinc-950/60 p-4 text-left">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
            {body}
          </p>
        </div>

        <div className="flex justify-center">
          <Button
            type="button"
            onClick={() => void handleCopy()}
            className="gap-2 border-0 bg-gradient-to-r from-cyan-500 to-violet-600 text-white"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? t("devlogCopied") : t("devlogCopy")}
          </Button>
        </div>
      </div>
    </ToolSectionCard>
  );
}
