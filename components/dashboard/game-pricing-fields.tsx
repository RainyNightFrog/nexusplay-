"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BadgeDollarSign, Gift, HandCoins, Tag } from "lucide-react";
import { useTranslations } from "next-intl";
import { RequiredFieldLabel } from "@/components/dashboard/required-field-label";
import {
  DEFAULT_PRICING_CURRENCY,
  type GamePricingType,
  type GamePricingValues,
} from "@/lib/game-pricing";
import { cn } from "@/lib/utils";

type GamePricingFieldsProps = {
  values: GamePricingValues;
  onChange: (values: GamePricingValues) => void;
  disabled?: boolean;
};

const PRICING_OPTIONS: Array<{
  value: GamePricingType;
  icon: typeof Gift;
  accent: "emerald" | "cyan" | "violet";
}> = [
  { value: "free", icon: Gift, accent: "emerald" },
  { value: "fixed", icon: Tag, accent: "cyan" },
  { value: "pwyw", icon: HandCoins, accent: "violet" },
];

const inputClassName = cn(
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 text-center text-sm text-zinc-100",
  "placeholder:text-zinc-500 backdrop-blur-md outline-none transition-all duration-200",
  "focus:border-emerald-400/40 focus:bg-white/8 focus:ring-2 focus:ring-emerald-500/20"
);

export function GamePricingFields({
  values,
  onChange,
  disabled = false,
}: GamePricingFieldsProps) {
  const t = useTranslations("dashboard");

  const setField = <K extends keyof GamePricingValues>(
    key: K,
    value: GamePricingValues[K]
  ) => {
    onChange({ ...values, [key]: value });
  };

  const handleTypeChange = (pricingType: GamePricingType) => {
    onChange({
      ...values,
      pricingType,
      priceAmount: pricingType === "fixed" ? values.priceAmount : "",
      minPriceAmount:
        pricingType === "pwyw"
          ? values.minPriceAmount.trim() || "0"
          : "",
    });
  };

  return (
    <section id="field-pricing" className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-emerald-400">
          {t("gamePricingSection")}
        </h2>
        <p className="text-xs leading-relaxed text-zinc-500">
          {t("gamePricingDesc")}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {PRICING_OPTIONS.map(({ value, icon: Icon, accent }) => {
          const selected = values.pricingType === value;

          return (
            <motion.button
              key={value}
              type="button"
              disabled={disabled}
              whileHover={disabled ? undefined : { scale: 1.02 }}
              whileTap={disabled ? undefined : { scale: 0.98 }}
              onClick={() => handleTypeChange(value)}
              className={cn(
                "group relative h-full overflow-hidden rounded-2xl border px-4 py-4 text-left transition-all duration-500",
                "disabled:cursor-not-allowed disabled:opacity-60",
                selected
                  ? accent === "emerald"
                    ? "border-emerald-400/40 bg-emerald-500/10 shadow-[0_0_24px_rgba(52,211,153,0.18)]"
                    : accent === "cyan"
                      ? "border-cyan-400/40 bg-cyan-500/10 shadow-[0_0_24px_rgba(34,211,238,0.18)]"
                      : "border-violet-400/40 bg-violet-500/10 shadow-[0_0_24px_rgba(139,92,246,0.18)]"
                  : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
              )}
            >
              <div className="relative flex items-start gap-3">
                <div
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-xl border transition-colors duration-300",
                    selected
                      ? accent === "emerald"
                        ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-300"
                        : accent === "cyan"
                          ? "border-cyan-400/30 bg-cyan-500/15 text-cyan-300"
                          : "border-violet-400/30 bg-violet-500/15 text-violet-300"
                      : "border-white/10 bg-white/5 text-zinc-400"
                  )}
                >
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">
                    {value === "free"
                      ? t("pricingTypeFree")
                      : value === "fixed"
                        ? t("pricingTypeFixed")
                        : t("pricingTypePwyw")}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                    {value === "free"
                      ? t("pricingTypeFreeDesc")
                      : value === "fixed"
                        ? t("pricingTypeFixedDesc")
                        : t("pricingTypePwywDesc")}
                  </p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence initial={false}>
        {values.pricingType !== "free" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.05] p-5 sm:p-6">
              <div className="mx-auto flex max-w-xs flex-col items-center gap-2">
                <BadgeDollarSign className="size-5 text-emerald-300" />
                <label
                  htmlFor={
                    values.pricingType === "fixed"
                      ? "game-price-amount"
                      : "game-min-price-amount"
                  }
                  className="text-center text-sm font-medium text-zinc-200"
                >
                  <RequiredFieldLabel required>
                    {values.pricingType === "fixed"
                      ? t("pricingFixedAmountLabel")
                      : t("pricingMinAmountLabel")}
                  </RequiredFieldLabel>
                </label>
                <div className="relative w-full">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-emerald-300/80">
                    $
                  </span>
                  <input
                    id={
                      values.pricingType === "fixed"
                        ? "game-price-amount"
                        : "game-min-price-amount"
                    }
                    type="number"
                    min="0"
                    max="99999.99"
                    step="0.01"
                    inputMode="decimal"
                    value={
                      values.pricingType === "fixed"
                        ? values.priceAmount
                        : values.minPriceAmount
                    }
                    onChange={(event) =>
                      values.pricingType === "fixed"
                        ? setField("priceAmount", event.target.value)
                        : setField("minPriceAmount", event.target.value)
                    }
                    placeholder={
                      values.pricingType === "fixed"
                        ? t("pricingFixedAmountPlaceholder")
                        : t("pricingMinAmountPlaceholder")
                    }
                    className={cn(inputClassName, "h-11 pl-7 pr-3")}
                    disabled={disabled}
                  />
                </div>
                <p className="text-center text-xs text-zinc-500">
                  {values.pricingType === "fixed"
                    ? t("pricingFixedAmountHint", {
                        currency: values.currency || DEFAULT_PRICING_CURRENCY,
                      })
                    : t("pricingMinAmountHint", {
                        currency: values.currency || DEFAULT_PRICING_CURRENCY,
                      })}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
