"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TABLE_TIERS, type TableTierId } from "@/lib/poker/types";
import { usePokerStore } from "@/stores/poker-store";
import { usePokerSocket } from "@/hooks/use-poker-socket";

const QUEST_TITLE: Record<string, string> = {
  "poker.quest.playHands.title": "打完 20 手牌",
  "poker.quest.winPair.title": "以一對或以上贏一手",
  "poker.quest.foldPreflop.title": "翻前蓋牌 5 次",
  "poker.quest.winPots.title": "贏得 3 個底池",
};

export function PokerLobby() {
  const { pointsBalance, tiers, setMeta, setError, status, error } =
    usePokerStore();
  const { connect, joinTable } = usePokerSocket();
  const [selected, setSelected] = useState<TableTierId>("MICRO");
  const [buyIn, setBuyIn] = useState(TABLE_TIERS.MICRO.minBuyIn);
  const [quests, setQuests] = useState<
    Array<{
      questId: string;
      titleKey: string;
      currentValue: number;
      targetValue: number;
      rewardPoints: number;
      completed: boolean;
      claimed: boolean;
    }>
  >([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/poker/economy/balance");
        if (res.status === 401) {
          setError("請先登入後遊玩積分德州撲克");
          return;
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "載入失敗");
        setMeta({
          wsUrl: data.wsUrl,
          pointsBalance: data.pointsBalance,
          tiers: Object.values(data.tiers ?? TABLE_TIERS),
        });
        setBuyIn(data.tiers?.MICRO?.minBuyIn ?? TABLE_TIERS.MICRO.minBuyIn);
      } catch (e) {
        setError(e instanceof Error ? e.message : "載入失敗");
      }
    })();
  }, [setMeta, setError]);

  useEffect(() => {
    const cfg = TABLE_TIERS[selected];
    setBuyIn(cfg.minBuyIn);
  }, [selected]);

  async function refreshQuests() {
    const res = await fetch("/api/poker/economy/quests");
    if (!res.ok) return;
    const data = await res.json();
    setQuests(data.quests ?? []);
  }

  useEffect(() => {
    void refreshQuests();
  }, []);

  async function onCheckin() {
    setBusy("checkin");
    try {
      const res = await fetch("/api/poker/economy/checkin", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMeta({ pointsBalance: data.balance });
      alert(
        data.alreadyClaimed
          ? `今日已簽到（連續第 ${data.streakDay} 天）`
          : `簽到成功！+${data.pointsAwarded}（連續第 ${data.streakDay} 天）`,
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "簽到失敗");
    } finally {
      setBusy(null);
    }
  }

  async function onBankruptcy() {
    setBusy("bankruptcy");
    try {
      const res = await fetch("/api/poker/economy/bankruptcy", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.reason);
      setMeta({ pointsBalance: data.balance });
      alert(
        data.granted
          ? `破產補碼 +${data.pointsAwarded}（今日 ${data.rebuysUsed}/${data.maxRebuys}）`
          : data.reason,
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "失敗");
    } finally {
      setBusy(null);
    }
  }

  async function onClaimQuest(questId: string) {
    const res = await fetch("/api/poker/economy/quests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questId }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "領取失敗");
      return;
    }
    setMeta({ pointsBalance: data.balance });
    setQuests(data.quests ?? []);
  }

  const cfg = TABLE_TIERS[selected];
  const tierList = tiers.length
    ? (Object.keys(TABLE_TIERS) as TableTierId[])
    : (Object.keys(TABLE_TIERS) as TableTierId[]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-cyan-50">
            Neon Hold&apos;em
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            虛擬積分德州撲克 · 24/7 混人機牌桌 · 無真實貨幣
          </p>
        </div>
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-amber-100">
          積分{" "}
          <span className="text-xl font-semibold">
            {pointsBalance?.toLocaleString() ?? "—"}
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onCheckin}
          disabled={busy === "checkin"}
          className="rounded-lg border border-cyan-400/40 px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-500/10"
        >
          每日簽到
        </button>
        <button
          type="button"
          onClick={onBankruptcy}
          disabled={busy === "bankruptcy"}
          className="rounded-lg border border-violet-400/40 px-3 py-2 text-sm text-violet-100 hover:bg-violet-500/10"
        >
          破產保護補碼
        </button>
        <button
          type="button"
          onClick={() => void connect()}
          className="rounded-lg border border-white/20 px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
        >
          連線伺服器（{status}）
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tierList.map((id) => {
          const t = TABLE_TIERS[id];
          const active = selected === id;
          return (
            <motion.button
              key={id}
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelected(id)}
              className={`rounded-2xl border p-4 text-left transition ${
                active
                  ? "border-fuchsia-400/60 bg-fuchsia-500/10"
                  : "border-white/10 bg-slate-950/50 hover:border-cyan-400/30"
              }`}
            >
              <div className="text-sm font-semibold text-cyan-50">
                {t.nameZh}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                盲注 {t.smallBlind}/{t.bigBlind}
              </div>
              <div className="text-xs text-slate-400">
                買入 {t.minBuyIn.toLocaleString()}–
                {t.maxBuyIn.toLocaleString()}
              </div>
              <div className="mt-2 text-[11px] text-amber-200/70">
                AI：{t.botProfile}
              </div>
            </motion.button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-white/10 bg-black/30 p-4">
        <label className="text-sm text-slate-300">
          買入積分
          <input
            type="number"
            className="mt-1 block w-40 rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-white"
            min={cfg.minBuyIn}
            max={cfg.maxBuyIn}
            value={buyIn}
            onChange={(e) => setBuyIn(Number(e.target.value))}
          />
        </label>
        <button
          type="button"
          onClick={() => void joinTable({ tier: selected, buyIn })}
          className="rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg"
        >
          入桌開戰
        </button>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-200">每日任務</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {quests.map((q) => (
            <div
              key={q.questId}
              className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-sm"
            >
              <div>
                <div className="text-cyan-50">
                  {QUEST_TITLE[q.titleKey] ?? q.titleKey}
                </div>
                <div className="text-xs text-slate-400">
                  {q.currentValue}/{q.targetValue} · +{q.rewardPoints}
                </div>
              </div>
              {q.completed && !q.claimed ? (
                <button
                  type="button"
                  onClick={() => void onClaimQuest(q.questId)}
                  className="rounded-md border border-amber-400/40 px-2 py-1 text-xs text-amber-100"
                >
                  領取
                </button>
              ) : (
                <span className="text-xs text-slate-500">
                  {q.claimed ? "已領" : "進行中"}
                </span>
              )}
            </div>
          ))}
          {quests.length === 0 && (
            <p className="text-xs text-slate-500">
              登入並套用資料庫後即可載入任務（npm run db:poker）
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
