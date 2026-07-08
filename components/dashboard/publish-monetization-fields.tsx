"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Coins } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { TipsFeeDisclosure } from "@/components/dashboard/tips-fee-disclosure";
import { PlatformFeeLockBadge } from "@/components/dashboard/platform-fee-lock-badge";
import { RequiredFieldLabel } from "@/components/dashboard/required-field-label";
import type { GamePublishStatus } from "@/lib/game-publish";
import { MIN_SUGGESTED_TIP_USD } from "@/lib/tip-limits";
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

      <div
        className={cn(
          "rounded-2xl border-2 p-6 text-center transition-all duration-500 sm:p-8",
          values.tipsEnabled
            ? "border-fuchsia-400/45 bg-fuchsia-500/[0.08] shadow-[0_0_36px_rgba(217,70,239,0.22)]"
            : "border-fuchsia-400/25 bg-fuchsia-500/[0.05] shadow-[0_0_28px_rgba(217,70,239,0.12)]"
        )}
      >
        <label className="flex cursor-pointer flex-col items-center">
          <div
            className={cn(
              "flex size-14 items-center justify-center rounded-2xl border transition-all duration-300",
              values.tipsEnabled
                ? "border-fuchsia-400/40 bg-fuchsia-500/20 shadow-[0_0_24px_rgba(217,70,239,0.25)]"
                : "border-fuchsia-400/25 bg-fuchsia-500/10"
            )}
          >
            <Coins
              className={cn(
                "size-7 transition-colors",
                values.tipsEnabled ? "text-fuchsia-200" : "text-fuchsia-400"
              )}
            />
          </div>

          <h3 className="mt-4 text-base font-semibold text-fuchsia-100 sm:text-lg">
            {t("tipsEnabledLabel")}
          </h3>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">
            {t("tipsEnabledDesc")}
          </p>

          <div className="mt-5 flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-zinc-950/50 px-5 py-3">
            <Checkbox
              checked={values.tipsEnabled}
              onCheckedChange={(checked) => {
                const enabled = checked === true;
                onChange({
                  ...values,
                  tipsEnabled: enabled,
                  suggestedTipAmount: enabled
                    ? values.suggestedTipAmount.trim() ||
                      String(MIN_SUGGESTED_TIP_USD)
                    : "",
                });
              }}
              disabled={disabled}
              className={cn(
                "size-5 border-white/20 bg-zinc-900/80 data-checked:border-fuchsia-400 data-checked:bg-fuchsia-500",
                "focus-visible:border-fuchsia-400 focus-visible:ring-fuchsia-500/30"
              )}
            />
            <span className="text-sm font-medium text-zinc-200">
              {values.tipsEnabled
                ? t("tipsEnabledToggleOn")
                : t("tipsEnabledToggleOff")}
            </span>
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
              <div className="mt-6 space-y-4 border-t border-fuchsia-400/15 pt-6">
                <PlatformFeeLockBadge
                  lockedPercent={lockedPlatformFeePercent}
                  tipsEnabled={values.tipsEnabled}
                  className="mx-auto max-w-xl text-center [&>div:first-child]:justify-center"
                />
                <div className="mx-auto max-w-xs space-y-2">
                  <label
                    htmlFor="suggested-tip-amount"
                    className="block text-center text-sm font-medium text-zinc-200"
                  >
                    <RequiredFieldLabel required>
                      {t("suggestedTipAmountLabel")}
                    </RequiredFieldLabel>
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-fuchsia-300/80">
                      $
                    </span>
                    <input
                      id="suggested-tip-amount"
                      type="number"
                      min={MIN_SUGGESTED_TIP_USD}
                      max="99999.99"
                      step="0.01"
                      inputMode="decimal"
                      value={values.suggestedTipAmount}
                      onChange={(event) =>
                        setField("suggestedTipAmount", event.target.value)
                      }
                      placeholder={t("suggestedTipAmountPlaceholder")}
                      className={cn(inputClassName, "h-11 pl-7 pr-3")}
                      disabled={disabled}
                    />
                  </div>
                  <p className="text-center text-xs text-zinc-500">
                    {t("suggestedTipAmountHint")}
                  </p>
                </div>

                <TipsFeeDisclosure
                  variant="full"
                  exampleTipAmount={
                    Number.parseFloat(values.suggestedTipAmount) ||
                    MIN_SUGGESTED_TIP_USD
                  }
                  className="mx-auto max-w-2xl text-center"
                />
                <p className="text-center text-[11px] text-zinc-600">
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
