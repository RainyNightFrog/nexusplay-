"use client";

import { motion } from "framer-motion";
import { TipSupportPanel } from "@/components/game/tip-support-panel";
import { SupporterWall } from "@/components/game/supporter-wall";
import { cn } from "@/lib/utils";

type GameSupportSectionProps = {
  gameId: number;
  gameTitle: string;
  tipsEnabled: boolean;
  suggestedTipAmount?: number | null;
  isGameOwner?: boolean;
  refreshKey?: number;
  paymentMethodsRefreshKey?: number;
  onTipSuccess?: () => void;
  onPaymentMethodsChange?: () => void;
};

export function GameSupportSection({
  gameId,
  gameTitle,
  tipsEnabled,
  suggestedTipAmount = null,
  isGameOwner = false,
  refreshKey = 0,
  paymentMethodsRefreshKey = 0,
  onTipSuccess,
  onPaymentMethodsChange,
}: GameSupportSectionProps) {
  if (!tipsEnabled) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.08 }}
      className="mt-10"
    >
      <div
        className={cn(
          "rounded-2xl border border-fuchsia-400/20 bg-zinc-900/60 p-6 sm:p-8",
          "shadow-lg shadow-black/40 backdrop-blur-sm",
          "shadow-[0_0_32px_rgba(217,70,239,0.06)]"
        )}
      >
        <TipSupportPanel
          embedded
          gameId={gameId}
          gameTitle={gameTitle}
          tipsEnabled={tipsEnabled}
          suggestedTipAmount={suggestedTipAmount}
          isGameOwner={isGameOwner}
          paymentMethodsRefreshKey={paymentMethodsRefreshKey}
          onTipSuccess={onTipSuccess}
          onPaymentMethodsChange={onPaymentMethodsChange}
        />

        <SupporterWall
          embedded
          gameId={gameId}
          tipsEnabled={tipsEnabled}
          refreshKey={refreshKey}
          className="mt-6 border-t border-fuchsia-400/15 pt-6"
        />
      </div>
    </motion.section>
  );
}
