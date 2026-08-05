"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const RANK_LABEL: Record<string, string> = {
  T: "10",
  J: "J",
  Q: "Q",
  K: "K",
  A: "A",
};

const SUIT_GLYPH: Record<string, string> = {
  h: "♥",
  d: "♦",
  c: "♣",
  s: "♠",
};

const SUIT_COLOR: Record<string, string> = {
  h: "text-rose-400",
  d: "text-sky-400",
  c: "text-emerald-400",
  s: "text-violet-300",
};

export function PlayingCard({
  code,
  faceDown,
  small,
}: {
  code?: string;
  faceDown?: boolean;
  small?: boolean;
}) {
  if (faceDown || !code) {
    return (
      <div
        className={cn(
          "rounded-md border border-cyan-500/40 bg-gradient-to-br from-slate-800 to-slate-950 shadow-lg",
          small ? "h-10 w-7" : "h-14 w-10",
        )}
        aria-label="牌背"
      >
        <div className="flex h-full items-center justify-center text-[10px] text-cyan-500/50">
          RNF
        </div>
      </div>
    );
  }

  const rank = code[0]!;
  const suit = code[1]!;
  return (
    <motion.div
      initial={{ rotateY: 90, opacity: 0 }}
      animate={{ rotateY: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className={cn(
        "rounded-md border border-white/20 bg-slate-950/90 px-1 py-0.5 shadow-md backdrop-blur",
        small ? "h-10 w-7 text-[10px]" : "h-14 w-10 text-xs",
        SUIT_COLOR[suit],
      )}
    >
      <div className="font-semibold leading-tight">
        {RANK_LABEL[rank] ?? rank}
      </div>
      <div className={cn(small ? "text-sm" : "text-base")}>
        {SUIT_GLYPH[suit]}
      </div>
    </motion.div>
  );
}

export function ChipStack({ amount }: { amount: number }) {
  if (amount <= 0) return null;
  const layers = Math.min(6, Math.max(1, Math.ceil(Math.log10(amount + 1))));
  return (
    <div className="relative flex h-8 w-10 items-end justify-center" title={String(amount)}>
      {Array.from({ length: layers }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: i * 0.04 }}
          className="absolute h-2.5 w-8 rounded-full border border-amber-300/50 bg-gradient-to-r from-amber-600 to-yellow-400"
          style={{ bottom: i * 3 }}
        />
      ))}
      <span className="relative z-10 text-[10px] font-bold text-amber-100 drop-shadow">
        {amount >= 1000 ? `${(amount / 1000).toFixed(1)}k` : amount}
      </span>
    </div>
  );
}
