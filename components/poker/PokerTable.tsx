"use client";

import { useEffect, useMemo, useState } from "react";
import { Coins } from "lucide-react";
import { usePokerStore } from "@/stores/poker-store";
import { usePokerSocket } from "@/hooks/use-poker-socket";
import { usePokerLeaveGuard } from "./PokerLeaveConfirm";
import { PlayingCard, ChipStack } from "./PlayingCard";
import {
  PokerSeat,
  EmptyPokerSeat,
  visualAngleIndex,
  betChipStyle,
  formatBetAmount,
} from "./PokerSeat";
import { PokerHandHistory } from "./PokerHandHistory";
import { PokerHowToGuide } from "./PokerHowToGuide";
import { describeLiveHandZh } from "@/lib/poker/hand-hint";
import { cn } from "@/lib/utils";
import { MAX_SEATS } from "@/lib/poker/types";

const STREET_ZH: Record<string, string> = {
  waiting: "等待",
  preflop: "翻牌前",
  flop: "翻牌",
  turn: "轉牌",
  river: "河牌",
  showdown: "攤牌",
  complete: "結束",
  PREFLOP: "翻牌前",
  FLOP: "翻牌",
  TURN: "轉牌",
  RIVER: "河牌",
  SHOWDOWN: "攤牌",
};

