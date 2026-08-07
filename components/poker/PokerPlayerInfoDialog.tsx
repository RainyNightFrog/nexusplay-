"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { PublicSeat } from "@/lib/poker/public-types";
import {
  formatHudAf,
  formatHudNet,
  formatHudPct,
  type PublicSeatHud,
} from "@/lib/poker/hud-stats";

function StatCell({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div
      className="rounded-xl border border-amber-700/35 bg-black/45 px-2.5 py-2 text-center"
      title={hint}
    >
      <div className="text-[10px] font-semibold tracking-wide text-amber-200/55">
        {label}
      </div>
      <div className="mt-0.5 text-lg font-black tabular-nums text-yellow-100">
        {value}
      </div>
    </div>
  );
}

function HudGrid({ hud }: { hud: PublicSeatHud }) {
  const sampleNote =
    hud.hands < 10
      ? "樣本偏少，僅供參考"
      : hud.hands < 30
        ? "樣本尚可"
        : "樣本較充足";

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <StatCell
          label="手數"
          value={String(hud.hands)}
          hint="本桌入座後參與的手牌數"
        />
        <StatCell
          label="VPIP"
          value={formatHudPct(hud.vpipPct)}
          hint="翻前自願投入底池比例（不含強制盲注）"
        />
        <StatCell
          label="翻前加注"
          value={formatHudPct(hud.pfrPct)}
          hint="PFR：翻前加注／開池比例"
        />
        <StatCell
          label="3-Bet"
          value={formatHudPct(hud.threeBetPct)}
          hint="面對加注後再加注的比例"
        />
        <StatCell
          label="持續下注"
          value={formatHudPct(hud.cbetPct)}
          hint="C-Bet：翻前攻擊後在翻牌繼續下注"
        />
        <StatCell
          label="進攤牌"
          value={formatHudPct(hud.wtsdPct)}
          hint="WTSD：看到翻牌後進入攤牌的比例"
        />
        <StatCell
          label="攤牌勝率"
          value={formatHudPct(hud.wonSdPct)}
          hint="攤牌時獲勝比例"
        />
        <StatCell
          label="翻前蓋牌"
          value={formatHudPct(hud.foldPfPct)}
          hint="翻前蓋牌比例"
        />
        <StatCell
          label="攻擊係數"
          value={formatHudAf(hud.af)}
          hint="AF = (下注+加注) ÷ 跟注"
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-800/40 bg-amber-950/40 px-3 py-2 text-xs">
        <span className="text-amber-200/65">
          獲勝 {hud.wonHands} 手 · {sampleNote}
        </span>
        <span
          className={cn(
            "font-black tabular-nums",
            hud.netProfit > 0 && "text-emerald-300",
            hud.netProfit < 0 && "text-rose-300",
            hud.netProfit === 0 && "text-amber-200/70",
          )}
        >
          本桌淨 {formatHudNet(hud.netProfit)}
        </span>
      </div>
    </div>
  );
}

export function PokerPlayerInfoDialog({
  seat,
  open,
  onOpenChange,
  isYou,
}: {
  seat: PublicSeat | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isYou: boolean;
}) {
  const name = seat ? (isYou ? "你" : seat.name) : "";
  const hud = seat?.hud;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto border-amber-400/40 bg-gradient-to-b from-amber-950 to-zinc-950 text-amber-50 sm:max-w-md"
        overlayClassName="bg-black/70 supports-backdrop-filter:backdrop-blur-sm"
      >
        <DialogHeader className="text-center sm:text-center">
          <div className="flex flex-col items-center gap-2">
            {seat?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={seat.avatarUrl}
                alt=""
                className="h-14 w-14 rounded-full border-2 border-yellow-300/60 object-cover shadow-[0_0_18px_rgba(250,204,21,0.35)]"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-yellow-300/50 bg-amber-900/60 text-lg font-black text-yellow-100">
                {(name || "?").slice(0, 2)}
              </div>
            )}
            <DialogTitle className="text-yellow-100">{name || "玩家"}</DialogTitle>
            <DialogDescription className="text-amber-100/65">
              本桌風格數據 · 入座後即時累計
            </DialogDescription>
          </div>
        </DialogHeader>

        {seat ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-center text-sm">
              <div className="rounded-xl border border-amber-700/35 bg-black/40 px-3 py-2">
                <div className="text-[10px] text-amber-200/55">籌碼</div>
                <div className="font-black tabular-nums text-amber-50">
                  {seat.stack.toLocaleString()}
                </div>
              </div>
              <div className="rounded-xl border border-amber-700/35 bg-black/40 px-3 py-2">
                <div className="text-[10px] text-amber-200/55">座位</div>
                <div className="font-black text-amber-50">
                  #{seat.seatIndex + 1}
                  {seat.sittingOut ? " · 休息中" : ""}
                  {seat.folded ? " · 已蓋牌" : ""}
                  {seat.allIn ? " · 全下" : ""}
                </div>
              </div>
            </div>

            {hud && hud.hands > 0 ? (
              <HudGrid hud={hud} />
            ) : (
              <p className="rounded-xl border border-dashed border-amber-700/40 bg-black/30 px-3 py-6 text-center text-sm text-amber-200/50">
                尚無本桌手牌樣本
                <br />
                <span className="text-xs">打完幾手後即可看到 VPIP 等數據</span>
              </p>
            )}

            <p className="text-center text-[10px] leading-relaxed text-amber-200/40">
              VPIP＝翻前自願入池　｜　翻前加注＝PFR　｜　持續下注＝C-Bet
              <br />
              數據僅計本桌本次入座，離桌後重置
            </p>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
