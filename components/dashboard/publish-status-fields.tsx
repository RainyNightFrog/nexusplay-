"use client";

import { motion } from "framer-motion";
import { Rocket, Wrench } from "lucide-react";
import { useTranslations } from "next-intl";
import { PublishRequiredHint } from "@/components/dashboard/publish-required-hint";
import type { GamePublishStatus } from "@/lib/game-publish";
import { cn } from "@/lib/utils";

type PublishStatusFieldsProps = {
  value: GamePublishStatus;
  onChange: (value: GamePublishStatus) => void;
  disabled?: boolean;
  className?: string;
};

const STATUS_OPTIONS: Array<{
  value: GamePublishStatus;
  icon: typeof Wrench;
  accent: "amber" | "cyan";
}> = [
  { value: "draft", icon: Wrench, accent: "amber" },
  { value: "public", icon: Rocket, accent: "cyan" },
];

export function PublishStatusFields({
  value,
  onChange,
  disabled = false,
  className,
}: PublishStatusFieldsProps) {
  const t = useTranslations("dashboard");

  return (
    <section className={cn("space-y-3", className)}>
      <div className="space-y-1 text-center">
        <p className="text-sm font-semibold text-zinc-100">
          {t("publishStatusLabel")}
        </p>
        <p className="text-xs text-zinc-500">{t("publishStatusSectionDesc")}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {STATUS_OPTIONS.map(({ value: optionValue, icon: Icon, accent }) => {
          const selected = value === optionValue;
          const isDraft = optionValue === "draft";

          return (
            <motion.button
              key={optionValue}
              type="button"
              disabled={disabled}
              whileHover={disabled ? undefined : { scale: 1.02 }}
              whileTap={disabled ? undefined : { scale: 0.98 }}
              onClick={() => onChange(optionValue)}
              className={cn(
                "group relative h-full overflow-hidden rounded-2xl border px-4 py-4 text-left transition-all duration-500",
                "disabled:cursor-not-allowed disabled:opacity-60",
                selected
                  ? isDraft
                    ? "border-amber-400/40 bg-amber-500/10 shadow-[0_0_24px_rgba(245,158,11,0.18)]"
                    : "border-cyan-400/40 bg-cyan-500/10 shadow-[0_0_28px_rgba(34,211,238,0.22)]"
                  : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
              )}
            >
              {selected && !isDraft && (
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-violet-500/10" />
              )}
              <div className="relative flex items-start gap-3">
                <div
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-xl border transition-colors duration-300",
                    selected
                      ? isDraft
                        ? "border-amber-400/30 bg-amber-500/15 text-amber-300"
                        : "border-cyan-400/30 bg-cyan-500/15 text-cyan-300"
                      : accent === "amber"
                        ? "border-white/10 bg-white/5 text-zinc-400 group-hover:border-amber-400/20 group-hover:text-amber-300"
                        : "border-white/10 bg-white/5 text-zinc-400 group-hover:border-cyan-400/20 group-hover:text-cyan-300"
                  )}
                >
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">
                    {isDraft
                      ? t("publishStatusDraft")
                      : t("publishStatusPublic")}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                    {isDraft
                      ? t("publishStatusDraftDesc")
                      : t("publishStatusPublicDesc")}
                  </p>
                </div>
                <div
                  className={cn(
                    "mt-1 size-4 shrink-0 rounded-full border-2 transition-all duration-300",
                    selected
                      ? isDraft
                        ? "border-amber-400 bg-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.6)]"
                        : "border-cyan-400 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.6)]"
                      : "border-zinc-600 bg-transparent"
                  )}
                />
              </div>
            </motion.button>
          );
        })}
      </div>

      <PublishRequiredHint publishStatus={value} />
    </section>
  );
}
