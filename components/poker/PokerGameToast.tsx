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
  success: "border-amber-300/55 shadow-[0_0_18px_rgba(251,191,36,0.28)]",
  info: "border-yellow-200/40 shadow-[0_0_14px_rgba(250,204,21,0.18)]",
  warn: "border-orange-300/50 shadow-[0_0_14px_rgba(251,146,60,0.22)]",
  error: "border-rose-400/45 shadow-[0_0_14px_rgba(251,113,133,0.2)]",
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
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="sticky top-2 z-50 mx-auto mb-1 w-full max-w-sm px-1"
        >
          <div
            className={cn(
              "relative rounded-xl border bg-[#1a140c]/95 px-3 py-2.5 backdrop-blur-md",
              TONE_RING[toast.tone ?? "success"],
            )}
          >
            <div className="relative flex items-center gap-2.5 text-left">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-amber-300/40 bg-amber-500/15 text-amber-200">
                {toast.pointsDelta != null && toast.pointsDelta > 0 ? (
                  <Coins className="size-3.5" />
                ) : (
                  <Sparkles className="size-3.5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-amber-50">
                  {toast.title}
                  {toast.pointsDelta != null && toast.pointsDelta !== 0 ? (
                    <span
                      className={cn(
                        "ml-1.5 font-bold tabular-nums",
                        toast.pointsDelta > 0
                          ? "text-yellow-200"
                          : "text-rose-200",
                      )}
                    >
                      {toast.pointsDelta > 0 ? "+" : ""}
                      {toast.pointsDelta.toLocaleString()}
                    </span>
                  ) : null}
                </p>
                {toast.detail ? (
                  <p className="mt-0.5 truncate text-xs text-amber-100/65">
                    {toast.detail}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onDismiss}
                className="shrink-0 rounded-md p-1 text-amber-200/50 hover:bg-amber-400/10 hover:text-amber-100"
                aria-label="關閉"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
