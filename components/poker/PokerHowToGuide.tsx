"use client";

import { useState, type ReactNode } from "react";
import { BookOpen, HelpCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PlayingCard } from "./PlayingCard";
import { cn } from "@/lib/utils";

type TabId =
  | "start"
  | "flow"
  | "actions"
  | "hands"
  | "tips"
  | "ui";

const TABS: { id: TabId; label: string }[] = [
  { id: "start", label: "入門" },
  { id: "flow", label: "流程" },
  { id: "actions", label: "操作" },
  { id: "hands", label: "牌型" },
  { id: "tips", label: "新手建議" },
  { id: "ui", label: "介面" },
];

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-2 text-center text-sm font-bold tracking-wide text-yellow-100">
      {children}
    </h3>
  );
}

function P({ children }: { children: ReactNode }) {
  return (
    <p className="text-center text-sm leading-relaxed text-amber-50/85">
      {children}
    </p>
  );
}

function Bullet({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-amber-700/40 bg-black/35 px-3 py-2.5 text-center">
      <div className="text-sm font-bold text-yellow-100">{title}</div>
      <div className="mt-1 text-xs leading-relaxed text-amber-100/75">{body}</div>
    </div>
  );
}

function HandRankRow({
  rank,
  name,
  example,
  cards,
}: {
  rank: number;
  name: string;
  example: string;
  cards: string[];
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-xl border border-amber-800/40 bg-black/30 px-2 py-2.5 sm:flex-row sm:justify-between sm:gap-3 sm:px-3">
      <div className="text-center sm:text-left">
        <div className="text-[10px] text-amber-200/45">#{rank}</div>
        <div className="text-sm font-bold text-yellow-100">{name}</div>
        <div className="text-[11px] text-amber-100/60">{example}</div>
      </div>
      <div className="flex flex-wrap justify-center gap-0.5">
        {cards.map((c) => (
          <PlayingCard key={c} code={c} size="xs" />
        ))}
      </div>
    </div>
  );
}

