"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, Globe2 } from "lucide-react";
import { cn } from "@/lib/utils";

type SubdomainUrlPreviewProps = {
  url: string;
  note?: string;
  tone?: "cyan" | "violet";
};

export function SubdomainUrlPreview({
  url,
  note,
  tone = "cyan",
}: SubdomainUrlPreviewProps) {
  const t = useTranslations("common");
  const [copied, setCopied] = useState(false);

  const toneClasses =
    tone === "violet"
      ? "border-violet-400/20 bg-violet-500/5 text-violet-100/90"
      : "border-cyan-400/20 bg-cyan-500/5 text-cyan-100/90";

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-2">
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border px-3 py-2.5",
          toneClasses
        )}
      >
        <Globe2 className="size-3.5 shrink-0 opacity-80" aria-hidden />
        <code
          className="min-w-0 flex-1 select-all truncate rounded-md bg-black/20 px-2 py-1 font-mono text-xs tracking-tight"
          translate="no"
        >
          {url}
        </code>
        <button
          type="button"
          onClick={() => void copyUrl()}
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1",
            "text-[11px] text-zinc-200 transition-colors hover:bg-white/10"
          )}
          aria-label={t("copySubdomainUrl")}
        >
          {copied ? (
            <Check className="size-3 text-emerald-400" />
          ) : (
            <Copy className="size-3" />
          )}
          <span>{copied ? t("linkCopied") : t("copySubdomainUrl")}</span>
        </button>
      </div>
      {note ? (
        <p className="select-none text-center text-xs leading-relaxed text-zinc-500">
          {note}
        </p>
      ) : null}
    </div>
  );
}
