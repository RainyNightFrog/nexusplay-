"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Coins, Rocket, Wrench } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { TipsFeeDisclosure } from "@/components/dashboard/tips-fee-disclosure";
import { PlatformFeeLockBadge } from "@/components/dashboard/platform-fee-lock-badge";
import type { GamePublishStatus } from "@/lib/game-publish";
import { cn } from "@/lib/utils";

export type PublishMonetizationValues = {
  publishStatus: GamePublishStatus;
  tipsEnabled: boolean;
  suggestedTipAmount: string;
};

type PublishMonetizationFieldsProps = {
  values: PublishMonetizationValues;
  onChange: (values: PublishMonetizationValues) => void;
  disabled?: boolean;
  lockedPlatformFeePercent?: number | null;
};

const inputClassName = cn(
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 text-center text-sm text-zinc-100",
  "placeholder:text-zinc-500 backdrop-blur-md outline-none transition-all duration-200",
  "focus:border-fuchsia-400/40 focus:bg-white/8 focus:ring-2 focus:ring-fuchsia-500/20"
);

const STATUS_OPTIONS: Array<{
  value: GamePublishStatus;
  icon: typeof Wrench;
  accent: "amber" | "cyan";
}> = [
  { value: "draft", icon: Wrench, accent: "amber" },
  { value: "public", icon: Rocket, accent: "cyan" },
];

export function PublishMonetizationFields({
  values,
  onChange,
  disabled = false,
  lockedPlatformFeePercent = null,
}: PublishMonetizationFieldsProps) {
  const t = useTranslations("dashboard");

  const setField = <K extends keyof PublishMonetizationValues>(
    key: K,
    value: PublishMonetizationValues[K]
  ) => {
    onChange({ ...values, [key]: value });
  };

  return (
    <section className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-fuchsia-400">
          {t("publishMonetizationSection")}
        </h2>
        <p className="text-xs leading-relaxed text-zinc-500">
          {t("publishMonetizationDesc")}
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-center text-sm font-medium text-zinc-200">
          {t("publishStatusLabel")}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {STATUS_OPTIONS.map(({ value, icon: Icon, accent }) => {
            const selected = values.publishStatus === value;
            const isDraft = value === "draft";

            return (
              <motion.button
                key={value}
                type="button"
                disabled={disabled}
                whileHover={disabled ? undefined : { scale: 1.02 }}
                whileTap={disabled ? undefined : { scale: 0.98 }}
                onClick={() => setField("publishStatus", value)}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border px-4 py-4 text-left transition-all duration-500",
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
                      {isDraft ? t("publishStatusDraft") : t("publishStatusPublic")}
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
      </div>

      <div
        className={cn(
          "rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition-all duration-500",
          values.tipsEnabled &&
            "border-fuchsia-400/25 bg-fuchsia-500/[0.04] shadow-[0_0_24px_rgba(217,70,239,0.12)]"
        )}
      >
        <label className="flex cursor-pointer items-start gap-3 text-left">
          <Checkbox
            checked={values.tipsEnabled}
            onCheckedChange={(checked) => {
              const enabled = checked === true;
              onChange({
                ...values,
                tipsEnabled: enabled,
                suggestedTipAmount: enabled ? values.suggestedTipAmount : "",
              });
            }}
            disabled={disabled}
            className={cn(
              "mt-0.5 border-white/20 bg-zinc-900/80 data-checked:border-fuchsia-400 data-checked:bg-fuchsia-500",
              "focus-visible:border-fuchsia-400 focus-visible:ring-fuchsia-500/30"
            )}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Coins className="size-4 text-fuchsia-400" />
              <span className="text-sm font-medium text-zinc-100">
                {t("tipsEnabledLabel")}
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              {t("tipsEnabledDesc")}
            </p>
          </div>
        </label>

        <AnimatePresence initial={false}>
          {values.tipsEnabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="mt-4 space-y-4 border-t border-fuchsia-400/10 pt-4">
                <PlatformFeeLockBadge
                  lockedPercent={lockedPlatformFeePercent}
                  tipsEnabled={values.tipsEnabled}
                />
                <div className="space-y-2">
                <label
                  htmlFor="suggested-tip-amount"
                  className="block text-center text-sm font-medium text-zinc-200"
                >
                  <RequiredFieldLabel required>
                    {t("suggestedTipAmountLabel")}
                  </RequiredFieldLabel>
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-fuchsia-300/80">
                    $
                  </span>
                  <input
                    id="suggested-tip-amount"
                    type="number"
                    min="0"
                    max="99999.99"
                    step="0.01"
                    inputMode="decimal"
                    value={values.suggestedTipAmount}
                    onChange={(event) =>
                      setField("suggestedTipAmount", event.target.value)
                    }
                    placeholder={t("suggestedTipAmountPlaceholder")}
                    className={cn(inputClassName, "h-11 pl-8 text-left")}
                    disabled={disabled}
                  />
                </div>
                <p className="text-center text-xs text-zinc-500">{t("suggestedTipAmountHint")}</p>
                </div>

                <TipsFeeDisclosure
                  variant="full"
                  exampleTipAmount={
                    Number.parseFloat(values.suggestedTipAmount) || 10
                  }
                  className="mt-4"
                />
                <p className="mt-3 text-center text-[11px] text-zinc-600">
                  {t("tipsLegalLinkPrefix")}{" "}
                  <Link
                    href="/legal#payments"
                    className="text-violet-400/80 underline-offset-2 hover:text-violet-300 hover:underline"
                  >
                    {t("tipsLegalLinkLabel")}
                  </Link>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
