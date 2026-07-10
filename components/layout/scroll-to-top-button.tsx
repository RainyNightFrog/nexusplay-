"use client";

import { motion } from "framer-motion";
import { ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";

export function ScrollToTopButton() {
  const t = useTranslations("nav");

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <motion.button
      type="button"
      onClick={scrollToTop}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      aria-label={t("scrollToTop")}
      title={t("scrollToTop")}
      className="pointer-events-auto inline-flex h-10 items-center justify-center gap-1 rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 px-3 text-white shadow-lg shadow-cyan-500/20 ring-1 ring-white/10"
    >
      <ChevronUp className="size-3.5 shrink-0" />
      <span className="text-xs font-semibold">{t("scrollToTop")}</span>
    </motion.button>
  );
}
