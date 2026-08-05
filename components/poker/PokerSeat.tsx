"use client";

import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ChipStack, PlayingCard } from "./PlayingCard";

export type SeatView = {
  seatId: string;
  seatIndex: number;
  name: string;
  stack: number;
  isBot: boolean;
  holeCards?: string[];
  folded?: boolean;
  allIn?: boolean;
  streetCommitted?: number;
  sittingOut?: boolean;
};

/** 9 人橢圓座位角度（度）— 底部為自己視角偏好位 */
const ANGLE_BY_INDEX = [90, 50, 10, -30, -70, -110, -150, 170, 130];

export function seatStyle(seatIndex: number): CSSProperties {
  const angle = ((ANGLE_BY_INDEX[seatIndex % 9] ?? 90) * Math.PI) / 180;
  const rx = 42; // %
  const ry = 36;
  const x = 50 + rx * Math.cos(angle);
  const y = 50 + ry * Math.sin(angle);
  return {
    left: `${x}%`,
    top: `${y}%`,
    transform: "translate(-50%, -50%)",
  };
}

export function PokerSeat({
  seat,
  isDealer,
  isActing,
  isYou,
}: {
  seat: SeatView;
  isDealer: boolean;
  isActing: boolean;
  isYou: boolean;
}) {
  return (
    <motion.div
      layout
      className={cn(
        "absolute z-10 w-28 rounded-xl border px-2 py-1.5 text-center shadow-lg backdrop-blur-md",
        seat.folded
          ? "border-white/10 bg-black/40 opacity-50"
          : "border-cyan-400/30 bg-slate-950/70",
        isActing && "ring-2 ring-amber-400/80",
        isYou && "border-fuchsia-400/50",
      )}
      style={seatStyle(seat.seatIndex)}
      animate={isActing ? { scale: [1, 1.04, 1] } : { scale: 1 }}
      transition={{ repeat: isActing ? Infinity : 0, duration: 1.2 }}
    >
      <div className="flex items-center justify-center gap-1">
        {isDealer && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-black">
            D
          </span>
        )}
        <span className="truncate text-xs font-medium text-cyan-100">
          {seat.name}
          {seat.isBot ? " ·AI" : ""}
        </span>
      </div>
      <div className="mt-1 flex justify-center gap-0.5">
        {seat.holeCards?.length ? (
          seat.holeCards.map((c) => (
            <PlayingCard key={c + seat.seatId} code={c} small />
          ))
        ) : !seat.folded && !seat.sittingOut ? (
          <>
            <PlayingCard faceDown small />
            <PlayingCard faceDown small />
          </>
        ) : null}
      </div>
      <div className="mt-1 text-[11px] text-amber-200/90">
        {seat.stack.toLocaleString()}
        {seat.allIn ? " ALL-IN" : ""}
      </div>
      {(seat.streetCommitted ?? 0) > 0 && (
        <div className="mt-0.5 flex justify-center">
          <ChipStack amount={seat.streetCommitted!} />
        </div>
      )}
    </motion.div>
  );
}
