"use client";

import type { CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { PlayingCard } from "./PlayingCard";

export type SeatView = {
  seatId: string;
  seatIndex: number;
  name: string;
  stack: number;
  isBot: boolean;
  avatarUrl?: string | null;
  holeCards?: string[];
  folded?: boolean;
  allIn?: boolean;
  streetCommitted?: number;
  sittingOut?: boolean;
};

/**
 * 9 人橢圓角度（度）：index 0 = 自己（底部）。
 * index 遞增往「左」走 = 牌桌順時針（標準行動方向）。
 */
const ANGLE_BY_INDEX = [90, 132, 172, -148, -108, -68, -28, 12, 52];

export function visualAngleIndex(
  seatIndex: number,
  yourSeatIndex: number,
  seats = 9,
): number {
  return ((seatIndex - yourSeatIndex) % seats + seats) % seats;
}

export function seatStyle(angleIndex: number, isYou = false): CSSProperties {
  const angle = ((ANGLE_BY_INDEX[angleIndex % 9] ?? 90) * Math.PI) / 180;
  /* 座位靠外緣，下注另算較內圈位置 */
  const rx = isYou ? 44 : 45;
  const ry = isYou ? 41 : 39;
  const x = 50 + rx * Math.cos(angle);
  const y = 50 + ry * Math.sin(angle);
  return {
    left: `${x}%`,
    top: `${y}%`,
    transform: "translate(-50%, -50%)",
  };
}

/** 下注籌碼獨立定位：比座位更靠桌心，不進座位框 */
export function betChipStyle(angleIndex: number): CSSProperties {
  const angle = ((ANGLE_BY_INDEX[angleIndex % 9] ?? 90) * Math.PI) / 180;
  const rx = 27;
  const ry = 24;
  return {
    left: `${50 + rx * Math.cos(angle)}%`,
    top: `${50 + ry * Math.sin(angle)}%`,
    transform: "translate(-50%, -50%)",
  };
}

export function formatBetAmount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return String(n);
}

