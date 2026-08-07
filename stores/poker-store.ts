"use client";

import { create } from "zustand";
import type {
  PublicHandSnapshot,
  PublicTableState,
} from "@/lib/poker/public-types";
import type { PlayerActionType, TableTierId } from "@/lib/poker/types";
import type { TableTierConfig } from "@/lib/poker/types";
import {
  buildHandSummary,
  formatActionLine,
  formatCardCode,
  formatWinnersSummary,
  mergeSeatHoleCardsFromSnapshot,
  streetLabelZh,
  whoName,
  type HandHistoryRecord,
  type HandLogLine,
  type PublicEngineEvent,
} from "@/lib/poker/hand-history";

function emptyHandDraft(
  partial: Pick<HandHistoryRecord, "id" | "handNumber" | "handId"> &
    Partial<HandHistoryRecord>,
): HandHistoryRecord {
  return {
    lines: [],
    winners: [],
    seats: [],
    board: [],
    potTotal: 0,
    showdown: false,
    completed: false,
    summary: `第 ${partial.handNumber} 手 · 進行中`,
    ...partial,
  };
}

export type PokerConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "in_table"
  | "error";

type PokerStore = {
  status: PokerConnectionStatus;
  error: string | null;
  /** 離桌成功等非錯誤提示 */
  leaveNotice: string | null;
  wsUrl: string;
  pointsBalance: number | null;
  tiers: TableTierConfig[];
  lobby: PublicTableState[];
  table: PublicHandSnapshot | null;
  seatId: string | null;
  roomId: string | null;
  /** 排隊中的牌桌 */
  queueRoomId: string | null;
  queuePosition: number | null;
  queueCount: number | null;
  queueLabel: string | null;
  /** @deprecated 改用 handHistory；保留相容 */
  lastActionLog: string[];
  handHistory: HandHistoryRecord[];
  currentHandDraft: HandHistoryRecord | null;
  viewingHandId: string | null;
  /** 牌桌特效：全下／獲勝 */
  tableFx: {
    kind: "allin" | "win";
    seatIds: string[];
    until: number;
    /** 獲勝時顯示誰贏了多少 */
    summary?: string;
  } | null;
  handsThisSession: number;
  handsSincePlaytimeTick: number;
  turnDeadlineMs: number | null;
  timeBankSec: number;

  setMeta: (p: {
    wsUrl?: string;
    pointsBalance?: number;
    tiers?: TableTierConfig[];
  }) => void;
  setError: (msg: string | null) => void;
  setLeaveNotice: (msg: string | null) => void;
  setStatus: (s: PokerConnectionStatus) => void;
  setLobby: (lobby: PublicTableState[]) => void;
  applyPokerEvent: (payload: unknown) => void;
  setJoined: (roomId: string, seatId: string) => void;
  setQueued: (info: {
    roomId: string;
    position: number;
    queueCount: number;
    labelZh?: string;
    code?: string;
  }) => void;
  clearQueue: () => void;
  resetTable: () => void;
  bumpHandComplete: () => void;
  setViewingHandId: (id: string | null) => void;
  clearTableFx: () => void;
};

let lineSeq = 0;
function nextLineId(prefix: string): string {
  lineSeq += 1;
  return `${prefix}_${lineSeq}`;
}

function pushLine(
  draft: HandHistoryRecord,
  kind: HandLogLine["kind"],
  text: string,
): void {
  draft.lines.push({ id: nextLineId(kind), kind, text });
}

