/**
 * 24/7 牌桌編排：記憶體房間狀態 + AI 補位／離席
 * Redis 可在後續以相同介面替換 ActiveTableStore。
 */

import { randomBytes } from "node:crypto";
import {
  PokerHandEngine,
  nextButtonSeatIndex,
  type EngineEvent,
} from "./engine";
import { decideBotAction, BOT_NAME_POOL } from "./ai-bot";
import {
  botsNeededToFill,
  botProfileForTier,
  humanizedBotDelayMs,
} from "./orchestration";
import {
  TABLE_TIERS,
  TURN_TIMER_SECONDS,
  TIME_BANK_SECONDS,
  MAX_SEATS,
  type AiBotProfileId,
  type HandSnapshot,
  type PlayerActionType,
  type TableTierId,
} from "./types";
import { evaluateHand, isPairOrBetter } from "./hand-evaluator";

import type {
  PublicHandSnapshot,
  PublicSeat,
  PublicTableState,
  OccupantKind,
} from "./public-types";

export type { PublicHandSnapshot, PublicSeat, PublicTableState, OccupantKind };

export interface TableOccupant {
  seatId: string;
  seatIndex: number;
  kind: OccupantKind;
  /** auth user id（真人） */
  userId?: string;
  pokerUserId?: string;
  name: string;
  avatarUrl?: string | null;
  stack: number;
  botProfile?: AiBotProfileId;
  sittingOut: boolean;
  leaveAfterHand: boolean;
  /** 剩餘 time bank（秒） */
  timeBankSec: number;
  socketId?: string;
}

export interface ActiveTable {
  roomId: string;
  code: string;
  tier: TableTierId;
  smallBlind: number;
  bigBlind: number;
  minBuyIn: number;
  maxBuyIn: number;
  maxSeats: number;
  occupants: TableOccupant[];
  buttonSeatIndex: number;
  handNumber: number;
  engine: PokerHandEngine | null;
  /** 當前行動倒數截止時間戳 */
  turnDeadlineMs: number | null;
  /** 本手開始時的 stack 快照（結算用） */
  startingStacks: Map<string, number>;
  /** 手牌統計暫存 */
  handMeta: {
    foldPreflopSeatIds: string[];
    allInSeatIds: string[];
  };
}

export type TableBroadcast =
  | { type: "table_state"; table: PublicTableState }
  | { type: "hand_event"; event: EngineEvent; publicSnapshot: PublicHandSnapshot }
  | { type: "turn_timer"; seatId: string; deadlineMs: number; timeBankSec: number }
  | { type: "error"; message: string };

function newId(prefix: string): string {
  return `${prefix}_${randomBytes(6).toString("hex")}`;
}

function roomCode(tier: TableTierId): string {
  return `${tier.toLowerCase()}-${randomBytes(2).toString("hex")}`;
}

