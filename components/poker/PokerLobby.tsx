"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Coins,
  Crown,
  Gem,
  Medal,
  Trophy,
  Wifi,
  WifiOff,
} from "lucide-react";
import { TABLE_TIERS, type TableTierId } from "@/lib/poker/types";
import {
  CHECKIN_REWARDS,
  BANKRUPTCY_THRESHOLD,
  BANKRUPTCY_REBUY_AMOUNT,
  BANKRUPTCY_MAX_REBUYS_PER_DAY,
} from "@/lib/poker/economy";
import { usePokerStore } from "@/stores/poker-store";
import { usePokerSocket } from "@/hooks/use-poker-socket";
import { useAuth } from "@/hooks/use-auth";
import {
  PokerGameToast,
  type PokerToastPayload,
  type PokerToastTone,
} from "@/components/poker/PokerGameToast";
import { PokerHowToGuide } from "@/components/poker/PokerHowToGuide";
import { cn } from "@/lib/utils";

type QuestView = {
  questId: string;
  titleKey: string;
  currentValue: number;
  targetValue: number;
  rewardPoints: number;
  completed: boolean;
  claimed: boolean;
  cadence: "daily" | "weekly";
};

type LeaderboardEntry = {
  rank: number;
  displayName: string;
  avatarUrl: string | null;
  pointsBalance: number;
  isYou: boolean;
};

const QUEST_TITLE: Record<string, string> = {
  "poker.quest.playHands.title": "打完 40 手牌",
  "poker.quest.playHandsHard.title": "硬核：打完 60 手牌",
  "poker.quest.winPair.title": "以一對或以上贏下 3 手",
  "poker.quest.foldPreflop.title": "翻前蓋牌 15 次",
  "poker.quest.winPots.title": "贏得 8 個底池",
  "poker.quest.winPotsHard.title": "硬核：贏得 12 個底池",
  "poker.quest.allInDaily.title": "全下 3 次",
  "poker.quest.weekPlay.title": "本週打完 400 手",
  "poker.quest.weekPlayElite.title": "本週精英：打完 650 手",
  "poker.quest.weekWinPots.title": "本週贏得 55 個底池",
  "poker.quest.weekAllIn.title": "本週全下 25 次",
  "poker.quest.weekWinPair.title": "本週以一對+贏下 28 手",
  "poker.quest.weekFold.title": "本週翻前蓋牌 90 次",
};

const STATUS_LABEL: Record<string, string> = {
  idle: "未連線",
  connecting: "連線中…",
  connected: "已連線",
  in_table: "牌桌中",
  error: "連線失敗",
};

const TIER_ACCENT: Record<TableTierId, string> = {
  MICRO: "from-amber-700/40 to-yellow-900/20",
  LOW: "from-yellow-600/35 to-amber-900/25",
  MID: "from-orange-500/30 to-amber-950/40",
  HIGH: "from-yellow-300/35 via-amber-500/25 to-rose-900/30",
};

