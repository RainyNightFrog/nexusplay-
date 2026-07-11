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
    <aside className={cn("w-full shrink-0", className)}>
      <div
        className={cn(
          "rounded-2xl border border-white/10 bg-zinc-900/50 p-3.5 shadow-xl shadow-black/20 backdrop-blur-md sm:p-4",
          "min-[1600px]:sticky min-[1600px]:top-24"
        )}
      >
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-300">
          <BadgeDollarSign className="size-4 shrink-0" />
          <span>{t("priceFilterTitle")}</span>
        </div>

        <nav className="flex flex-wrap gap-2 min-[1600px]:flex-col min-[1600px]:items-stretch">
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
                  "rounded-xl border px-3 py-2 text-left text-sm font-medium transition-colors",
                  "min-[1600px]:px-3 min-[1600px]:py-2.5",
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