function TabContent({ tab }: { tab: TabId }) {
  if (tab === "start") {
    return (
      <div className="space-y-3">
        <SectionTitle>這是什麼遊戲？</SectionTitle>
        <P>
          Neon Hold&apos;em 是<strong className="text-yellow-100">積分制德州撲克</strong>
          （No-Limit Texas Hold&apos;em）。桌上用的是平台積分籌碼，
          <strong className="text-yellow-100">不是真實金錢</strong>。
        </P>
        <div className="grid gap-2">
          <Bullet
            title="① 確認已登入並連線"
            body="大廳顯示「已連線」後才能入桌。積分不足時可先簽到或使用破產保護補碼。"
          />
          <Bullet
            title="② 選擇額度、牌桌與買入"
            body="先選額度（新手建議微額），再從該額度的 4 張桌中挑一桌。買入＝帶到桌上的籌碼，離開時兌現回積分。"
          />
          <Bullet
            title="③ 入桌開打"
            body="每桌約有數位牌友，並留空位給後來的玩家。輪到你時底部按鈕會亮起，記得在倒數內行動。"
          />
          <Bullet
            title="④ 離開一定要結算"
            body="點「離桌兌現」或離開頁面時，會先確認結算。確認後籌碼才會安全退回積分庫。"
          />
        </div>
      </div>
    );
  }

  if (tab === "flow") {
    return (
      <div className="space-y-3">
        <SectionTitle>一局怎麼進行？</SectionTitle>
        <P>
          每人先發 <strong className="text-yellow-100">2 張底牌</strong>
          （只有自己看得到）。之後陸續開出最多{" "}
          <strong className="text-yellow-100">5 張公牌</strong>
          ，大家共用。用你的底牌 + 公牌湊出最好的五張牌型比大小。
        </P>
        <div className="grid gap-2">
          <Bullet
            title="翻牌前（Preflop）"
            body="發完底牌後開始下注。小盲／大盲會先強制投入籌碼。你可以蓋牌、跟注或加注。"
          />
          <Bullet
            title="翻牌（Flop）"
            body="桌面開出 3 張公牌，再進行一輪下注。"
          />
          <Bullet
            title="轉牌（Turn）"
            body="再開 1 張公牌，再下注一輪。"
          />
          <Bullet
            title="河牌（River）"
            body="最後 1 張公牌，最後一輪下注。若還有兩人以上沒蓋牌，就攤牌比大小。"
          />
          <Bullet
            title="誰贏？底池給誰？"
            body="沒蓋牌的人比牌型，最大者贏得底池積分。若中途只剩一人沒蓋牌，那人直接拿走底池（不用攤牌）。"
          />
        </div>
        <P>
          莊家位置會有金色 <strong className="text-yellow-100">D</strong>{" "}
          標記；盲注位置輪流移動。
        </P>
      </div>
    );
  }

  if (tab === "actions") {
    return (
      <div className="space-y-3">
        <SectionTitle>按鈕代表什麼？</SectionTitle>
        <div className="grid gap-2">
          <Bullet
            title="蓋牌（Fold）"
            body="放棄這手牌，不投入更多籌碼。已投入底池的籌碼拿不回來。"
          />
          <Bullet
            title="過牌（Check）"
            body="前面沒人下注時可用。等於「先看下一張牌」，暫時不加碼。"
          />
          <Bullet
            title="跟注（Call）"
            body="跟上目前需要的金額，繼續留在這手牌。"
          />
          <Bullet
            title="下注／加注"
            body="提高賭注。可選「最小／½池／滿池」，或自己輸入金額後按加注。"
          />
          <Bullet
            title="全下（All-in）"
            body="把剩餘籌碼一次押上。輸了桌上籌碼歸零（可再買入或離桌）；贏了可拿很多底池。"
          />
        </div>
        <div className="rounded-xl border border-yellow-300/35 bg-yellow-500/10 px-3 py-2.5 text-center text-xs leading-relaxed text-yellow-50/90">
          輪到你時座位會發光，上方會顯示剩餘秒數。逾時系統可能自動過牌或蓋牌，請盡快決定。
        </div>
      </div>
    );
  }

  if (tab === "hands") {
    return (
      <div className="space-y-3">
        <SectionTitle>牌型由大到小</SectionTitle>
        <P>以下由強到弱。同牌型再比點數高低。</P>
        <div className="space-y-1.5">
          <HandRankRow
            rank={1}
            name="皇家同花順"
            example="同花色 A K Q J 10"
            cards={["As", "Ks", "Qs", "Js", "Ts"]}
          />
          <HandRankRow
            rank={2}
            name="同花順"
            example="同花色連號"
            cards={["9h", "8h", "7h", "6h", "5h"]}
          />
          <HandRankRow
            rank={3}
            name="四條"
            example="四張同點"
            cards={["Kd", "Kc", "Kh", "Ks", "2d"]}
          />
          <HandRankRow
            rank={4}
            name="葫蘆"
            example="三條 + 一對"
            cards={["Qd", "Qc", "Qh", "9s", "9c"]}
          />
          <HandRankRow
            rank={5}
            name="同花"
            example="五張同花色"
            cards={["Ad", "Jd", "8d", "6d", "3d"]}
          />
          <HandRankRow
            rank={6}
            name="順子"
            example="五張連號（可不同花）"
            cards={["9c", "8d", "7h", "6s", "5c"]}
          />
          <HandRankRow
            rank={7}
            name="三條"
            example="三張同點"
            cards={["7h", "7d", "7c", "Ah", "2s"]}
          />
          <HandRankRow
            rank={8}
            name="兩對"
            example="兩個對子"
            cards={["Jh", "Jd", "4c", "4s", "9h"]}
          />
          <HandRankRow
            rank={9}
            name="一對"
            example="一對同點"
            cards={["Tc", "Th", "As", "8d", "3c"]}
          />
          <HandRankRow
            rank={10}
            name="高牌"
            example="以上皆無，比最大單牌"
            cards={["Ah", "Kd", "9c", "6s", "2h"]}
          />
        </div>
      </div>
    );
  }

  if (tab === "tips") {
    return (
      <div className="space-y-3">
        <SectionTitle>新手建議</SectionTitle>
        <div className="grid gap-2">
          <Bullet
            title="從微額檯練手"
            body="盲注小、輸贏波動較小，適合熟悉按鈕與節奏。"
          />
          <Bullet
            title="起手牌別每手都跟"
            body="很差的底牌可以翻前直接蓋牌，省籌碼。強對子、高同花連張較值得玩。"
          />
          <Bullet
            title="先搞懂「要跟多少」"
            body="看按鈕上的跟注金額。不確定時可先跟注看公牌，但不要盲目全下。"
          />
          <Bullet
            title="注意危險倍率與對手"
            body="打愈久節奏可能愈快。不同額度牌桌的對手風格也會不太一樣，先從微額熟悉節奏。"
          />
          <Bullet
            title="離桌會即時結算"
            body="按「離桌兌現」、關閉遊戲視窗或離開頁面時，會立刻把桌上剩餘籌碼兌現回積分。輸掉的不會退回；下次再開也不會因中斷而白拿積分。"
          />
          <Bullet
            title="任務與簽到"
            body="大廳可每日簽到、完成每日／每週任務領額外積分，破產時可用補碼再起。"
          />
        </div>
      </div>
    );
  }

  /* ui */
  return (
    <div className="space-y-3">
      <SectionTitle>介面看哪裡？</SectionTitle>
      <div className="grid gap-2">
        <Bullet
          title="自己座位（螢幕下方）"
          body="標示「你」，底牌會正面顯示且較大。發光＝輪到你行動。"
        />
        <Bullet
          title="桌面中央"
          body="公牌與底池金額。底池＝大家這手押進去的籌碼總和。"
        />
        <Bullet
          title="牌局紀錄"
          body="即時顯示誰蓋牌／跟注／加注。結束後可點舊牌局，看誰贏、贏多少、完整過程。"
        />
        <Bullet
          title="休息防掛機"
          body="連續兩次行動逾時會進入休息 10 分鐘（不發牌）。請點「回來了」繼續；時間到仍未回來會自動離桌兌現，避免籌碼繼續損失。"
        />
        <Bullet
          title="加買入"
          body="右上角「加買入」可在手牌之間從積分庫再轉籌碼上桌（不可超過本桌買入上限）。"
        />
        <Bullet
          title="牌型提示"
          body="下方操作區會顯示目前牌型（一對、兩對、同花等），只給你自己看，方便判斷強弱。"
        />
        <Bullet
          title="離桌兌現"
          body="右上角按鈕。會跳出確認框，顯示桌上籌碼，確認後兌現回積分庫。"
        />
        <Bullet
          title="連線狀態"
          body="大廳顯示連線中／已連線。若斷線請按重新連線；本機需啟動牌桌伺服器。"
        />
      </div>
      <div className="rounded-xl border border-amber-400/35 bg-amber-950/50 px-3 py-2.5 text-center text-xs leading-relaxed text-amber-100/80">
        還是不懂？先入微額檯打幾手，一邊看「牌局紀錄」一邊對照本說明，最快上手。
      </div>
    </div>
  );
}

