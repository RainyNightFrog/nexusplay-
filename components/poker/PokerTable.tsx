"use client";

import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { usePokerStore } from "@/stores/poker-store";
import { usePokerSocket } from "@/hooks/use-poker-socket";
import { PlayingCard, ChipStack } from "./PlayingCard";
import { PokerSeat } from "./PokerSeat";

export function PokerTable() {
  const { table, seatId, turnDeadlineMs, lastActionLog } = usePokerStore();
  const { sendAction, leaveTable } = usePokerSocket();
  const [raiseTo, setRaiseTo] = useState(0);

  const you = table?.seats.find((s) => s.seatId === seatId);
  const toCall = Math.max(
    0,
    (table?.currentBet ?? 0) - (you?.streetCommitted ?? 0),
  );
  const isYourTurn = table?.actingSeatId === seatId;
  const minRaise = table?.minRaiseTo ?? 0;

  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!turnDeadlineMs) return;
    const id = setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, [turnDeadlineMs]);

  const secondsLeft = useMemo(() => {
    if (!turnDeadlineMs) return null;
    void tick;
    return Math.max(0, Math.ceil((turnDeadlineMs - Date.now()) / 1000));
  }, [turnDeadlineMs, tick]);

  if (!table || !table.roomId) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-2xl border border-white/10 bg-slate-950/60 text-slate-400">
        選擇級別入桌後開始
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-cyan-100/80">
        <div>
          {table.code} · {table.tier} · SB/BB {table.smallBlind}/{table.bigBlind}{" "}
          · 手#{table.handNumber}
          {table.street ? ` · ${table.street}` : ""}
        </div>
        <button
          type="button"
          onClick={leaveTable}
          className="rounded-lg border border-rose-400/40 px-3 py-1 text-rose-200 hover:bg-rose-500/10"
        >
          離桌兌現
        </button>
      </div>

      <div className="relative mx-auto aspect-[16/10] w-full max-w-4xl overflow-hidden rounded-[2rem] border border-emerald-500/20 bg-[radial-gradient(ellipse_at_center,_#0b3d2e_0%,_#04140f_70%)] shadow-[inset_0_0_80px_rgba(0,0,0,0.55)]">
        {/* felt oval */}
        <div className="pointer-events-none absolute inset-[8%] rounded-[50%] border-2 border-emerald-400/20 bg-emerald-900/30" />

        {table.seats.map((s) => (
          <PokerSeat
            key={s.seatId}
            seat={s}
            isDealer={s.seatIndex === table.buttonSeatIndex}
            isActing={s.seatId === table.actingSeatId}
            isYou={s.seatId === seatId}
          />
        ))}

        <div className="absolute left-1/2 top-1/2 z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2">
          <div className="flex gap-1">
            {(table.board ?? []).map((c) => (
              <PlayingCard key={c} code={c} />
            ))}
          </div>
          <motion.div
            key={table.potTotal}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="rounded-full bg-black/50 px-3 py-1 text-sm font-semibold text-amber-200"
          >
            底池 {(table.potTotal ?? 0).toLocaleString()}
          </motion.div>
          <ChipStack amount={table.potTotal ?? 0} />
        </div>
      </div>

      {/* Action bar */}
      <div className="rounded-xl border border-white/10 bg-slate-950/80 p-3">
        <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
          <span>
            {isYourTurn
              ? `輪到你${secondsLeft != null ? ` · ${secondsLeft}s` : ""}`
              : "等待其他玩家…"}
          </span>
          <span>跟注 {toCall.toLocaleString()}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionBtn
            disabled={!isYourTurn}
            onClick={() => sendAction({ type: "fold" })}
            tone="danger"
          >
            蓋牌
          </ActionBtn>
          <ActionBtn
            disabled={!isYourTurn || toCall > 0}
            onClick={() => sendAction({ type: "check" })}
          >
            過牌
          </ActionBtn>
          <ActionBtn
            disabled={!isYourTurn || toCall <= 0}
            onClick={() => sendAction({ type: "call" })}
          >
            跟注
          </ActionBtn>
          <div className="flex items-center gap-1">
            <input
              type="number"
              className="w-28 rounded-lg border border-white/15 bg-black/40 px-2 py-2 text-sm text-white"
              value={raiseTo || minRaise}
              min={minRaise}
              onChange={(e) => setRaiseTo(Number(e.target.value))}
            />
            <ActionBtn
              disabled={!isYourTurn}
              onClick={() =>
                sendAction({
                  type: toCall > 0 ? "raise" : "bet",
                  amount: raiseTo || minRaise,
                })
              }
              tone="accent"
            >
              加注至
            </ActionBtn>
          </div>
          <ActionBtn
            disabled={!isYourTurn}
            onClick={() => sendAction({ type: "all-in" })}
            tone="accent"
          >
            All-in
          </ActionBtn>
        </div>
      </div>

      <div className="max-h-28 overflow-y-auto rounded-lg border border-white/5 bg-black/30 p-2 font-mono text-[11px] text-slate-400">
        {lastActionLog.length === 0
          ? "動作紀錄…"
          : lastActionLog.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  );
}

function ActionBtn({
  children,
  onClick,
  disabled,
  tone = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "danger" | "accent";
}) {
  const tones = {
    default: "border-cyan-400/30 text-cyan-100 hover:bg-cyan-500/10",
    danger: "border-rose-400/40 text-rose-200 hover:bg-rose-500/10",
    accent: "border-amber-400/40 text-amber-100 hover:bg-amber-500/10",
  };
  return (
    <motion.button
      type="button"
      whileTap={disabled ? undefined : { scale: 0.95 }}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-sm disabled:opacity-40 ${tones[tone]}`}
    >
      {children}
    </motion.button>
  );
}
