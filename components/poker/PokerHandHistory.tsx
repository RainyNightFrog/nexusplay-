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
import type { HandHistoryRecord, HandLogLine } from "@/lib/poker/hand-history";

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

function HandDetailBody({
  hand,
  mySeatId,
}: {
  hand: HandHistoryRecord;
  mySeatId: string | null;
}) {
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
      {hand.winners.length > 0 && (
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
      )}
      <div className="max-h-[min(42vh,320px)] overflow-y-auto rounded-xl border border-amber-800/40 bg-black/35 px-3 py-3">
        <LogLines lines={hand.lines} />
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
            {handHistory.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => setViewingHandId(h.id)}
                className={cn(
                  "rounded-lg border px-2.5 py-2 text-center text-xs transition",
                  "border-amber-700/40 bg-amber-950/40 text-amber-50/90",
                  "hover:border-yellow-300/50 hover:bg-amber-900/50 hover:text-yellow-100",
                )}
              >
                <span className="font-semibold">{h.summary}</span>
              </button>
            ))}
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
          className="border-amber-400/40 bg-gradient-to-b from-amber-950 to-zinc-950 text-amber-50 sm:max-w-md"
          overlayClassName="bg-black/70 supports-backdrop-filter:backdrop-blur-sm"
        >
          <DialogHeader className="text-center sm:text-center">
            <DialogTitle className="text-yellow-100">
              {viewing?.summary ?? "牌局詳情"}
            </DialogTitle>
            <DialogDescription className="text-amber-100/65">
              完整行動過程與勝負結算
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
