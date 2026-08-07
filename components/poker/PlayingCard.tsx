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

/** 紅心／方塊：高對比紅；梅花／黑桃：純黑（避免低對比霓虹色） */
const SUIT_FACE: Record<string, string> = {
  h: "text-[#c41e3a]",
  d: "text-[#c41e3a]",
  c: "text-[#111827]",
  s: "text-[#111827]",
};

const SIZE = {
  xs: "h-10 w-[1.7rem]",
  sm: "h-[3.25rem] w-[2.35rem]",
  md: "h-[4.75rem] w-[3.35rem]",
  lg: "h-[6.5rem] w-[4.6rem]",
  xl: "h-[7.75rem] w-[5.5rem]",
} as const;

const RANK_SIZE: Record<keyof typeof SIZE, string> = {
  xs: "text-[10px]",
  sm: "text-xs",
  md: "text-base",
  lg: "text-2xl",
  xl: "text-3xl",
};

const SUIT_SIZE: Record<keyof typeof SIZE, string> = {
  xs: "text-sm",
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-4xl",
  xl: "text-5xl",
};

const CORNER_SUIT: Record<keyof typeof SIZE, string> = {
  xs: "text-[8px]",
  sm: "text-[10px]",
  md: "text-xs",
  lg: "text-sm",
  xl: "text-base",
};

type CardSize = keyof typeof SIZE;

export function PlayingCard({
  code,
  faceDown,
  size = "md",
  deal = false,
}: {
  code?: string;
  faceDown?: boolean;
  size?: CardSize;
  /** 僅發牌時翻轉動畫，狀態更新不再重播 */
  deal?: boolean;
}) {
  const box = SIZE[size];

  if (faceDown || !code) {
    return (
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-md",
          "border-2 border-amber-300/70 bg-gradient-to-br from-[#1e3a5f] via-[#0f2744] to-[#071525]",
          "shadow-[0_2px_8px_rgba(0,0,0,0.55),inset_0_0_0_1px_rgba(251,191,36,0.25)]",
          box,
        )}
        aria-label="牌背"
      >
        <div
          className="pointer-events-none absolute inset-[3px] rounded-[4px] border border-amber-400/35"
          aria-hidden
        />
        <span
          className={cn(
            "relative z-10 font-black tracking-tight text-amber-200",
            size === "xs" || size === "sm" ? "text-[8px]" : "text-[11px]",
          )}
        >
          RNF
        </span>
      </div>
    );
  }

  const rank = code[0]!;
  const suit = code[1]!;
  const rankText = RANK_LABEL[rank] ?? rank;
  const suitGlyph = SUIT_GLYPH[suit] ?? suit;
  const suitColor = SUIT_FACE[suit] ?? "text-zinc-900";

  const inner = (
    <div
      className={cn(
        "relative flex shrink-0 flex-col overflow-hidden rounded-md",
        "border-[1.5px] border-zinc-800/90 bg-[#f8f6f1]",
        "shadow-[0_2px_10px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.35)_inset]",
        box,
        suitColor,
      )}
      aria-label={`${rankText}${suitGlyph}`}
    >
      {/* 左上角 */}
      <div
        className={cn(
          "absolute left-0.5 top-0.5 flex flex-col items-center leading-none",
          size === "lg" || size === "xl" ? "left-1 top-1" : null,
        )}
      >
        <span className={cn("font-black text-current", RANK_SIZE[size])}>
          {rankText}
        </span>
        <span className={cn("leading-none", CORNER_SUIT[size])}>{suitGlyph}</span>
      </div>

      {/* 中央大花色 */}
      <div className="flex flex-1 items-center justify-center">
        <span
          className={cn(
            "font-semibold leading-none drop-shadow-sm",
            SUIT_SIZE[size],
          )}
        >
          {suitGlyph}
        </span>
      </div>

      {/* 右下角倒置 */}
      <div
        className={cn(
          "absolute bottom-0.5 right-0.5 flex rotate-180 flex-col items-center leading-none",
          size === "lg" || size === "xl" ? "bottom-1 right-1" : null,
        )}
      >
        <span className={cn("font-black text-current", RANK_SIZE[size])}>
          {rankText}
        </span>
        <span className={cn("leading-none", CORNER_SUIT[size])}>{suitGlyph}</span>
      </div>
    </div>
  );

  if (!deal) return inner;

  return (
    <motion.div
      initial={{ rotateY: 88, opacity: 0.4 }}
      animate={{ rotateY: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      style={{ transformStyle: "preserve-3d" }}
    >
      {inner}
    </motion.div>
  );
}

export function ChipStack({
  amount,
  hideAmount = false,
}: {
  amount: number;
  /** 與「底池 xxx」並列時隱藏數字，只留籌碼堆視覺 */
  hideAmount?: boolean;
}) {
  if (amount <= 0) return null;
  const layers = Math.min(5, Math.max(1, Math.ceil(Math.log10(amount + 1))));
  return (
    <div
      className="relative flex h-7 w-11 items-end justify-center"
      title={amount.toLocaleString()}
    >
      {Array.from({ length: layers }).map((_, i) => (
        <div
          key={i}
          className="absolute h-2 w-7 rounded-full border border-amber-200/60 bg-gradient-to-r from-amber-600 to-yellow-400"
          style={{ bottom: i * 2.5 }}
        />
      ))}
      {!hideAmount ? (
        <span className="relative z-10 text-[10px] font-bold text-amber-50 drop-shadow-md">
          {amount >= 1000
            ? `${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}k`
            : amount}
        </span>
      ) : null}
    </div>
  );
}