export const usePokerStore = create<PokerStore>((set, get) => ({
  status: "idle",
  error: null,
  leaveNotice: null,
  wsUrl: "http://localhost:3101",
  pointsBalance: null,
  tiers: [],
  lobby: [],
  table: null,
  seatId: null,
  roomId: null,
  queueRoomId: null,
  queuePosition: null,
  queueCount: null,
  queueLabel: null,
  lastActionLog: [],
  handHistory: [],
  currentHandDraft: null,
  viewingHandId: null,
  tableFx: null,
  handsThisSession: 0,
  handsSincePlaytimeTick: 0,
  turnDeadlineMs: null,
  timeBankSec: 30,

  setMeta: (p) => set(p),
  setError: (error) => set({ error }),
  setLeaveNotice: (leaveNotice) => set({ leaveNotice }),
  setStatus: (status) => set({ status }),
  setLobby: (lobby) => set({ lobby }),
  setViewingHandId: (viewingHandId) => set({ viewingHandId }),
  clearTableFx: () => set({ tableFx: null }),

  setJoined: (roomId, seatId) =>
    set({
      roomId,
      seatId,
      status: "in_table",
      error: null,
      queueRoomId: null,
      queuePosition: null,
      queueCount: null,
      queueLabel: null,
      lastActionLog: [],
      handHistory: [],
      currentHandDraft: null,
      viewingHandId: null,
      tableFx: null,
    }),

  setQueued: (info) =>
    set({
      queueRoomId: info.roomId,
      queuePosition: info.position,
      queueCount: info.queueCount,
      queueLabel: info.labelZh || info.code || null,
      status: "connected",
      error: null,
    }),

  clearQueue: () =>
    set({
      queueRoomId: null,
      queuePosition: null,
      queueCount: null,
      queueLabel: null,
    }),

  resetTable: () =>
    set({
      table: null,
      seatId: null,
      roomId: null,
      turnDeadlineMs: null,
      lastActionLog: [],
      handHistory: [],
      currentHandDraft: null,
      viewingHandId: null,
      tableFx: null,
      status: "connected",
    }),

  bumpHandComplete: () =>
    set((s) => ({
      handsThisSession: s.handsThisSession + 1,
      handsSincePlaytimeTick: s.handsSincePlaytimeTick + 1,
    })),

  applyPokerEvent: (payload) => {
    const p = payload as {
      type: string;
      message?: string;
      table?: PublicHandSnapshot;
      event?: PublicEngineEvent;
      publicSnapshot?: PublicHandSnapshot;
      seatId?: string;
      deadlineMs?: number;
      timeBankSec?: number;
    };

    if (p.type === "error") {
      set({ error: p.message ?? "錯誤" });
      return;
    }

    if (p.type === "top_up_ok") {
      const amount = (payload as { amount?: number }).amount ?? 0;
      const bal = get().pointsBalance;
      set({
        error: null,
        leaveNotice: `已加買入 ${amount.toLocaleString()} 籌碼`,
        pointsBalance:
          bal != null && amount > 0 ? Math.max(0, bal - amount) : bal,
      });
      window.setTimeout(() => {
        if (get().leaveNotice?.includes("已加買入")) {
          set({ leaveNotice: null });
        }
      }, 3500);
      return;
    }

    if (p.type === "afk_rest") {
      const restUntilMs = (payload as { restUntilMs?: number }).restUntilMs;
      const message =
        (payload as { message?: string }).message ??
        "已進入休息，請點「回來了」繼續";
      set({
        leaveNotice: message,
        error: null,
      });
      /* 同步座位休息狀態到 table */
      const table = get().table;
      const seatId = get().seatId;
      if (table && seatId && restUntilMs) {
        set({
          table: {
            ...table,
            seats: table.seats.map((s) =>
              s.seatId === seatId
                ? { ...s, sittingOut: true, restUntilMs }
                : s,
            ),
          },
        });
      }
      return;
    }

    if (p.type === "table_state" && p.table) {
      set({
        table: preserveOwnHoleCards(get().table, p.table, get().seatId),
        turnDeadlineMs: p.table.turnDeadlineMs ?? null,
      });
      return;
    }

    if (p.type === "turn_timer") {
      set({
        turnDeadlineMs: p.deadlineMs ?? null,
        timeBankSec: p.timeBankSec ?? get().timeBankSec,
      });
      return;
    }

    if (p.type === "hand_event") {
      const snap = p.publicSnapshot;
      const ev = p.event;
      if (!snap || !ev) return;

      const mySeatId = get().seatId;
      let draft = get().currentHandDraft;
      let history = get().handHistory;
      const logs = [...get().lastActionLog];

      if (ev.type === "hand-started") {
        const handNumber = snap.handNumber || history.length + 1;
        draft = emptyHandDraft({
          id: ev.handId || `hand_${handNumber}_${Date.now()}`,
          handNumber,
          handId: ev.handId,
        });
        pushLine(draft, "meta", `—— 第 ${handNumber} 手開始 ——`);
        logs.push(`第 ${handNumber} 手開始`);
        set({ tableFx: null });
      }

      if (ev.type === "street") {
        if (!draft) {
          draft = emptyHandDraft({
            id: `hand_live_${snap.handNumber || Date.now()}`,
            handNumber: snap.handNumber || history.length + 1,
            handId: `unknown_${Date.now()}`,
            potTotal: snap.potTotal ?? 0,
          });
        }
        draft.board = ev.board.slice();
        const cards = ev.board.map(formatCardCode).join(" ");
        const text = `${streetLabelZh(ev.street)}：${cards}`;
        pushLine(draft, "street", text);
        logs.push(text);
      }

      if (ev.type === "action") {
        if (!draft) {
          draft = emptyHandDraft({
            id: `hand_live_${snap.handNumber || Date.now()}`,
            handNumber: snap.handNumber || history.length + 1,
            handId: `unknown_${Date.now()}`,
            board: snap.board ?? [],
            potTotal: snap.potTotal ?? 0,
          });
        }
        const who = whoName(ev.action.seatId, mySeatId, snap);
        const text = formatActionLine(ev.action, who);
        pushLine(draft, "action", text);
        logs.push(text);
        if (ev.action.type === "all-in") {
          set({
            tableFx: {
              kind: "allin",
              seatIds: [ev.action.seatId],
              until: Date.now() + 2200,
            },
          });
        }
        if (typeof window !== "undefined") {
          void import("@/lib/poker/sfx").then(({ pokerSfx }) => {
            const t = ev.action.type;
            if (t === "fold") pokerSfx.fold();
            else if (t === "check") pokerSfx.check();
            else if (t === "call") pokerSfx.call();
            else pokerSfx.raise();
          });
        }
      }

      let nextFx = get().tableFx;
      if (ev.type === "hand-complete") {
        get().bumpHandComplete();
        if (!draft) {
          draft = emptyHandDraft({
            id: ev.handId || `hand_${snap.handNumber || Date.now()}`,
            handNumber: snap.handNumber || history.length + 1,
            handId: ev.handId,
            summary: "",
          });
        }
        const seatResults = mergeSeatHoleCardsFromSnapshot(
          ev.seats ?? [],
          snap,
          mySeatId,
        );
        draft.board = ev.board.slice();
        draft.winners = ev.winners.slice();
        draft.seats = seatResults;
        draft.potTotal = ev.potTotal;
        draft.showdown = ev.showdown;
        draft.completed = true;
        if (ev.board.length) {
          const boardText = `公牌 ${ev.board.map(formatCardCode).join(" ")}`;
          if (!draft.lines.some((l) => l.text.startsWith("公牌"))) {
            pushLine(draft, "street", boardText);
          }
        }
        const winText = formatWinnersSummary(
          ev.winners,
          mySeatId,
          seatResults,
        );
        pushLine(draft, "result", winText);
        pushLine(
          draft,
          "meta",
          `—— 第 ${draft.handNumber} 手結束 · 底池 ${ev.potTotal.toLocaleString()} ——`,
        );
        draft.summary = buildHandSummary(
          draft.handNumber,
          ev.winners,
          mySeatId,
          seatResults,
        );
        logs.push(winText);
        logs.push(`—— 第 ${draft.handNumber} 手結束 ——`);
        history = [draft, ...history].slice(0, 40);
        draft = null;
        nextFx = {
          kind: "win",
          seatIds: ev.winners.map((w) => w.seatId),
          until: Date.now() + (ev.board.length >= 3 ? 5000 : 2800),
          summary: winText,
        };
        if (typeof window !== "undefined") {
          void import("@/lib/poker/sfx").then(({ pokerSfx }) => pokerSfx.win());
        }
      }

      if (logs.length > 80) logs.splice(0, logs.length - 80);

      set({
        table: preserveOwnHoleCards(get().table, snap, mySeatId),
        lastActionLog: logs,
        currentHandDraft: draft,
        handHistory: history,
        turnDeadlineMs: snap.turnDeadlineMs ?? get().turnDeadlineMs,
        ...(nextFx ? { tableFx: nextFx } : {}),
      });
    }
  },
}));

export type JoinTableArgs = {
  tier: TableTierId;
  buyIn: number;
  name?: string;
  avatarUrl?: string | null;
  /** 指定固定牌桌 roomId */
  roomId?: string;
};

export type ActionArgs = {
  type: PlayerActionType;
  amount?: number;
};

/** 房間廣播不含底牌時，保留自己座位上已有的 holeCards，避免被蓋掉 */
function preserveOwnHoleCards(
  prev: PublicHandSnapshot | null,
  next: PublicHandSnapshot,
  seatId: string | null,
): PublicHandSnapshot {
  if (!seatId || !prev) return next;
  const prevSeat = prev.seats.find((s) => s.seatId === seatId);
  if (!prevSeat?.holeCards?.length) return next;
  return {
    ...next,
    seats: next.seats.map((s) => {
      if (s.seatId !== seatId) return s;
      if (s.holeCards?.length) return s;
      return { ...s, holeCards: prevSeat.holeCards };
    }),
  };
}