export function PokerSeat({
  seat,
  angleIndex,
  isDealer,
  isActing,
  isYou,
  blindRole,
  fxKind,
}: {
  seat: SeatView;
  angleIndex: number;
  isDealer: boolean;
  isActing: boolean;
  isYou: boolean;
  blindRole?: "SB" | "BB" | null;
  /** 當前特效（全下／獲勝） */
  fxKind?: "allin" | "win" | null;
}) {
  const showFace =
    isYou &&
    !!seat.holeCards?.length &&
    !seat.folded &&
    !seat.sittingOut;

  return (
    <div
      className={cn("absolute", isYou ? "z-30" : "z-10")}
      style={seatStyle(angleIndex, isYou)}
    >
      <div
        className={cn(
          "relative rounded-xl border text-center shadow-lg backdrop-blur-md",
          isYou
            ? "w-[6.25rem] px-1.5 py-1.5 sm:w-[6.75rem]"
            : "w-[5.1rem] px-1.5 py-1.5 sm:w-[5.75rem]",
          seat.folded
            ? "border-white/10 bg-black/45 opacity-40"
            : "border-amber-400/45 bg-gradient-to-b from-amber-950/90 to-black/80",
          isYou && "border-yellow-300/95 shadow-[0_0_24px_rgba(250,204,21,0.35)]",
          isActing &&
            "border-yellow-300 ring-2 ring-yellow-300/80 shadow-[0_0_0_3px_rgba(250,204,21,0.25),0_0_22px_rgba(250,204,21,0.45)]",
          seat.allIn &&
            !seat.folded &&
            "ring-2 ring-rose-400/70 shadow-[0_0_18px_rgba(251,113,133,0.45)]",
          fxKind === "win" &&
            "ring-2 ring-yellow-200 shadow-[0_0_28px_rgba(250,204,21,0.75)]",
        )}
      >
        <AnimatePresence>
          {fxKind === "allin" && (
            <motion.div
              key="allin"
              initial={{ opacity: 0, scale: 0.6, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="pointer-events-none absolute -top-3 left-1/2 z-50 -translate-x-1/2"
            >
              <span className="whitespace-nowrap rounded-full border border-rose-300/80 bg-gradient-to-r from-rose-600 to-orange-500 px-2 py-0.5 text-[10px] font-black tracking-wide text-white shadow-[0_0_16px_rgba(244,63,94,0.8)]">
                ALL-IN
              </span>
            </motion.div>
          )}
          {fxKind === "win" && (
            <motion.div
              key="win"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: [1, 1.12, 1] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45 }}
              className="pointer-events-none absolute -top-3 left-1/2 z-50 -translate-x-1/2"
            >
              <span className="whitespace-nowrap rounded-full border border-yellow-200/90 bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 px-2 py-0.5 text-[10px] font-black text-amber-950 shadow-[0_0_20px_rgba(250,204,21,0.9)]">
                獲勝
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 粒子光暈 */}
        {fxKind === "win" && (
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-xl bg-yellow-300/20"
            animate={{ opacity: [0.15, 0.45, 0.15] }}
            transition={{ duration: 0.7, repeat: 3 }}
          />
        )}
        {fxKind === "allin" && (
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-xl bg-rose-500/25"
            animate={{ opacity: [0.2, 0.55, 0.2] }}
            transition={{ duration: 0.45, repeat: 4 }}
          />
        )}

        <div className="relative flex items-center justify-center gap-0.5">
          {isDealer && (
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-yellow-200 to-amber-500 text-[10px] font-black text-amber-950"
              title="莊家"
            >
              D
            </span>
          )}
          {blindRole === "SB" && (
            <span
              className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-sky-500 px-1 text-[9px] font-black text-white shadow"
              title="小盲"
            >
              小
            </span>
          )}
          {blindRole === "BB" && (
            <span
              className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white shadow"
              title="大盲"
            >
              大
            </span>
          )}
          {seat.avatarUrl && !isYou ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={seat.avatarUrl}
              alt=""
              className="h-5 w-5 shrink-0 rounded-full border border-amber-300/50 object-cover"
            />
          ) : null}
          <span
            className={cn(
              "truncate font-semibold text-amber-50",
              "max-w-[3.8rem] text-[11px] sm:text-xs",
            )}
          >
            {isYou ? "你" : seat.name}
          </span>
        </div>

        {!seat.folded && !seat.sittingOut && (
          <div className="relative mt-1 flex justify-center gap-0.5">
            {showFace ? (
              seat.holeCards!.map((c) => (
                <PlayingCard key={c} code={c} size={isYou ? "sm" : "xs"} />
              ))
            ) : (
              <>
                <PlayingCard faceDown size="xs" />
                <PlayingCard faceDown size="xs" />
              </>
            )}
          </div>
        )}

        <div className="relative mt-1 text-[11px] font-bold tabular-nums text-amber-100">
          {seat.stack.toLocaleString()}
          {seat.allIn ? (
            <span className="ml-0.5 text-[9px] font-black text-rose-300">
              ALL-IN
            </span>
          ) : null}
        </div>
        {seat.sittingOut ? (
          <div className="relative mt-0.5 text-[9px] font-bold tracking-wide text-sky-300">
            休息中
          </div>
        ) : null}
        {isActing && (
          <div className="relative mt-0.5 text-[9px] font-bold tracking-wide text-yellow-200">
            行動中
          </div>
        )}
      </div>
    </div>
  );
}

export function EmptyPokerSeat({ angleIndex }: { angleIndex: number }) {
  return (
    <div className="absolute z-[5]" style={seatStyle(angleIndex)}>
      <div className="flex h-[4.25rem] w-[5.1rem] items-center justify-center rounded-xl border border-dashed border-amber-700/35 bg-black/25 text-[10px] text-amber-200/30 sm:w-[5.75rem]">
        空位
      </div>
    </div>
  );
}