export function PokerTable() {
  const {
    table,
    seatId,
    turnDeadlineMs,
    error,
    leaveNotice,
    tableFx,
    clearTableFx,
    pointsBalance,
  } = usePokerStore();
  const { sendAction, topUp, resumePlay } = usePokerSocket();
  const { requestCashOutLeave } = usePokerLeaveGuard();
  const [raiseTo, setRaiseTo] = useState(0);
  const [dealtBoard, setDealtBoard] = useState<Set<string>>(new Set());
  const [fxTick, setFxTick] = useState(0);
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState(0);
  const [topUpBusy, setTopUpBusy] = useState(false);

  const you = table?.seats.find((s) => s.seatId === seatId);
  const isResting = Boolean(you?.sittingOut && (you?.restUntilMs ?? 0) > 0);
  const yourSeatIndex = you?.seatIndex ?? 0;
  const toCall = Math.max(
    0,
    (table?.currentBet ?? 0) - (you?.streetCommitted ?? 0),
  );
  const isYourTurn = table?.actingSeatId === seatId;
  const minRaise = table?.minRaiseTo ?? table?.bigBlind ?? 0;
  const pot = table?.potTotal ?? 0;
  const stack = you?.stack ?? 0;
  const canCheck = isYourTurn && toCall <= 0;
  const canCall = isYourTurn && toCall > 0 && toCall < stack;
  const callAllIn = isYourTurn && toCall > 0 && toCall >= stack;
  const maxRaiseTo = stack + (you?.streetCommitted ?? 0);

  const streetKey = (table?.street ?? "").toLowerCase();
  const betweenHands =
    !streetKey || streetKey === "waiting" || streetKey === "complete";

  const topUpRoom = Math.max(0, (table?.maxBuyIn ?? 0) - stack);
  const canTopUp =
    betweenHands &&
    topUpRoom >= (table?.bigBlind ?? 1) &&
    (pointsBalance == null || pointsBalance >= (table?.bigBlind ?? 1));

  const handHint = useMemo(
    () =>
      you && !you.folded
        ? describeLiveHandZh(you.holeCards, table?.board)
        : null,
    [you, you?.holeCards, you?.folded, table?.board],
  );

  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!turnDeadlineMs && !isResting) return;
    const id = setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, [turnDeadlineMs, isResting]);

  const restSecondsLeft = useMemo(() => {
    if (!isResting || !you?.restUntilMs) return null;
    void tick;
    return Math.max(0, Math.ceil((you.restUntilMs - Date.now()) / 1000));
  }, [isResting, you?.restUntilMs, tick]);

  useEffect(() => {
    setRaiseTo(minRaise);
  }, [minRaise, table?.handNumber, table?.street]);

  /* 新手牌重置發牌動畫標記 */
  useEffect(() => {
    setDealtBoard(new Set());
  }, [table?.handNumber]);

  useEffect(() => {
    const board = table?.board ?? [];
    if (board.length === 0) return;
    const t = window.setTimeout(() => {
      setDealtBoard(new Set(board));
    }, 420);
    return () => window.clearTimeout(t);
  }, [table?.board]);

  /* 特效到期清除 */
  useEffect(() => {
    if (!tableFx) return;
    const left = tableFx.until - Date.now();
    if (left <= 0) {
      clearTableFx();
      return;
    }
    const id = window.setTimeout(() => clearTableFx(), left);
    const pulse = window.setInterval(() => setFxTick((n) => n + 1), 200);
    return () => {
      window.clearTimeout(id);
      window.clearInterval(pulse);
    };
  }, [tableFx, clearTableFx]);

  const secondsLeft = useMemo(() => {
    if (!turnDeadlineMs) return null;
    void tick;
    return Math.max(0, Math.ceil((turnDeadlineMs - Date.now()) / 1000));
  }, [turnDeadlineMs, tick]);

  const activeFx = useMemo(() => {
    void fxTick;
    if (!tableFx || tableFx.until <= Date.now()) return null;
    return tableFx;
  }, [tableFx, fxTick]);

  if (!table || !table.roomId) {
    return (
      <div className="mx-auto flex h-[280px] w-full items-center justify-center rounded-2xl border-2 border-amber-500/25 bg-gradient-to-b from-amber-950/40 to-black/60 text-amber-200/50">
        正在入桌…
      </div>
    );
  }

  const streetLabel = table.street
    ? (STREET_ZH[table.street] ?? table.street)
    : "等待開局";

  const bb = table?.bigBlind ?? 1;
  const raiseStep = Math.max(1, bb);
  const currentRaise = raiseTo || minRaise;

  function setRaisePreset(value: number) {
    const capped = Math.max(minRaise, Math.min(maxRaiseTo, Math.floor(value)));
    setRaiseTo(capped);
  }

  function nudgeRaise(dir: 1 | -1) {
    setRaisePreset(currentRaise + dir * raiseStep);
  }

  /** 1／2／3 倍大盲（加注目標），不足最小加注則抬到最小 */
  function setRaiseByBbMult(mult: 1 | 2 | 3) {
    setRaisePreset(Math.max(minRaise, bb * mult));
  }

  return (
    <div className="mx-auto flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="rounded-full border border-amber-400/35 bg-amber-950/60 px-3 py-1.5 text-[11px] text-amber-100/85 sm:text-xs">
          {table.tier} · 小盲 {table.smallBlind}／大盲 {table.bigBlind} · 手#
          {table.handNumber} · {streetLabel}
        </div>
        <div className="flex items-center gap-2">
          <PokerHowToGuide variant="icon" />
          <button
            type="button"
            onClick={() => {
              const bb = table.bigBlind;
              const room = Math.max(0, table.maxBuyIn - stack);
              const bal = pointsBalance ?? room;
              const suggested = Math.min(
                room,
                bal,
                Math.max(bb, Math.floor((table.minBuyIn + table.maxBuyIn) / 4)),
              );
              setTopUpAmount(suggested);
              setShowTopUp((v) => !v);
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-amber-400/50 bg-amber-950/50 px-3 py-1.5 text-xs font-semibold text-amber-50 hover:bg-amber-500/20"
          >
            <Coins className="size-3.5 text-yellow-300" />
            加買入
          </button>
          <button
            type="button"
            onClick={() => requestCashOutLeave()}
            className="rounded-lg border border-rose-400/45 bg-rose-950/40 px-3 py-1.5 text-xs font-semibold text-rose-100 hover:bg-rose-500/20"
          >
            離桌兌現
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-400/40 bg-rose-950/50 px-3 py-2 text-center text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      {leaveNotice ? (
        <div className="rounded-xl border border-amber-400/40 bg-amber-950/50 px-3 py-2 text-center text-sm text-amber-50">
          {leaveNotice}
        </div>
      ) : null}

      {isResting ? (
        <div className="rounded-2xl border-2 border-sky-400/45 bg-gradient-to-b from-sky-950/80 to-black/70 p-4 text-center shadow-[0_0_28px_rgba(56,189,248,0.2)]">
          <p className="text-sm font-bold text-sky-100">休息中（防掛機）</p>
          <p className="mt-1 text-xs leading-relaxed text-sky-100/70">
            連續兩次未行動，暫不發牌。請在時限內點「回來了」，否則會自動離桌並兌現剩餘籌碼，避免繼續損失。
          </p>
          <p className="mt-2 text-lg font-black tabular-nums text-yellow-200">
            剩餘{" "}
            {restSecondsLeft != null
              ? `${Math.floor(restSecondsLeft / 60)}:${String(
                  restSecondsLeft % 60,
                ).padStart(2, "0")}`
              : "--:--"}
          </p>
          <button
            type="button"
            onClick={() => resumePlay()}
            className="mt-3 rounded-xl border border-yellow-200/50 bg-gradient-to-r from-yellow-300 via-amber-400 to-amber-600 px-6 py-2.5 text-sm font-black text-amber-950"
          >
            回來了
          </button>
        </div>
      ) : null}

      {showTopUp ? (
        <div className="rounded-2xl border-2 border-yellow-300/40 bg-gradient-to-b from-amber-950/80 to-black/70 p-4">
          <div className="mb-2 text-center text-sm font-bold text-yellow-100">
            加買入更多籌碼
          </div>
          <p className="mb-3 text-center text-[11px] text-amber-200/55">
            從積分庫轉入桌上 · 本手結束後才可加買 · 上限{" "}
            {table.maxBuyIn.toLocaleString()}（還可加{" "}
            {topUpRoom.toLocaleString()}）
          </p>
          <div className="flex flex-wrap items-end justify-center gap-3">
            <label className="text-left text-xs text-amber-100/80">
              金額
              <input
                type="number"
                className="mt-1 block w-36 rounded-xl border border-amber-400/40 bg-black/50 px-3 py-2 text-center font-semibold text-yellow-100 outline-none focus:border-amber-300"
                min={table.bigBlind}
                max={Math.min(topUpRoom, pointsBalance ?? topUpRoom)}
                value={topUpAmount || ""}
                onChange={(e) => setTopUpAmount(Number(e.target.value))}
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!canTopUp || topUpBusy}
                onClick={() => {
                  const amt = Math.floor(topUpAmount);
                  if (!canTopUp) {
                    usePokerStore
                      .getState()
                      .setError(
                        betweenHands
                          ? "無法加買入（積分不足或已達上限）"
                          : "手牌進行中不可加買入，請等本手結束",
                      );
                    return;
                  }
                  setTopUpBusy(true);
                  topUp(amt);
                  window.setTimeout(() => {
                    setTopUpBusy(false);
                    setShowTopUp(false);
                    void fetch("/api/poker/economy/balance")
                      .then((r) => (r.ok ? r.json() : null))
                      .then((data) => {
                        if (data && typeof data.pointsBalance === "number") {
                          usePokerStore
                            .getState()
                            .setMeta({ pointsBalance: data.pointsBalance });
                        }
                      })
                      .catch(() => {});
                  }, 1200);
                }}
                className="rounded-xl border border-yellow-200/50 bg-gradient-to-r from-yellow-300 via-amber-400 to-amber-600 px-5 py-2.5 text-sm font-black text-amber-950 disabled:opacity-40"
              >
                {topUpBusy ? "處理中…" : "確認加買"}
              </button>
              <button
                type="button"
                onClick={() => setShowTopUp(false)}
                className="rounded-xl border border-zinc-500/40 bg-zinc-950/50 px-4 py-2.5 text-sm text-zinc-200"
              >
                取消
              </button>
            </div>
          </div>
          {!betweenHands ? (
            <p className="mt-2 text-center text-[11px] text-orange-200/70">
              目前手牌進行中，請等本手結束後再加買入
            </p>
          ) : null}
        </div>
      ) : null}

      {/* 牌桌 */}
      <div
        className={cn(
          "relative mx-auto w-full overflow-visible rounded-[1.75rem]",
          "border-[3px] border-amber-400/55",
          "bg-[radial-gradient(ellipse_at_center,_#14532d_0%,_#052e16_42%,_#02140c_78%)]",
          "shadow-[0_0_48px_rgba(251,191,36,0.2),inset_0_0_70px_rgba(0,0,0,0.55)]",
          "aspect-[5/4] max-h-[min(58dvh,520px)] min-h-[340px] sm:aspect-[16/11] sm:max-h-[min(62dvh,560px)]",
        )}
      >
        <div
          className="pointer-events-none absolute inset-[4%] rounded-[50%] border-2 border-amber-400/30"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-[7%] rounded-[50%] border border-emerald-400/20 bg-emerald-900/20"
          aria-hidden
        />

        {Array.from({ length: MAX_SEATS }, (_, seatIndex) => {
          const s = table.seats.find((x) => x.seatIndex === seatIndex);
          const angleIndex = visualAngleIndex(seatIndex, yourSeatIndex);
          if (!s) {
            return <EmptyPokerSeat key={`empty-${seatIndex}`} angleIndex={angleIndex} />;
          }
          const fxKind =
            activeFx?.seatIds.includes(s.seatId) ? activeFx.kind : null;
          return (
            <PokerSeat
              key={s.seatId}
              seat={s}
              angleIndex={angleIndex}
              isDealer={s.seatIndex === table.buttonSeatIndex}
              isActing={s.seatId === table.actingSeatId}
              isYou={s.seatId === seatId}
              blindRole={
                s.seatIndex === table.sbSeatIndex
                  ? "SB"
                  : s.seatIndex === table.bbSeatIndex
                    ? "BB"
                    : null
              }
              fxKind={fxKind}
            />
          );
        })}

        {/* 下注籌碼：獨立於座位框，靠桌心一圈 */}
        {table.seats.map((s) => {
          const bet = s.streetCommitted ?? 0;
          if (bet <= 0 || s.folded) return null;
          const angleIndex = visualAngleIndex(s.seatIndex, yourSeatIndex);
          return (
            <div
              key={`bet-${s.seatId}`}
              className="pointer-events-none absolute z-40"
              style={betChipStyle(angleIndex)}
            >
              <div className="flex flex-col items-center gap-1">
                <div className="h-3.5 w-3.5 rounded-full border-2 border-amber-100/90 bg-gradient-to-br from-yellow-300 to-amber-600 shadow-[0_0_12px_rgba(251,191,36,0.85)]" />
                <div className="rounded-full border-2 border-yellow-300/80 bg-black/90 px-2.5 py-1 text-sm font-black tabular-nums tracking-wide text-yellow-50 shadow-[0_0_14px_rgba(250,204,21,0.45)] backdrop-blur-sm sm:text-base">
                  {formatBetAmount(bet)}
                </div>
              </div>
            </div>
          );
        })}

        <div className="absolute left-1/2 top-[44%] z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5">
          <div className="flex min-h-[3.75rem] items-center justify-center gap-1.5">
            {(table.board ?? []).length > 0 ? (
              (table.board ?? []).map((c) => (
                <PlayingCard
                  key={`${table.handNumber}-${c}`}
                  code={c}
                  size="md"
                  deal={!dealtBoard.has(c)}
                />
              ))
            ) : (
              <span className="text-xs text-emerald-200/35">等待公牌</span>
            )}
          </div>
          <div className="rounded-full border border-amber-300/55 bg-gradient-to-r from-amber-950/90 via-yellow-900/75 to-amber-950/90 px-4 py-1.5 text-base font-black tabular-nums text-yellow-100 shadow-[0_0_18px_rgba(251,191,36,0.35)] sm:text-lg">
            底池 {pot.toLocaleString()}
          </div>
          <ChipStack amount={pot} />
          {activeFx?.kind === "win" && activeFx.summary && (
            <div className="mt-1 max-w-[min(92%,20rem)] rounded-xl border-2 border-yellow-300/80 bg-black/90 px-3 py-2 text-center text-sm font-black leading-snug text-yellow-50 shadow-[0_0_20px_rgba(250,204,21,0.55)] sm:text-base">
              {activeFx.summary}
            </div>
          )}
        </div>

        {/* 全場獲勝閃光 */}
        {activeFx?.kind === "win" && (
          <div
            className="pointer-events-none absolute inset-0 z-[15] animate-pulse rounded-[1.75rem] bg-[radial-gradient(circle_at_center,rgba(250,204,21,0.22),transparent_55%)]"
            aria-hidden
          />
        )}
      </div>

      {/* 操作列：兩排，更清晰 */}
      <div
        className={cn(
          "rounded-2xl border-2 p-3 sm:p-4",
          isResting
            ? "border-sky-500/30 bg-black/50 opacity-50"
            : isYourTurn
              ? "border-yellow-300/55 bg-gradient-to-b from-amber-900/45 to-black/75"
              : "border-amber-500/25 bg-gradient-to-b from-amber-950/40 to-black/70 opacity-90",
        )}
      >
        {isResting ? (
          <p className="text-center text-xs font-semibold text-sky-200/80">
            休息中，操作已暫停
          </p>
        ) : (
          <>
        {isYourTurn && (
          <p className="mb-2 text-center text-xs font-semibold text-yellow-200">
            輪到你了
            {secondsLeft != null ? ` · 剩餘 ${secondsLeft} 秒` : ""}
            {handHint ? ` · ${handHint}` : ""}
          </p>
        )}
        {!isYourTurn && handHint ? (
          <p className="mb-2 text-center text-xs font-semibold text-sky-200/90">
            目前牌型 · {handHint}
          </p>
        ) : null}
        <div className="mb-3 flex justify-center gap-2">
          <ActionBtn
            disabled={!isYourTurn}
            onClick={() => sendAction({ type: "fold" })}
            tone="danger"
            wide
          >
            蓋牌
          </ActionBtn>
          {canCheck ? (
            <ActionBtn
              disabled={!isYourTurn}
              onClick={() => sendAction({ type: "check" })}
              wide
            >
              過牌
            </ActionBtn>
          ) : (
            <ActionBtn
              disabled={!canCall && !callAllIn}
              onClick={() =>
                sendAction(callAllIn ? { type: "all-in" } : { type: "call" })
              }
              tone="accent"
              wide
            >
              {callAllIn
                ? `全下跟注 ${stack.toLocaleString()}`
                : `跟注 ${toCall.toLocaleString()}`}
            </ActionBtn>
          )}
          <ActionBtn
            disabled={!isYourTurn || stack <= 0}
            onClick={() => sendAction({ type: "all-in" })}
            tone="accent"
            wide
          >
            全下
          </ActionBtn>
        </div>

        <div className="flex flex-col gap-2.5 border-t border-amber-700/30 pt-3">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="w-full text-center text-[10px] text-amber-200/50 sm:w-auto sm:text-xs">
              加注／下注
            </span>
            <PresetBtn
              disabled={!isYourTurn || stack <= 0}
              onClick={() => setRaisePreset(minRaise)}
            >
              最小
            </PresetBtn>
            <PresetBtn
              disabled={!isYourTurn || stack <= 0}
              onClick={() => setRaisePreset(Math.floor(pot / 2) || minRaise)}
            >
              ½池
            </PresetBtn>
            <PresetBtn
              disabled={!isYourTurn || stack <= 0}
              onClick={() => setRaisePreset(pot || minRaise)}
            >
              滿池
            </PresetBtn>
            <PresetBtn
              disabled={!isYourTurn || stack <= 0}
              onClick={() => setRaiseByBbMult(1)}
            >
              1倍
            </PresetBtn>
            <PresetBtn
              disabled={!isYourTurn || stack <= 0}
              onClick={() => setRaiseByBbMult(2)}
            >
              2倍
            </PresetBtn>
            <PresetBtn
              disabled={!isYourTurn || stack <= 0}
              onClick={() => setRaiseByBbMult(3)}
            >
              3倍
            </PresetBtn>
          </div>

          <div className="flex items-center justify-center gap-2">
            <StepBtn
              disabled={!isYourTurn || stack <= 0 || currentRaise <= minRaise}
              onClick={() => nudgeRaise(-1)}
              label="減少金額"
            >
              −
            </StepBtn>
            <input
              type="number"
              className="w-28 rounded-xl border border-amber-400/40 bg-black/50 px-2 py-2.5 text-center text-sm font-semibold tabular-nums text-yellow-100 outline-none focus:border-amber-300 disabled:opacity-40"
              value={currentRaise}
              min={minRaise}
              max={maxRaiseTo}
              step={raiseStep}
              disabled={!isYourTurn}
              onChange={(e) => setRaisePreset(Number(e.target.value))}
              aria-label="加注金額"
            />
            <StepBtn
              disabled={
                !isYourTurn || stack <= 0 || currentRaise >= maxRaiseTo
              }
              onClick={() => nudgeRaise(1)}
              label="增加金額"
            >
              ＋
            </StepBtn>
          </div>

          <div className="mx-auto flex w-full max-w-md items-center gap-2 px-1">
            <span className="shrink-0 text-[10px] tabular-nums text-amber-200/45">
              {minRaise.toLocaleString()}
            </span>
            <input
              type="range"
              className="bet-slider h-2 w-full cursor-pointer appearance-none rounded-full bg-amber-950/80 accent-yellow-400 disabled:cursor-not-allowed disabled:opacity-40"
              min={minRaise}
              max={Math.max(minRaise, maxRaiseTo)}
              step={raiseStep}
              value={Math.min(currentRaise, Math.max(minRaise, maxRaiseTo))}
              disabled={!isYourTurn || stack <= 0 || maxRaiseTo <= minRaise}
              onChange={(e) => setRaisePreset(Number(e.target.value))}
              aria-label="拉動調整下注金額"
            />
            <span className="shrink-0 text-[10px] tabular-nums text-amber-200/45">
              {maxRaiseTo.toLocaleString()}
            </span>
          </div>

          <div className="flex justify-center">
            <ActionBtn
              disabled={
                !isYourTurn || stack <= 0 || currentRaise < minRaise
              }
              onClick={() =>
                sendAction({
                  type: toCall > 0 ? "raise" : "bet",
                  amount: currentRaise,
                })
              }
              tone="accent"
              wide
            >
              {toCall > 0 ? "加注至" : "下注"}{" "}
              {currentRaise.toLocaleString()}
            </ActionBtn>
          </div>
          <p className="text-center text-[10px] text-amber-200/40">
            1～3 倍＝大盲倍數 · 加減以大盲為單位
          </p>
        </div>
          </>
        )}
      </div>

      {/* 牌局紀錄 */}
      <PokerHandHistory />
    </div>
  );
}

