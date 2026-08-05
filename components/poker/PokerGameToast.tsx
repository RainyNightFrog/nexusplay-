"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Coins, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type PokerToastTone = "success" | "info" | "warn" | "error";

export type PokerToastPayload = {
  id: string;
  title: string;
  detail?: string;
  pointsDelta?: number;
  tone?: PokerToastTone;
};

const TONE_RING: Record<PokerToastTone, string> = {
  success:
    "border-amber-300/70 shadow-[0_0_40px_rgba(251,191,36,0.45),inset_0_0_24px_rgba(253,224,71,0.12)]",
  info: "border-yellow-200/50 shadow-[0_0_32px_rgba(250,204,21,0.28)]",
  warn: "border-orange-300/60 shadow-[0_0_32px_rgba(251,146,60,0.35)]",
  error: "border-rose-400/50 shadow-[0_0_28px_rgba(251,113,133,0.3)]",
};

export function PokerGameToast({
  toast,
  onDismiss,
}: {
  toast: PokerToastPayload | null;
  onDismiss: () => void;
}) {
  return (
    <AnimatePresence>
      {toast ? (
        <motion.div
          key={toast.id}
          role="status"
          initial={{ opacity: 0, y: -28, scale: 0.88 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.94 }}
          transition={{ type: "spring", stiffness: 380, damping: 22 }}
          className="sticky top-2 z-50 mx-auto mb-1 w-full max-w-md px-1"
        >
          <div
            className={cn(
              "relative overflow-hidden rounded-2xl border-2 bg-gradient-to-br from-[#3a2a0a]/95 via-[#1a1208]/96 to-[#0c0a06]/98 px-4 py-3.5 backdrop-blur-md",
              TONE_RING[toast.tone ?? "success"]
            )}
          >
            <div
              className="pointer-events-none absolute -left-8 -top-10 h-28 w-28 rounded-full bg-amber-400/25 blur-2xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-10 -right-6 h-24 w-24 rounded-full bg-yellow-300/20 blur-2xl"
              aria-hidden
            />
            <div className="relative flex items-start gap-3 text-left">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-amber-300/60 bg-gradient-to-br from-yellow-300 via-amber-400 to-amber-700 text-amber-950 shadow-[0_0_18px_rgba(251,191,36,0.55)]">
                {toast.pointsDelta != null && toast.pointsDelta > 0 ? (
                  <Coins className="size-5" />
                ) : (
                  <Sparkles className="size-5" />
                )}
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="font-serif text-base font-bold tracking-wide text-amber-50 drop-shadow-[0_0_8px_rgba(251,191,36,0.45)]">
                  {toast.title}
                </p>
                {toast.detail ? (
                  <p className="mt-0.5 text-sm text-amber-100/75">{toast.detail}</p>
                ) : null}
                {toast.pointsDelta != null && toast.pointsDelta !== 0 ? (
                  <motion.p
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 420,
                      damping: 16,
                      delay: 0.08,
                    }}
                    className={cn(
                      "mt-1.5 inline-flex items-center gap-1 rounded-full border px-3 py-1 text-base font-black tabular-nums",
                      toast.pointsDelta > 0
                        ? "border-amber-300/60 bg-amber-400/20 text-yellow-100 shadow-[0_0_14px_rgba(250,204,21,0.35)]"
                        : "border-rose-300/40 bg-rose-500/10 text-rose-200"
                    )}
                  >
                    {toast.pointsDelta > 0 ? "獲得 +" : ""}
                    {toast.pointsDelta.toLocaleString()} 積分
                  </motion.p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onDismiss}
                className="rounded-lg p-1 text-amber-200/60 hover:bg-amber-400/10 hover:text-amber-100"
                aria-label="關閉"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