export class TableOrchestrator {
  private tables = new Map<string, ActiveTable>();
  private userToRoom = new Map<string, string>();
  private botTimers = new Map<string, NodeJS.Timeout>();
  private turnTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly emit: (roomId: string, payload: TableBroadcast) => void,
    private readonly emitToSocket?: (
      socketId: string,
      payload: TableBroadcast,
    ) => void,
    private readonly onHandComplete?: (
      table: ActiveTable,
      ev: Extract<EngineEvent, { type: "hand-complete" }>,
    ) => void,
  ) {
    for (const tier of Object.keys(TABLE_TIERS) as TableTierId[]) {
      this.ensureOpenTable(tier);
    }
  }

  listLobby(): PublicTableState[] {
    return [...this.tables.values()].map((t) => this.toPublic(t));
  }

  getTable(roomId: string): ActiveTable | undefined {
    return this.tables.get(roomId);
  }

  ensureOpenTable(tier: TableTierId): ActiveTable {
    const existing = this.findJoinableTable(tier);
    if (existing) return existing;
    const table = this.createEmptyTable(tier);
    this.fillBots(table);
    this.broadcast(table);
    return table;
  }

  private findJoinableTable(tier: TableTierId): ActiveTable | undefined {
    return [...this.tables.values()].find(
      (t) =>
        t.tier === tier &&
        this.nextFreeSeat(t) !== null &&
        t.occupants.filter((o) => o.kind === "HUMAN").length < t.maxSeats,
    );
  }

  private createEmptyTable(tier: TableTierId): ActiveTable {
    const cfg = TABLE_TIERS[tier];
    const table: ActiveTable = {
      roomId: newId("room"),
      code: roomCode(tier),
      tier,
      smallBlind: cfg.smallBlind,
      bigBlind: cfg.bigBlind,
      minBuyIn: cfg.minBuyIn,
      maxBuyIn: cfg.maxBuyIn,
      maxSeats: MAX_SEATS,
      occupants: [],
      buttonSeatIndex: 0,
      handNumber: 0,
      engine: null,
      turnDeadlineMs: null,
      startingStacks: new Map(),
      handMeta: { foldPreflopSeatIds: [], allInSeatIds: [] },
    };
    this.tables.set(table.roomId, table);
    return table;
  }

  joinHuman(opts: {
    tier: TableTierId;
    userId: string;
    pokerUserId: string;
    name: string;
    avatarUrl?: string | null;
    buyIn: number;
    socketId: string;
  }): { table: ActiveTable; seat: TableOccupant } {
    if (this.userToRoom.has(opts.userId)) {
      const rid = this.userToRoom.get(opts.userId)!;
      const t = this.tables.get(rid);
      const seat = t?.occupants.find((o) => o.userId === opts.userId);
      if (t && seat) {
        seat.socketId = opts.socketId;
        return { table: t, seat };
      }
    }

    const cfg = TABLE_TIERS[opts.tier];
    if (opts.buyIn < cfg.minBuyIn || opts.buyIn > cfg.maxBuyIn) {
      throw new Error(
        `買入需介於 ${cfg.minBuyIn}–${cfg.maxBuyIn}`,
      );
    }

    let target = this.findJoinableTable(opts.tier);
    if (!target) {
      target = this.createEmptyTable(opts.tier);
    }

    const seatIndex = this.nextFreeSeat(target);
    if (seatIndex === null) {
      target = this.createEmptyTable(opts.tier);
    }
    const idx = this.nextFreeSeat(target);
    if (idx === null) throw new Error("無法分配座位");

    for (const o of target.occupants) {
      if (o.kind === "AI_BOT") o.leaveAfterHand = true;
    }

    const seat: TableOccupant = {
      seatId: newId("seat"),
      seatIndex: idx,
      kind: "HUMAN",
      userId: opts.userId,
      pokerUserId: opts.pokerUserId,
      name: opts.name,
      avatarUrl: opts.avatarUrl,
      stack: opts.buyIn,
      sittingOut: false,
      leaveAfterHand: false,
      timeBankSec: TIME_BANK_SECONDS,
      socketId: opts.socketId,
    };
    target.occupants.push(seat);
    this.userToRoom.set(opts.userId, target.roomId);

    this.fillBots(target);
    this.broadcast(target);
    this.maybeStartHand(target);
    return { table: target, seat };
  }

  leaveHuman(userId: string): void {
    const roomId = this.userToRoom.get(userId);
    if (!roomId) return;
    const table = this.tables.get(roomId);
    if (!table) return;

    // 手牌進行中：標記離席，手完再清
    const seat = table.occupants.find((o) => o.userId === userId);
    if (!seat) return;

    if (table.engine && !table.engine.isComplete) {
      seat.leaveAfterHand = true;
      seat.sittingOut = true;
      this.broadcast(table);
      return;
    }

    this.removeOccupant(table, seat.seatId);
    this.userToRoom.delete(userId);
    this.fillBots(table);
    this.broadcast(table);
  }

  applyPlayerAction(
    userId: string,
    type: PlayerActionType,
    amount = 0,
  ): void {
    const roomId = this.userToRoom.get(userId);
    if (!roomId) throw new Error("未入桌");
    const table = this.tables.get(roomId);
    if (!table?.engine) throw new Error("尚無進行中手牌");
    const seat = table.occupants.find((o) => o.userId === userId);
    if (!seat) throw new Error("找不到座位");

    const snap = table.engine.snapshot;
    if (!snap || snap.actingSeatId !== seat.seatId) {
      throw new Error("尚未輪到你");
    }

    this.clearTurnTimer(table.roomId);
    const ev = table.engine.applyAction(seat.seatId, type, amount);
    this.afterEngineEvent(table, ev);
  }

  // ---------------------------------------------------------------------------

  private nextFreeSeat(table: ActiveTable): number | null {
    const used = new Set(table.occupants.map((o) => o.seatIndex));
    for (let i = 0; i < table.maxSeats; i++) {
      if (!used.has(i)) return i;
    }
    return null;
  }

  private fillBots(table: ActiveTable): void {
    const humans = table.occupants.filter((o) => o.kind === "HUMAN").length;
    const occupied = table.occupants.length;
    const need = botsNeededToFill(humans, occupied, table.maxSeats);
    const profile = botProfileForTier(table.tier);
    for (let i = 0; i < need; i++) {
      const seatIndex = this.nextFreeSeat(table);
      if (seatIndex === null) break;
      const name =
        BOT_NAME_POOL[
          Math.floor(Math.random() * BOT_NAME_POOL.length)
        ]!;
      table.occupants.push({
        seatId: newId("bot"),
        seatIndex,
        kind: "AI_BOT",
        name: `${name}_${seatIndex}`,
        stack: Math.floor(
          (table.minBuyIn + table.maxBuyIn) / 2,
        ),
        botProfile: profile,
        sittingOut: false,
        leaveAfterHand: false,
        timeBankSec: TIME_BANK_SECONDS,
      });
    }
  }

  private removeOccupant(table: ActiveTable, seatId: string): void {
    table.occupants = table.occupants.filter((o) => o.seatId !== seatId);
  }

  private maybeStartHand(table: ActiveTable): void {
    if (table.engine && !table.engine.isComplete) return;
    const ready = table.occupants.filter(
      (o) => !o.sittingOut && o.stack >= table.bigBlind,
    );
    if (ready.length < 2) return;

    // 清離席 AI／標記離席者
    table.occupants = table.occupants.filter((o) => {
      if (o.leaveAfterHand && o.kind === "AI_BOT") return false;
      if (o.leaveAfterHand && o.kind === "HUMAN") {
        if (o.userId) this.userToRoom.delete(o.userId);
        return false;
      }
      return true;
    });
    this.fillBots(table);

    const players = table.occupants.filter(
      (o) => !o.sittingOut && o.stack >= table.bigBlind,
    );
    if (players.length < 2) {
      this.broadcast(table);
      return;
    }

    table.handNumber += 1;
    table.handMeta = { foldPreflopSeatIds: [], allInSeatIds: [] };
    table.startingStacks = new Map(
      players.map((p) => [p.seatId, p.stack]),
    );
    table.buttonSeatIndex = nextButtonSeatIndex(
      players.map((p) => ({ seatIndex: p.seatIndex, stack: p.stack })),
      table.buttonSeatIndex,
    );

    const engine = new PokerHandEngine();
    table.engine = engine;
    const ev = engine.startHand({
      handId: `${table.roomId}_${table.handNumber}`,
      smallBlind: table.smallBlind,
      bigBlind: table.bigBlind,
      buttonSeatIndex: table.buttonSeatIndex,
      seats: players.map((p) => ({
        seatId: p.seatId,
        seatIndex: p.seatIndex,
        name: p.name,
        stack: p.stack,
        isBot: p.kind === "AI_BOT",
        botProfile: p.botProfile,
      })),
    });
    this.afterEngineEvent(table, ev);
  }

  private afterEngineEvent(table: ActiveTable, ev: EngineEvent): void {
    if (ev.type === "error") {
      this.emit(table.roomId, { type: "error", message: ev.message });
      return;
    }

    // 同步 stack 回 occupant
    const snap =
      ev.type === "hand-started" ||
      ev.type === "action" ||
      ev.type === "street" ||
      ev.type === "hand-complete"
        ? ev.snapshot
        : null;

    if (snap) {
      this.trackMeta(table, snap, ev);
      for (const s of snap.seats) {
        const occ = table.occupants.find((o) => o.seatId === s.seatId);
        if (occ) occ.stack = s.stack;
      }
    }

    this.emit(table.roomId, {
      type: "hand_event",
      event: ev,
      publicSnapshot: this.toPublic(table),
    });
    // 對每位真人發送含自己底牌的視圖
    for (const o of table.occupants) {
      if (o.kind === "HUMAN" && o.socketId && this.emitToSocket) {
        this.emitToSocket(o.socketId, {
          type: "hand_event",
          event: ev,
          publicSnapshot: this.toPublic(table, o.seatId),
        });
      }
    }

    if (ev.type === "hand-complete") {
      this.clearTurnTimer(table.roomId);
      this.onHandComplete?.(table, ev);
      table.engine = null;
      table.turnDeadlineMs = null;
      // 短暫間隔後開下一手
      setTimeout(() => this.maybeStartHand(table), 2500);
      this.broadcast(table);
      return;
    }

    if (snap?.actingSeatId) {
      this.scheduleTurn(table, snap.actingSeatId);
    }
  }

  private trackMeta(
    table: ActiveTable,
    snap: HandSnapshot,
    ev: EngineEvent,
  ): void {
    if (ev.type === "action") {
      if (ev.action.type === "fold" && ev.action.street === "preflop") {
        table.handMeta.foldPreflopSeatIds.push(ev.action.seatId);
      }
      if (ev.action.type === "all-in") {
        table.handMeta.allInSeatIds.push(ev.action.seatId);
      }
    }
    void snap;
  }

  private scheduleTurn(table: ActiveTable, seatId: string): void {
    this.clearTurnTimer(table.roomId);
    const occ = table.occupants.find((o) => o.seatId === seatId);
    if (!occ) return;

    if (occ.kind === "AI_BOT") {
      const delay = humanizedBotDelayMs();
      const timer = setTimeout(() => {
        this.runBot(table, seatId);
      }, delay);
      this.botTimers.set(table.roomId, timer);
      return;
    }

    const deadline = Date.now() + TURN_TIMER_SECONDS * 1000;
    table.turnDeadlineMs = deadline;
    this.emit(table.roomId, {
      type: "turn_timer",
      seatId,
      deadlineMs: deadline,
      timeBankSec: occ.timeBankSec,
    });

    const timer = setTimeout(() => {
      this.onTurnTimeout(table, seatId);
    }, TURN_TIMER_SECONDS * 1000);
    this.turnTimers.set(table.roomId, timer);
  }

  private onTurnTimeout(table: ActiveTable, seatId: string): void {
    if (!table.engine || table.engine.isComplete) return;
    const snap = table.engine.snapshot;
    if (snap?.actingSeatId !== seatId) return;

    const occ = table.occupants.find((o) => o.seatId === seatId);
    if (occ && occ.timeBankSec > 0) {
      // 消耗 time bank 再給一輪
      const use = Math.min(occ.timeBankSec, TURN_TIMER_SECONDS);
      occ.timeBankSec -= use;
      const deadline = Date.now() + use * 1000;
      table.turnDeadlineMs = deadline;
      this.emit(table.roomId, {
        type: "turn_timer",
        seatId,
        deadlineMs: deadline,
        timeBankSec: occ.timeBankSec,
      });
      const timer = setTimeout(() => {
        this.onTurnTimeout(table, seatId);
      }, use * 1000);
      this.turnTimers.set(table.roomId, timer);
      return;
    }

    const ev = table.engine.applyTimeout(seatId);
    this.afterEngineEvent(table, ev);
  }

  private runBot(table: ActiveTable, seatId: string): void {
    if (!table.engine || table.engine.isComplete) return;
    const snap = table.engine.snapshot;
    if (!snap || snap.actingSeatId !== seatId) return;
    const decision = decideBotAction(snap, seatId);
    const ev = table.engine.applyAction(
      seatId,
      decision.type,
      decision.amount,
    );
    this.afterEngineEvent(table, ev);
  }

  private clearTurnTimer(roomId: string): void {
    const t = this.turnTimers.get(roomId);
    if (t) clearTimeout(t);
    this.turnTimers.delete(roomId);
    const b = this.botTimers.get(roomId);
    if (b) clearTimeout(b);
    this.botTimers.delete(roomId);
  }

  private broadcast(table: ActiveTable): void {
    this.emit(table.roomId, {
      type: "table_state",
      table: this.toPublic(table),
    });
  }

  toPublic(table: ActiveTable, viewerSeatId?: string): PublicHandSnapshot {
    const engineSnap = table.engine?.snapshot;
    const seats: PublicSeat[] = table.occupants.map((o) => {
      const eng = engineSnap?.seats.find((s) => s.seatId === o.seatId);
      const showCards =
        viewerSeatId === o.seatId ||
        (engineSnap?.street === "complete" && eng && !eng.folded);
      return {
        seatId: o.seatId,
        seatIndex: o.seatIndex,
        kind: o.kind,
        name: o.name,
        avatarUrl: o.avatarUrl,
        stack: eng?.stack ?? o.stack,
        sittingOut: o.sittingOut,
        isBot: o.kind === "AI_BOT",
        holeCards: showCards
          ? (eng?.holeCards ?? []).map((c) => c.code)
          : undefined,
        folded: eng?.folded,
        allIn: eng?.allIn,
        streetCommitted: eng?.streetCommitted,
        committed: eng?.committed,
      };
    });

    return {
      roomId: table.roomId,
      code: table.code,
      tier: table.tier,
      smallBlind: table.smallBlind,
      bigBlind: table.bigBlind,
      minBuyIn: table.minBuyIn,
      maxBuyIn: table.maxBuyIn,
      handNumber: table.handNumber,
      buttonSeatIndex: table.buttonSeatIndex,
      seats,
      street: engineSnap?.street,
      board: engineSnap?.board.map((c) => c.code),
      potTotal: engineSnap?.potTotal,
      currentBet: engineSnap?.currentBet,
      minRaiseTo: engineSnap?.minRaiseTo,
      actingSeatId: engineSnap?.actingSeatId,
      turnDeadlineMs: table.turnDeadlineMs,
      yourSeatId: viewerSeatId,
    };
  }

  /** 供任務追蹤：手牌結束後的真人結果 */
  extractHumanHandResults(table: ActiveTable, ev: EngineEvent): Array<{
    userId: string;
    won: boolean;
    pairOrBetter: boolean;
    foldedPreflop: boolean;
    wentAllIn: boolean;
  }> {
    if (ev.type !== "hand-complete") return [];
    const snap = ev.snapshot;
    const results = [];
    for (const o of table.occupants) {
      if (o.kind !== "HUMAN" || !o.userId) continue;
      const seat = snap.seats.find((s) => s.seatId === o.seatId);
      if (!seat) continue;
      const won = (ev.winners.get(o.seatId) ?? 0) > 0;
      let pairOrBetter = false;
      if (!seat.folded && snap.board.length >= 3) {
        try {
          const hand = evaluateHand([...seat.holeCards, ...snap.board]);
          pairOrBetter = isPairOrBetter(hand) && won;
        } catch {
          /* ignore */
        }
      }
      results.push({
        userId: o.userId,
        won,
        pairOrBetter,
        foldedPreflop: table.handMeta.foldPreflopSeatIds.includes(o.seatId),
        wentAllIn: table.handMeta.allInSeatIds.includes(o.seatId),
      });
    }
    return results;
  }
}