export function PokerLobby() {
  const {
    pointsBalance,
    setMeta,
    setError,
    status,
    error,
    leaveNotice,
    wsUrl,
    lobby,
    queueRoomId,
    queuePosition,
    queueCount,
    queueLabel,
  } = usePokerStore();
  const { connect, disconnect, joinTable, leaveQueue } = usePokerSocket();
  const { profile } = useAuth();
  const [selected, setSelected] = useState<TableTierId>("MICRO");
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [buyIn, setBuyIn] = useState(TABLE_TIERS.MICRO.minBuyIn);
  const [quests, setQuests] = useState<QuestView[]>([]);
  const [questTab, setQuestTab] = useState<"daily" | "weekly">("daily");
  const [board, setBoard] = useState<LeaderboardEntry[]>([]);
  const [youRank, setYouRank] = useState<LeaderboardEntry | null>(null);
  const [joining, setJoining] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<PokerToastPayload | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoConnectTried = useRef(false);

  const showToast = useCallback(
    (payload: Omit<PokerToastPayload, "id"> & { tone?: PokerToastTone }) => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToast({ id, tone: "success", ...payload });
      toastTimer.current = setTimeout(() => setToast(null), 4200);
    },
    []
  );

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

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
        setError(null);

        try {
          const repairRes = await fetch("/api/poker/economy/repair-buyins", {
            method: "POST",
          });
          if (repairRes.ok) {
            const repair = (await repairRes.json()) as {
              refunded?: number;
              clawedBack?: number;
              balance?: number;
            };
            if (repair.balance != null) {
              setMeta({ pointsBalance: repair.balance });
            }
            if ((repair.clawedBack ?? 0) > 0) {
              showToast({
                title: "已校正籌碼",
                detail: "回收先前重複退款的多餘積分",
                pointsDelta: -(repair.clawedBack ?? 0),
                tone: "info",
              });
            }
            /* 不再每次提示「已退回」——對帳完成後應為 0 */
          }
        } catch {
          /* ignore */
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "載入失敗");
      }
    })();
  }, [setMeta, setError, showToast]);

  /* 餘額就緒後自動嘗試連線一次 */
  useEffect(() => {
    if (autoConnectTried.current) return;
    if (pointsBalance == null) return;
    autoConnectTried.current = true;
    void connect();
  }, [pointsBalance, connect]);

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

  async function refreshLeaderboard() {
    const res = await fetch("/api/poker/economy/leaderboard?limit=15");
    if (!res.ok) return;
    const data = await res.json();
    setBoard(data.entries ?? []);
    setYouRank(data.you ?? null);
  }

  useEffect(() => {
    void refreshQuests();
    void refreshLeaderboard();
    const id = window.setInterval(() => {
      void refreshLeaderboard();
    }, 90_000);
    return () => window.clearInterval(id);
  }, []);

  async function onCheckin() {
    setBusy("checkin");
    try {
      const res = await fetch("/api/poker/economy/checkin", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMeta({ pointsBalance: data.balance });
      void refreshLeaderboard();
      const awarded = Number(data.pointsAwarded) || 0;
      if (data.alreadyClaimed) {
        showToast({
          title: "今日已簽到",
          detail: `連續第 ${data.streakDay} 天 · 明日再來`,
          tone: "info",
        });
      } else {
        showToast({
          title: "簽到成功",
          detail: `連續第 ${data.streakDay} 天`,
          pointsDelta: awarded,
          tone: "success",
        });
      }
    } catch (e) {
      showToast({
        title: "簽到失敗",
        detail: e instanceof Error ? e.message : "請稍後再試",
        tone: "error",
      });
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
      if (!res.ok && data.error) throw new Error(data.error);
      if (typeof data.balance === "number") {
        setMeta({ pointsBalance: data.balance });
      }
      void refreshLeaderboard();
      if (data.granted) {
        const awarded = Number(data.pointsAwarded) || BANKRUPTCY_REBUY_AMOUNT;
        showToast({
          title: "破產保護成功",
          detail: `獲得 ${awarded.toLocaleString()} 積分 · 今日 ${data.rebuysUsed}/${data.maxRebuys} 次`,
          pointsDelta: awarded,
          tone: "success",
        });
      } else {
        showToast({
          title: "無法使用破產保護",
          detail: String(
            data.reason ??
              `需餘額低於 ${BANKRUPTCY_THRESHOLD} 積分（每次補 ${BANKRUPTCY_REBUY_AMOUNT.toLocaleString()}）`,
          ),
          tone: "warn",
        });
      }
    } catch (e) {
      showToast({
        title: "補碼失敗",
        detail: e instanceof Error ? e.message : "請稍後再試",
        tone: "error",
      });
    } finally {
      setBusy(null);
    }
  }

  async function onClaimQuest(questId: string) {
    const before = quests.find((q) => q.questId === questId);
    const res = await fetch("/api/poker/economy/quests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questId }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast({
        title: "領取失敗",
        detail: data.error || "任務獎勵尚未就緒",
        tone: "error",
      });
      return;
    }
    setMeta({ pointsBalance: data.balance });
    setQuests(data.quests ?? []);
    void refreshLeaderboard();
    showToast({
      title: "任務獎勵入帳",
      detail: `${QUEST_TITLE[before?.titleKey ?? ""] ?? "任務完成"} · 獲得 ${(before?.rewardPoints ?? 0).toLocaleString()} 積分`,
      pointsDelta: before?.rewardPoints,
      tone: "success",
    });
  }

  const cfg = TABLE_TIERS[selected];
  const tierList = Object.keys(TABLE_TIERS) as TableTierId[];
  const tierTables = useMemo(() => {
    const bySlot = new Map<number, (typeof lobby)[number]>();
    for (const t of lobby) {
      if (t.tier !== selected) continue;
      const slot =
        typeof t.slotIndex === "number"
          ? t.slotIndex
          : Number(String(t.roomId).split("_").pop());
      if (!Number.isFinite(slot)) continue;
      bySlot.set(slot, t);
    }
    return Array.from({ length: 4 }, (_, slot) => bySlot.get(slot) ?? null);
  }, [lobby, selected]);

  useEffect(() => {
    const open = tierTables.find((t) => t && t.canJoin);
    const queueable = tierTables.find(
      (t) => t && (t.canJoin || t.canQueue !== false),
    );
    const any = tierTables.find((t) => t != null);
    if (queueRoomId && tierTables.some((t) => t?.roomId === queueRoomId)) {
      setSelectedRoomId(queueRoomId);
      return;
    }
    if (selectedRoomId && tierTables.some((t) => t?.roomId === selectedRoomId)) {
      const cur = tierTables.find((t) => t?.roomId === selectedRoomId);
      /* 滿座但可排隊時保留選擇 */
      if (cur?.canJoin || cur?.canQueue !== false) return;
    }
    setSelectedRoomId(open?.roomId ?? queueable?.roomId ?? any?.roomId ?? null);
  }, [tierTables, selectedRoomId, queueRoomId]);

  const dailyQuests = useMemo(
    () => quests.filter((q) => q.cadence !== "weekly"),
    [quests]
  );
  const weeklyQuests = useMemo(
    () => quests.filter((q) => q.cadence === "weekly"),
    [quests]
  );
  const shownQuests = questTab === "daily" ? dailyQuests : weeklyQuests;
  const online = status === "connected" || status === "in_table";

  return (
    <div className="relative mx-auto w-full max-w-3xl space-y-6 text-center">
      <PokerGameToast toast={toast} onDismiss={() => setToast(null)} />

      <div className="relative mx-auto max-w-xl px-2 pt-2">
        <div
          className="pointer-events-none absolute inset-x-8 -top-2 h-16 bg-gradient-to-r from-transparent via-amber-400/25 to-transparent blur-xl"
          aria-hidden
        />
        <div className="inline-flex items-center justify-center gap-2 text-amber-300/90">
          <Crown className="size-5 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
          <span className="text-[11px] font-semibold tracking-[0.35em] text-amber-200/80 uppercase">
            VIP SALON
          </span>
          <Crown className="size-5 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
        </div>
        <h1 className="mt-2 bg-gradient-to-b from-yellow-100 via-amber-200 to-amber-500 bg-clip-text font-serif text-4xl font-black tracking-tight text-transparent drop-shadow-[0_0_24px_rgba(251,191,36,0.35)] sm:text-5xl">
          Neon Hold&apos;em
        </h1>
        <p className="mt-2 text-sm text-amber-100/55">
          積分德州撲克 · 24/7 常開牌桌 · 無真實貨幣
        </p>

        <div className="mt-4 flex justify-center">
          <PokerHowToGuide />
        </div>

        <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border-2 border-amber-300/50 bg-gradient-to-r from-amber-950/80 via-yellow-900/50 to-amber-950/80 px-5 py-2 shadow-[0_0_28px_rgba(251,191,36,0.25)]">
          <Coins className="size-4 text-yellow-300" />
          <span className="text-xs tracking-wider text-amber-200/70">籌碼庫</span>
          <span className="font-serif text-2xl font-bold tabular-nums text-yellow-100">
            {pointsBalance?.toLocaleString() ?? "—"}
          </span>
        </div>
      </div>

      {error && (
        <div className="mx-auto max-w-lg rounded-xl border border-rose-400/40 bg-rose-950/50 px-3 py-2 text-sm text-rose-100">
          {error}
        </div>
      )}
      {leaveNotice && (
        <div className="mx-auto max-w-lg rounded-xl border border-amber-300/50 bg-amber-950/60 px-3 py-2 text-center text-sm text-yellow-100">
          {leaveNotice}
        </div>
      )}

      {/* 連線狀態列 */}
      <div className="mx-auto flex max-w-lg flex-wrap items-center justify-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-950/40 px-3 py-2.5">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
            online
              ? "bg-emerald-500/20 text-emerald-200"
              : status === "connecting"
                ? "bg-amber-500/20 text-amber-100"
                : "bg-rose-500/15 text-rose-200"
          )}
        >
          {online ? (
            <Wifi className="size-3.5" />
          ) : (
            <WifiOff className="size-3.5" />
          )}
          {STATUS_LABEL[status] ?? status}
        </span>
        <span className="hidden text-[10px] text-amber-200/40 sm:inline">
          {wsUrl}
        </span>
        {online ? (
          <GoldBtn onClick={() => disconnect()} variant="outline">
            斷線
          </GoldBtn>
        ) : (
          <GoldBtn
            onClick={() => void connect()}
            disabled={status === "connecting"}
            icon={<Wifi className="size-3.5" />}
          >
            {status === "connecting" ? "連線中…" : "重新連線"}
          </GoldBtn>
        )}
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <GoldBtn
            onClick={onCheckin}
            disabled={busy === "checkin"}
            icon={<Gem className="size-3.5" />}
          >
            {busy === "checkin"
              ? "簽到中…"
              : `每日簽到（Day1 +${CHECKIN_REWARDS[0]!.toLocaleString()}）`}
          </GoldBtn>
          <GoldBtn
            onClick={onBankruptcy}
            disabled={busy === "bankruptcy"}
            variant="violet"
          >
            {busy === "bankruptcy"
              ? "補碼中…"
              : `破產保護（+${BANKRUPTCY_REBUY_AMOUNT.toLocaleString()}）`}
          </GoldBtn>
        </div>
        <p className="max-w-lg px-2 text-[11px] leading-relaxed text-amber-200/50">
          簽到：連續 1–7 天分別獲得{" "}
          {CHECKIN_REWARDS.map((n) => n.toLocaleString()).join("／")}{" "}
          積分。破產保護：餘額低於 {BANKRUPTCY_THRESHOLD}{" "}
          時可領，每次 +{BANKRUPTCY_REBUY_AMOUNT.toLocaleString()}，每日最多{" "}
          {BANKRUPTCY_MAX_REBUYS_PER_DAY} 次。
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {tierList.map((id) => {
          const t = TABLE_TIERS[id];
          const active = selected === id;
          return (
            <motion.button
              key={id}
              type="button"
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelected(id)}
              className={cn(
                "relative overflow-hidden rounded-2xl border-2 p-4 text-center transition",
                "bg-gradient-to-br",
                TIER_ACCENT[id],
                active
                  ? "border-amber-300 shadow-[0_0_28px_rgba(251,191,36,0.4)]"
                  : "border-amber-700/40 hover:border-amber-400/50"
              )}
            >
              {active && (
                <span className="absolute right-2 top-2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-amber-950">
                  已選
                </span>
              )}
              <div className="font-serif text-base font-bold text-amber-50">
                {t.nameZh}
              </div>
              <div className="mt-1 text-xs text-amber-100/60">
                盲注 {t.smallBlind}/{t.bigBlind}
              </div>
              <div className="text-xs text-amber-100/60">
                買入 {t.minBuyIn.toLocaleString()}–
                {t.maxBuyIn.toLocaleString()}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* 同額度 4 張固定牌桌 */}
      <div className="mx-auto w-full max-w-2xl space-y-2">
        <h2 className="text-center font-serif text-sm font-bold tracking-[0.15em] text-amber-200/90">
          選擇牌桌 · {cfg.nameZh}
        </h2>
        <p className="text-center text-[11px] text-amber-200/45">
          每個額度固定 4 桌；桌上約 5–9 人，滿座可排隊等空位
        </p>
        {queueRoomId ? (
          <div className="mx-auto flex max-w-md flex-col items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-950/50 px-4 py-3 text-center">
            <p className="text-sm text-amber-50">
              排隊中：{queueLabel ?? "牌桌"} · 第 {queuePosition ?? "?"} 位
              {queueCount != null ? `（共 ${queueCount} 人）` : ""}
            </p>
            <p className="text-[11px] text-amber-200/55">
              有空位時會自動入座；買入已預扣，取消排隊會退回
            </p>
            <button
              type="button"
              onClick={() => leaveQueue()}
              className="rounded-lg border border-rose-400/40 bg-rose-950/50 px-4 py-1.5 text-xs font-semibold text-rose-100 hover:bg-rose-900/60"
            >
              取消排隊
            </button>
          </div>
        ) : null}
        {tierTables.every((t) => t == null) ? (
          <p className="rounded-xl border border-amber-700/35 bg-black/30 px-3 py-4 text-center text-xs text-amber-200/50">
            {online
              ? "正在載入牌桌列表…若持續空白請按重新連線，並確認已重啟牌桌伺服器"
              : "請先連線後選擇牌桌"}
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {tierTables.map((t, slot) => {
              if (!t) {
                return (
                  <div
                    key={`pending-${slot}`}
                    className="rounded-2xl border-2 border-dashed border-amber-800/40 bg-black/25 px-3 py-3 text-center text-xs text-amber-200/40"
                  >
                    第 {slot + 1} 桌 · 同步中…
                  </div>
                );
              }
              const active = selectedRoomId === t.roomId;
              const full = !t.canJoin;
              const canQueue = full && t.canQueue !== false;
              const seated = t.seatedCount ?? t.seats?.length ?? 0;
              const qn = t.queueCount ?? 0;
              const myQueue = queueRoomId === t.roomId;
              return (
                <button
                  key={t.roomId}
                  type="button"
                  disabled={full && !canQueue && !active && !myQueue}
                  onClick={() => {
                    if (!full || canQueue || myQueue) setSelectedRoomId(t.roomId);
                  }}
                  className={cn(
                    "rounded-2xl border-2 px-3 py-3 text-center transition",
                    active || myQueue
                      ? "border-yellow-300 bg-amber-500/20 shadow-[0_0_20px_rgba(251,191,36,0.35)]"
                      : full && !canQueue
                        ? "cursor-not-allowed border-zinc-700/50 bg-zinc-950/40 opacity-55"
                        : full
                          ? "border-orange-700/50 bg-orange-950/35 hover:border-orange-400/55"
                          : "border-amber-700/45 bg-amber-950/45 hover:border-amber-400/55",
                  )}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-serif text-base font-bold text-amber-50">
                      {t.labelZh ?? `第 ${slot + 1} 桌`}
                    </span>
                    {(active || myQueue) && (
                      <span className="rounded-full bg-yellow-400 px-2 py-0.5 text-[10px] font-black text-amber-950">
                        {myQueue ? "排隊中" : "已選"}
                      </span>
                    )}
                    {full && (
                      <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-[10px] font-semibold text-zinc-200">
                        {canQueue ? "可排隊" : "已滿"}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-[11px] text-amber-100/55">
                    {t.code}
                  </div>
                  <div className="mt-2 text-xs text-amber-100/80">
                    在座 {seated}/{t.maxSeats ?? 9}
                    {seated < 5 ? (
                      <span className="ml-1 text-rose-300/80">（人數不足，請重新連線）</span>
                    ) : null}
                  </div>
                  {qn > 0 ? (
                    <div className="mt-1 text-[11px] text-orange-200/75">
                      排隊 {qn} 人
                    </div>
                  ) : null}
                  <div className="mt-1 text-[10px] text-amber-200/40">
                    {t.handNumber > 0
                      ? `進行中 · 手#${t.handNumber}`
                      : "等待開局"}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-2xl border-2 border-amber-400/35 bg-gradient-to-b from-amber-950/70 to-black/60 p-5 shadow-[inset_0_0_40px_rgba(251,191,36,0.08)] sm:flex-row sm:justify-center">
        <label className="text-left text-sm text-amber-100/80">
          買入積分
          <input
            type="number"
            className="mt-1 block w-44 rounded-xl border border-amber-400/40 bg-black/50 px-3 py-2 text-center font-semibold text-yellow-100 outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-400/30"
            min={cfg.minBuyIn}
            max={Math.min(cfg.maxBuyIn, pointsBalance ?? cfg.maxBuyIn)}
            value={buyIn}
            onChange={(e) => setBuyIn(Number(e.target.value))}
            disabled={!!queueRoomId}
          />
        </label>
        <motion.button
          type="button"
          whileHover={{ scale: joining || queueRoomId ? 1 : 1.04 }}
          whileTap={{ scale: joining || queueRoomId ? 1 : 0.97 }}
          disabled={
            joining ||
            !!queueRoomId ||
            status === "connecting" ||
            status === "error" ||
            status === "idle" ||
            !selectedRoomId ||
            (() => {
              const t = tierTables.find((x) => x?.roomId === selectedRoomId);
              if (!t) return true;
              return !t.canJoin && t.canQueue === false;
            })() ||
            (pointsBalance != null && buyIn > pointsBalance)
          }
          onClick={() => {
            if (!selectedRoomId) {
              setError("請先選擇要進入的牌桌");
              return;
            }
            const clamped = Math.max(
              cfg.minBuyIn,
              Math.min(cfg.maxBuyIn, buyIn, pointsBalance ?? buyIn)
            );
            setBuyIn(clamped);
            setJoining(true);
            setError(null);
            void joinTable({
              tier: selected,
              buyIn: clamped,
              roomId: selectedRoomId,
              name: profile?.display_name?.trim() || undefined,
              avatarUrl: profile?.avatar_url ?? null,
            }).finally(() => {
              window.setTimeout(() => setJoining(false), 2500);
            });
          }}
          className="rounded-xl border border-yellow-200/50 bg-gradient-to-r from-yellow-300 via-amber-400 to-amber-600 px-8 py-3 text-sm font-black tracking-wide text-amber-950 shadow-[0_0_32px_rgba(251,191,36,0.55)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {joining
            ? "處理中…"
            : queueRoomId
              ? "排隊等待中"
              : status === "idle" || status === "error"
                ? "請先連線"
                : !selectedRoomId
                  ? "請選牌桌"
                  : (() => {
                      const t = tierTables.find(
                        (x) => x?.roomId === selectedRoomId,
                      );
                      return t && !t.canJoin ? "加入排隊" : "入桌開戰";
                    })()}
        </motion.button>
      </div>
      <p className="text-center text-[11px] text-amber-200/45">
        先選額度 → 再選第幾桌 → 設定買入後按「入桌開戰」；滿座則「加入排隊」
      </p>

      {/* 任務 */}
      <div className="mx-auto max-w-2xl text-left">
        <div className="mb-3 flex items-center justify-center gap-2">
          <TabBtn
            active={questTab === "daily"}
            onClick={() => setQuestTab("daily")}
          >
            每日任務
          </TabBtn>
          <TabBtn
            active={questTab === "weekly"}
            onClick={() => setQuestTab("weekly")}
          >
            每週挑戰
          </TabBtn>
        </div>
        <p className="mb-3 text-center text-[11px] text-amber-200/45">
          {questTab === "daily"
            ? "每日香港時間 00:00 重置 · 完成越多獎勵越豐厚"
            : "每週一重置 · 高難度大獎等你挑戰"}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {shownQuests.map((q) => {
            const pct = Math.min(
              100,
              Math.round((q.currentValue / Math.max(1, q.targetValue)) * 100)
            );
            return (
              <div
                key={q.questId}
                className="rounded-xl border border-amber-500/25 bg-amber-950/40 px-3 py-2.5 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-amber-50">
                      {QUEST_TITLE[q.titleKey] ?? q.titleKey}
                    </div>
                    <div className="mt-0.5 text-xs text-amber-200/50">
                      {Math.min(q.currentValue, q.targetValue)}/{q.targetValue}{" "}
                      · +{q.rewardPoints.toLocaleString()}
                    </div>
                  </div>
                  {q.completed && !q.claimed ? (
                    <button
                      type="button"
                      onClick={() => void onClaimQuest(q.questId)}
                      className="shrink-0 rounded-lg border border-amber-300/60 bg-amber-400/20 px-2.5 py-1 text-xs font-semibold text-yellow-100 hover:bg-amber-400/30"
                    >
                      領取
                    </button>
                  ) : (
                    <span className="shrink-0 text-xs text-amber-500/70">
                      {q.claimed ? "已領" : "進行中"}
                    </span>
                  )}
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/40">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      q.completed
                        ? "bg-gradient-to-r from-yellow-300 to-amber-500"
                        : "bg-gradient-to-r from-amber-700 to-amber-400"
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
          {shownQuests.length === 0 && (
            <p className="col-span-full text-center text-xs text-amber-500/60">
              登入後即可載入任務（若仍空白請執行 npm run db:poker-quests）
            </p>
          )}
        </div>
      </div>

      {/* 積分排行榜 */}
      <div className="mx-auto max-w-2xl">
        <h2 className="mb-3 flex items-center justify-center gap-2 font-serif text-sm font-bold tracking-[0.2em] text-amber-200/90">
          <Trophy className="size-4 text-yellow-300" />
          積分排行榜
          <Trophy className="size-4 text-yellow-300" />
        </h2>
        <div className="overflow-hidden rounded-2xl border-2 border-amber-400/30 bg-gradient-to-b from-amber-950/60 to-black/70">
          {board.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-amber-500/60">
              尚無排名資料
            </p>
          ) : (
            <ul className="divide-y divide-amber-800/30 text-left">
              {board.map((row) => (
                <li
                  key={`${row.rank}-${row.displayName}-${row.pointsBalance}`}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5",
                    row.isYou && "bg-amber-400/10"
                  )}
                >
                  <RankBadge rank={row.rank} />
                  {row.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={row.avatarUrl}
                      alt=""
                      className="size-8 shrink-0 rounded-full border border-amber-300/40 object-cover"
                    />
                  ) : (
                    <span className="size-8 shrink-0 rounded-full border border-amber-700/40 bg-amber-950/80" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-amber-50">
                      {row.displayName}
                      {row.isYou ? (
                        <span className="ml-1.5 text-[10px] text-yellow-300">
                          （你）
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="tabular-nums text-sm font-semibold text-yellow-200">
                    {row.pointsBalance.toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {youRank && !board.some((b) => b.isYou) ? (
            <div className="border-t border-amber-500/30 bg-amber-900/30 px-4 py-2 text-left text-xs text-amber-100/80">
              你的排名：#{youRank.rank} ·{" "}
              {youRank.pointsBalance.toLocaleString()} 籌碼
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-yellow-200 to-amber-500 text-amber-950 shadow-[0_0_12px_rgba(251,191,36,0.5)]">
        <Crown className="size-3.5" />
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="flex size-7 items-center justify-center rounded-full bg-slate-300/90 text-slate-800">
        <Medal className="size-3.5" />
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="flex size-7 items-center justify-center rounded-full bg-amber-700/90 text-amber-100">
        <Medal className="size-3.5" />
      </span>
    );
  }
  return (
    <span className="flex size-7 items-center justify-center rounded-full border border-amber-600/40 text-xs font-bold text-amber-200/80">
      {rank}
    </span>
  );
}

function TabBtn({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
        active
          ? "border-amber-300 bg-amber-400/25 text-yellow-100 shadow-[0_0_16px_rgba(251,191,36,0.3)]"
          : "border-amber-800/50 text-amber-200/55 hover:border-amber-500/40"
      )}
    >
      {children}
    </button>
  );
}

function GoldBtn({
  children,
  onClick,
  disabled,
  variant = "gold",
  icon,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "gold" | "violet" | "outline";
  icon?: React.ReactNode;
}) {
  const styles = {
    gold: "border-amber-400/50 bg-amber-500/15 text-amber-100 hover:bg-amber-400/25",
    violet:
      "border-fuchsia-400/40 bg-fuchsia-500/10 text-fuchsia-100 hover:bg-fuchsia-500/20",
    outline:
      "border-amber-700/50 bg-black/30 text-amber-100/80 hover:border-amber-400/40 hover:bg-amber-950/40",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-medium disabled:opacity-45",
        styles[variant]
      )}
    >
      {icon}
      {children}
    </button>
  );
}
