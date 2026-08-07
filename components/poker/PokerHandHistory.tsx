"use client";

import { useMemo } from "react";
import { usePokerStore } from "@/stores/poker-store";
import { PlayingCard } from "./PlayingCard";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formatNetZh,
  type HandHistoryRecord,
  type HandLogLine,
  type HandSeatResult,
} from "@/lib/poker/hand-history";

function LogLines({ lines }: { lines: HandLogLine[] }) {
  if (lines.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-amber-200/40">尚無動作</p>
    );
  }
  return (
    <div className="space-y-1.5">
      {lines.map((l) => (
        <div
          key={l.id}
          className={cn(
            "text-center text-sm leading-relaxed",
            l.kind === "meta" && "font-semibold text-amber-200/55",
            l.kind === "street" && "font-semibold text-emerald-200/90",
            l.kind === "action" && "text-amber-50/90",
            l.kind === "result" &&
              "rounded-lg border border-yellow-300/40 bg-yellow-500/10 px-2 py-1.5 font-bold text-yellow-100",
          )}
        >
          {l.text}
        </div>
      ))}
    </div>
  );
}

function SeatResultRow({
  seat,
  mySeatId,
}: {
  seat: HandSeatResult;
  mySeatId: string | null;
}) {
  const isYou = Boolean(mySeatId && seat.seatId === mySeatId);
  const name = isYou ? "你" : seat.name;
  const netPositive = seat.net > 0;
  const netNegative = seat.net < 0;

  return (
    <div
      className={cn(
        "rounded-xl border px-2.5 py-2",
        isYou
          ? "border-yellow-300/45 bg-yellow-500/10"
          : netPositive
            ? "border-emerald-400/30 bg-emerald-950/40"
            : "border-amber-800/40 bg-black/40",
        seat.folded && !isYou && "opacity-70",
      )}
    >
      <div className="flex items-start gap-2.5">
        <div className="flex min-w-[4.25rem] shrink-0 justify-center gap-0.5 pt-0.5">
          {seat.holeCards?.length ? (
            seat.holeCards.map((c) => (
              <PlayingCard key={c} code={c} size="xs" />
            ))
          ) : (
            <div className="flex h-[2.35rem] min-w-[3.6rem] items-center justify-center rounded-md border border-dashed border-amber-700/40 px-1 text-[10px] text-amber-200/40">
              {seat.folded ? "蓋牌" : "未公開"}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span className="truncate text-sm font-bold text-amber-50">
              {name}
            </span>
            {seat.folded ? (
              <span className="rounded-full bg-zinc-700/80 px-1.5 py-0.5 text-[9px] font-bold text-zinc-200">
                蓋牌
              </span>
            ) : null}
            {seat.allIn ? (
              <span className="rounded-full bg-rose-600/80 px-1.5 py-0.5 text-[9px] font-bold text-white">
                全下
              </span>
            ) : null}
            {seat.handLabelZh ? (
              <span className="rounded-full border border-amber-400/35 bg-amber-950/60 px-1.5 py-0.5 text-[9px] font-bold text-amber-100">
                {seat.handLabelZh}
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-[11px] tabular-nums text-amber-100/75">
            <span>投入 {seat.committed.toLocaleString()}</span>
            {seat.won > 0 ? (
              <span className="text-yellow-200">
                贏得 {seat.won.toLocaleString()}
              </span>
            ) : (
              <span className="text-amber-200/45">未得獎</span>
            )}
            <span
              className={cn(
                "font-black",
                netPositive && "text-emerald-300",
                netNegative && "text-rose-300",
                !netPositive && !netNegative && "text-amber-200/60",
              )}
            >
              淨 {formatNetZh(seat.net)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function HandDetailBody({
  hand,
  mySeatId,
}: {
  hand: HandHistoryRecord;
  mySeatId: string | null;
}) {
  const seats = hand.seats ?? [];
  const processLines = hand.lines.filter((l) => l.kind !== "result");

  return (
    <div className="space-y-3">
      {hand.board.length > 0 && (
        <div className="flex flex-col items-center gap-1.5">
          <div className="text-[11px] tracking-wide text-amber-200/55">公牌</div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {hand.board.map((c) => (
              <PlayingCard key={c} code={c} size="sm" />
            ))}
          </div>
        </div>
      )}

      {seats.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-0.5">
            <div className="text-[11px] font-semibold tracking-wide text-amber-200/60">
              勝負明細
            </div>
            <div className="text-[11px] tabular-nums text-amber-200/45">
              底池 {hand.potTotal.toLocaleString()}
              {hand.showdown ? " · 攤牌" : ""}
            </div>
          </div>
          <div className="max-h-[min(38vh,280px)] space-y-1.5 overflow-y-auto pr-0.5">
            {seats.map((s) => (
              <SeatResultRow key={s.seatId} seat={s} mySeatId={mySeatId} />
            ))}
          </div>
        </div>
      ) : hand.winners.length > 0 ? (
        <div className="space-y-1.5 rounded-xl border border-yellow-300/35 bg-amber-950/50 px-3 py-2.5 text-center">
          {hand.winners.map((w) => {
            const name = mySeatId && w.seatId === mySeatId ? "你" : w.name;
            return (
              <div key={w.seatId} className="text-sm font-bold text-yellow-100">
                {name} 贏得{" "}
                <span className="tabular-nums text-yellow-200">
                  {w.amount.toLocaleString()}
                </span>{" "}
                積分
                {w.handLabelZh ? (
                  <span className="ml-1 font-medium text-amber-200/70">
                    （{w.handLabelZh}）
                  </span>
                ) : null}
              </div>
            );
          })}
          <div className="text-[11px] text-amber-200/50">
            底池合計 {hand.potTotal.toLocaleString()}
          </div>
        </div>
      ) : null}

      <div>
        <div className="mb-1.5 px-0.5 text-[11px] font-semibold tracking-wide text-amber-200/60">
          行動過程
        </div>
        <div className="max-h-[min(32vh,240px)] overflow-y-auto rounded-xl border border-amber-800/40 bg-black/35 px-3 py-3">
          <LogLines lines={processLines} />
        </div>
      </div>
    </div>
  );
}

export function PokerHandHistory() {
  const currentHandDraft = usePokerStore((s) => s.currentHandDraft);
  const handHistory = usePokerStore((s) => s.handHistory);
  const viewingHandId = usePokerStore((s) => s.viewingHandId);
  const setViewingHandId = usePokerStore((s) => s.setViewingHandId);
  const seatId = usePokerStore((s) => s.seatId);

  const viewing = useMemo(
    () => handHistory.find((h) => h.id === viewingHandId) ?? null,
    [handHistory, viewingHandId],
  );

  const liveLines = currentHandDraft?.lines ?? [];

  return (
    <div className="rounded-xl border border-amber-700/35 bg-black/40">
      <div className="border-b border-amber-800/40 px-3 py-1.5 text-center text-[11px] font-semibold tracking-wide text-amber-200/70">
        牌局紀錄
      </div>

      {/* 當前手牌過程 */}
      <div className="max-h-36 overflow-y-auto px-3 py-2">
        {liveLines.length === 0 && handHistory.length === 0 ? (
          <p className="py-3 text-center text-sm text-amber-200/35">尚無紀錄</p>
        ) : liveLines.length === 0 ? (
          <p className="py-2 text-center text-xs text-amber-200/40">
            等待下一手開始…
          </p>
        ) : (
          <LogLines lines={[...liveLines].reverse()} />
        )}
      </div>

      {/* 可點選舊牌局 */}
      {handHistory.length > 0 && (
        <div className="border-t border-amber-800/40 px-2 py-2">
          <div className="mb-1.5 text-center text-[10px] tracking-wide text-amber-200/45">
            點選查看舊牌局
          </div>
          <div className="flex max-h-28 flex-col gap-1 overflow-y-auto">
            {handHistory.map((h) => {
              const mine = seatId
                ? h.seats?.find((s) => s.seatId === seatId)
                : undefined;
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setViewingHandId(h.id)}
                  className={cn(
                    "rounded-lg border px-2.5 py-2 text-left text-xs transition",
                    "border-amber-700/40 bg-amber-950/40 text-amber-50/90",
                    "hover:border-yellow-300/50 hover:bg-amber-900/50 hover:text-yellow-100",
                  )}
                >
                  <div className="font-semibold">{h.summary}</div>
                  {mine ? (
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[10px] text-amber-200/55">
                      {mine.holeCards?.length ? (
                        <span>
                          手牌{" "}
                          {mine.holeCards
                            .map((c) => c.toUpperCase())
                            .join(" ")}
                        </span>
                      ) : mine.folded ? (
                        <span>已蓋牌</span>
                      ) : null}
                      <span
                        className={cn(
                          "font-bold tabular-nums",
                          mine.net > 0 && "text-emerald-300/90",
                          mine.net < 0 && "text-rose-300/90",
                        )}
                      >
                        淨 {formatNetZh(mine.net)}
                      </span>
                    </div>
                  ) : h.winners[0] ? (
                    <div className="mt-0.5 text-[10px] text-amber-200/50">
                      {h.winners[0].name}
                      {h.winners[0].handLabelZh
                        ? ` · ${h.winners[0].handLabelZh}`
                        : ""}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Dialog
        open={Boolean(viewing)}
        onOpenChange={(open) => {
          if (!open) setViewingHandId(null);
        }}
      >
        <DialogContent
          className="max-h-[90vh] overflow-y-auto border-amber-400/40 bg-gradient-to-b from-amber-950 to-zinc-950 text-amber-50 sm:max-w-lg"
          overlayClassName="bg-black/70 supports-backdrop-filter:backdrop-blur-sm"
        >
          <DialogHeader className="text-center sm:text-center">
            <DialogTitle className="text-yellow-100">
              {viewing?.summary ?? "牌局詳情"}
            </DialogTitle>
            <DialogDescription className="text-amber-100/65">
              手牌、投入／贏得／淨輸贏與行動過程
            </DialogDescription>
          </DialogHeader>
          {viewing ? (
            <HandDetailBody hand={viewing} mySeatId={seatId} />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
