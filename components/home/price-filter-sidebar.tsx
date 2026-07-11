"use client";

import { motion } from "framer-motion";
import { BadgeDollarSign } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PriceFilterId } from "@/lib/game-price-filter";
import { cn } from "@/lib/utils";

const PRICE_FILTER_IDS: PriceFilterId[] = [
  "all",
  "free",
  "under_5",
  "under_15",
  "on_sale",
];

type PriceFilterSidebarProps = {
  value: PriceFilterId;
  onChange: (value: PriceFilterId) => void;
  className?: string;
};

export function PriceFilterSidebar({
  value,
  onChange,
  className,
}: PriceFilterSidebarProps) {
  const t = useTranslations("home");

  return (
    <aside
      className={cn(
        "w-full shrink-0 lg:w-56 xl:w-60",
        className
      )}
    >
      <div
        className={cn(
          "rounded-2xl border border-white/10 bg-zinc-900/50 p-4 shadow-xl shadow-black/20 backdrop-blur-md",
          "lg:sticky lg:top-24"
        )}
      >
        <div className="mb-3 flex items-center justify-center gap-2 text-sm font-semibold text-emerald-300 lg:justify-start">
          <BadgeDollarSign className="size-4" />
          <span>{t("priceFilterTitle")}</span>
        </div>

        <nav className="flex flex-wrap justify-center gap-2 lg:flex-col lg:items-stretch">
          {PRICE_FILTER_IDS.map((id) => {
            const active = value === id;
            return (
              <motion.button
                key={id}
                type="button"
                onClick={() => onChange(id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-100 shadow-[0_0_20px_rgba(52,211,153,0.12)]"
                    : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
                )}
              >
                {t(`priceFilter.${id}`)}
              </motion.button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
