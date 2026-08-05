"use client";

import { create } from "zustand";
import type {
  PublicHandSnapshot,
  PublicTableState,
} from "@/lib/poker/public-types";
import type { PlayerActionType, TableTierId } from "@/lib/poker/types";
import type { TableTierConfig } from "@/lib/poker/types";

export type PokerConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "in_table"
  | "error";

type PokerStore = {
  status: PokerConnectionStatus;
  error: string | null;
  wsUrl: string;
  pointsBalance: number | null;
  tiers: TableTierConfig[];
  lobby: PublicTableState[];
  table: PublicHandSnapshot | null;
  seatId: string | null;
  roomId: string | null;
  lastActionLog: string[];
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
  setStatus: (s: PokerConnectionStatus) => void;
  setLobby: (lobby: PublicTableState[]) => void;
  applyPokerEvent: (payload: unknown) => void;
  setJoined: (roomId: string, seatId: string) => void;
  resetTable: () => void;
  bumpHandComplete: () => void;
};

export const usePokerStore = create<PokerStore>((set, get) => ({
  status: "idle",
  error: null,
  wsUrl: "http://localhost:3101",
  pointsBalance: null,
  tiers: [],
  lobby: [],
  table: null,
  seatId: null,
  roomId: null,
  lastActionLog: [],
  handsThisSession: 0,
  handsSincePlaytimeTick: 0,
  turnDeadlineMs: null,
  timeBankSec: 30,

  setMeta: (p) => set(p),
  setError: (error) => set({ error, status: error ? "error" : get().status }),
  setStatus: (status) => set({ status }),
  setLobby: (lobby) => set({ lobby }),

  setJoined: (roomId, seatId) =>
    set({ roomId, seatId, status: "in_table", error: null }),

  resetTable: () =>
    set({
      table: null,
      seatId: null,
      roomId: null,
      turnDeadlineMs: null,
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
      event?: { type: string; action?: { type: string; seatId: string; amount: number } };
      publicSnapshot?: PublicHandSnapshot;
      seatId?: string;
      deadlineMs?: number;
      timeBankSec?: number;
    };

    if (p.type === "error") {
      set({ error: p.message ?? "錯誤" });
      return;
    }

    if (p.type === "table_state" && p.table) {
      set({
        table: p.table,
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
      if (snap) {
        const logs = [...get().lastActionLog];
        if (p.event?.type === "action" && p.event.action) {
          const a = p.event.action;
          logs.push(
            `${a.seatId.slice(-4)} ${a.type}${a.amount ? ` ${a.amount}` : ""}`,
          );
          if (logs.length > 40) logs.shift();
          if (typeof window !== "undefined") {
            void import("@/lib/poker/sfx").then(({ pokerSfx }) => {
              if (a.type === "fold") pokerSfx.fold();
              else if (a.type === "check") pokerSfx.check();
              else if (a.type === "call") pokerSfx.call();
              else pokerSfx.raise();
            });
          }
        }
        if (p.event?.type === "hand-complete") {
          get().bumpHandComplete();
          if (typeof window !== "undefined") {
            void import("@/lib/poker/sfx").then(({ pokerSfx }) => pokerSfx.win());
          }
        }
        set({
          table: snap,
          lastActionLog: logs,
          turnDeadlineMs: snap.turnDeadlineMs ?? get().turnDeadlineMs,
        });
      }
    }
  },
}));

export type JoinTableArgs = {
  tier: TableTierId;
  buyIn: number;
  name?: string;
};

export type ActionArgs = {
  type: PlayerActionType;
  amount?: number;
};
