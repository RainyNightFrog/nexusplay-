"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type GameLeaveConfirmDialogProps = {
  open: boolean;
  onStay: () => void;
  onLeave: () => void;
};

export function GameLeaveConfirmDialog({
  open,
  onStay,
  onLeave,
}: GameLeaveConfirmDialogProps) {
  const t = useTranslations("game");

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-label={t("leaveConfirmStay")}
            className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-md"
            onClick={onStay}
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="game-leave-title"
            aria-describedby="game-leave-desc"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className={cn(
              "fixed left-1/2 top-1/2 z-[71] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2",
              "overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 shadow-2xl shadow-black/60 backdrop-blur-xl"
            )}
          >
            <div className="border-b border-white/8 bg-gradient-to-r from-cyan-500/10 via-transparent to-violet-500/10 px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-rose-500/20 text-amber-300">
                  <AlertTriangle className="size-5" />
                </div>
                <div>
                  <h2
                    id="game-leave-title"
                    className="text-base font-semibold text-zinc-100"
                  >
                    {t("leaveConfirmTitle")}
                  </h2>
                  <p
                    id="game-leave-desc"
                    className="mt-1 text-sm leading-relaxed text-zinc-400"
                  >
                    {t("leaveConfirmDescription")}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 px-5 py-4 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={onStay}
                className="border-white/10 bg-zinc-900/60 text-zinc-200 hover:bg-zinc-800"
              >
                {t("leaveConfirmStay")}
              </Button>
              <Button
                onClick={onLeave}
                className="bg-gradient-to-r from-cyan-600 to-violet-600 text-white hover:from-cyan-500 hover:to-violet-500"
              >
                {t("leaveConfirmLeave")}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