function ActionBtn({
  children,
  onClick,
  disabled,
  tone = "default",
  wide,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "danger" | "accent";
  wide?: boolean;
}) {
  const tones = {
    default:
      "border-amber-400/45 bg-amber-500/15 text-amber-50 hover:bg-amber-400/25",
    danger:
      "border-rose-400/50 bg-rose-950/50 text-rose-50 hover:bg-rose-500/25",
    accent:
      "border-yellow-300/60 bg-gradient-to-r from-yellow-500/35 to-amber-600/40 text-yellow-50 hover:from-yellow-400/45 hover:to-amber-500/50",
  };
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-xl border px-4 py-2.5 text-sm font-bold touch-manipulation transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35",
        wide && "min-w-[5.5rem] flex-1 sm:flex-none sm:min-w-[6.5rem]",
        tones[tone],
      )}
    >
      {children}
    </button>
  );
}

function PresetBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="min-h-9 rounded-lg border border-amber-600/45 bg-black/40 px-2.5 py-2 text-xs font-semibold text-amber-100/85 touch-manipulation hover:border-amber-400/55 hover:bg-amber-900/35 disabled:opacity-35"
    >
      {children}
    </button>
  );
}

function StepBtn({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      className="flex h-11 w-11 items-center justify-center rounded-xl border border-yellow-300/50 bg-gradient-to-b from-yellow-500/30 to-amber-700/40 text-xl font-black text-yellow-50 touch-manipulation transition active:scale-95 hover:from-yellow-400/40 disabled:cursor-not-allowed disabled:opacity-35"
    >
      {children}
    </button>
  );
}