export function PokerHowToGuide({
  variant = "button",
  className,
}: {
  /** button = 大廳主按鈕；icon = 牌桌精簡鈕 */
  variant?: "button" | "icon";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabId>("start");

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "inline-flex items-center gap-1 rounded-lg border border-amber-400/45 bg-amber-950/50 px-2.5 py-1.5 text-xs font-semibold text-amber-100 hover:bg-amber-900/45",
            className,
          )}
          aria-label="遊戲說明"
        >
          <HelpCircle className="size-3.5" />
          說明
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-yellow-300/55",
            "bg-gradient-to-r from-yellow-500/25 via-amber-500/20 to-yellow-600/25",
            "px-4 py-2.5 text-sm font-bold text-yellow-50",
            "shadow-[0_0_20px_rgba(251,191,36,0.2)] hover:from-yellow-400/35 hover:to-amber-500/35",
            className,
          )}
        >
          <BookOpen className="size-4" />
          遊戲說明
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-h-[min(92dvh,720px)] overflow-hidden border-amber-400/40 bg-gradient-to-b from-amber-950 to-zinc-950 text-amber-50 sm:max-w-lg"
          overlayClassName="bg-black/70 supports-backdrop-filter:backdrop-blur-sm"
        >
          <DialogHeader className="text-center sm:text-center">
            <DialogTitle className="flex items-center justify-center gap-2 text-lg text-yellow-100">
              <BookOpen className="size-5 text-amber-300" />
              Neon Hold&apos;em 遊戲說明
            </DialogTitle>
            <DialogDescription className="text-amber-100/65">
              完整上手指南 · 積分娛樂，非真實貨幣
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap justify-center gap-1.5 border-b border-amber-800/40 pb-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-semibold transition",
                  tab === t.id
                    ? "bg-yellow-400 text-amber-950"
                    : "bg-amber-900/40 text-amber-100/70 hover:bg-amber-800/50",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="max-h-[min(58vh,480px)] overflow-y-auto px-0.5 py-1">
            <TabContent tab={tab} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
