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
import { decideBotAction } from "./ai-bot";
import {
  botProfileForTier,
  humanizedBotDelayMs,
} from "./orchestration";
import {
  getPokerVirtualRoster,
  pokerBotProfileForPlayer,
  resolvePokerVirtualAvatar,
  randomVirtualStayMs,
} from "./virtual-roster";
import {
  TABLE_TIERS,
  TURN_TIMER_SECONDS,
  TIME_BANK_SECONDS,
  MAX_SEATS,
  MIN_BOTS_AT_TABLE,
  TABLES_PER_TIER,
  TARGET_BOTS_MIN,
  TARGET_BOTS_MAX,
  AFK_MISSED_TURNS_TO_REST,
  AFK_REST_MS,
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
import {
  serializeEngineEvent,
  type PublicEngineEvent,
} from "./hand-history";
import {
  applyHandDeltas,
  computeHandHudDeltas,
  emptyHudAccum,
  toPublicHud,
  type SeatHudAccum,
} from "./hud-stats";

export type { PublicHandSnapshot, PublicSeat, PublicTableState, OccupantKind };
export type { PublicEngineEvent };

export interface TableOccupant {
  seatId: string;
  seatIndex: number;
  kind: OccupantKind;
  /** auth user id（真人） */
  userId?: string;
  pokerUserId?: string;
  name: string;
  avatarUrl?: string | null;
  /** 平台虛擬玩家 id（牌桌對手），用於頭像／釋放池 */
  virtualPlayerId?: string;
  stack: number;
  botProfile?: AiBotProfileId;
  sittingOut: boolean;
  leaveAfterHand: boolean;
  /** 連續因逾時自動過牌／蓋牌的次數 */
  missedTurns: number;
  /** AFK 休息截止（毫秒時間戳）；到期未回來則自動離桌 */
  restUntilMs: number | null;
  /** 虛擬對手入座時間（用於慢速換人） */
  seatedAtMs?: number;
  /** 最短停留毫秒，到期後才可能離桌換人 */
  minStayMs?: number;
  /** 剩餘 time bank（秒） */
  timeBankSec: number;
  socketId?: string;
  /** 本桌入座起累計的風格統計 */
  sessionHud: SeatHudAccum;
}

export interface ActiveTable {
  roomId: string;
  code: string;
  tier: TableTierId;
  /** 同額度固定桌號 0 .. TABLES_PER_TIER-1 */
  slotIndex: number;
  labelZh: string;
  smallBlind: number;
  bigBlind: number;
  minBuyIn: number;
  maxBuyIn: number;
  maxSeats: number;
  /**
   * 本桌目標對手人數（建立時隨機 5–9，之後固定）
   */
  botTarget: number;
  occupants: TableOccupant[];
  /** 滿桌／手牌中無法立刻入座時的排隊名單 */
  waitQueue: WaitQueueEntry[];
  buttonSeatIndex: number;
  handNumber: number;
  engine: PokerHandEngine | null;
  /** 手牌剛結束時保留快照，避免公牌／攤牌瞬間被清空 */
  lastCompleteSnapshot: HandSnapshot | null;
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

export type WaitQueueEntry = {
  userId: string;
  pokerUserId: string;
  name: string;
  avatarUrl?: string | null;
  buyIn: number;
  socketId: string;
  joinedQueueAt: number;
};

export type JoinHumanResult =
  | { status: "seated"; table: ActiveTable; seat: TableOccupant }
  | {
      status: "queued";
      table: ActiveTable;
      position: number;
      queueCount: number;
    };

const MAX_QUEUE_PER_TABLE = 9;

export type TableBroadcast =
  | { type: "table_state"; table: PublicTableState }
  | {
      type: "hand_event";
      event: PublicEngineEvent;
      publicSnapshot: PublicHandSnapshot;
    }
  | { type: "turn_timer"; seatId: string; deadlineMs: number; timeBankSec: number }
  | {
      type: "left_table";
      ok: boolean;
      roomId?: string;
      stack: number;
      cashedOut: number;
      message?: string;
    }
  | {
      type: "queued";
      roomId: string;
      code: string;
      labelZh: string;
      position: number;
      queueCount: number;
    }
  | {
      type: "queue_admitted";
      roomId: string;
      seatId: string;
      table: PublicTableState;
    }
  | { type: "queue_cancelled"; roomId?: string; buyIn: number }
  | {
      type: "top_up_ok";
      amount: number;
      stack: number;
      roomId: string;
    }
  | {
      type: "afk_rest";
      restUntilMs: number;
      message: string;
    }
  | { type: "error"; message: string };

function randomBotTarget(): number {
  return (
    TARGET_BOTS_MIN +
    Math.floor(Math.random() * (TARGET_BOTS_MAX - TARGET_BOTS_MIN + 1))
  );
}

function newId(prefix: string): string {
  return `${prefix}_${randomBytes(6).toString("hex")}`;
}

function stableRoomId(tier: TableTierId, slotIndex: number): string {
  return `room_${tier}_${slotIndex}`;
}

function roomCode(tier: TableTierId, slotIndex: number): string {
  return `${tier.toLowerCase()}-t${slotIndex + 1}`;
}

function tableLabelZh(slotIndex: number): string {
  return `第 ${slotIndex + 1} 桌`;
}

export class TableOrchestrator {
  private tables = new Map<string, ActiveTable>();
  private userToRoom = new Map<string, string>();
  /** 排隊中：userId → roomId */
  private userToQueue = new Map<string, string>();
  private botTimers = new Map<string, NodeJS.Timeout>();
  private turnTimers = new Map<string, NodeJS.Timeout>();
  private runoutTimers = new Map<string, NodeJS.Timeout>();
  private nextHandTimers = new Map<string, NodeJS.Timeout>();
  /** AFK 休息到期自動離桌 */
  private restLeaveTimers = new Map<string, NodeJS.Timeout>();
  /** 全下中請求離桌：等本手結束後兌現 */
  private pendingLeaveResolvers = new Map<
    string,
    (result: { roomId: string; stack: number } | null) => void
  >();
  /** 全站已入座的虛擬玩家 id（同一人不同時出現在多桌） */
  private claimedVirtualIds = new Set<string>();

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
    private readonly onLobbyChanged?: () => void,
    /** AFK 休息到期離桌後，由伺服器兌現積分並通知客戶端 */
    private readonly onHumanAutoLeave?: (
      userId: string,
      left: { roomId: string; stack: number },
      reason: string,
    ) => void,
  ) {
    for (const tier of Object.keys(TABLE_TIERS) as TableTierId[]) {
      this.ensureTierTables(tier);
    }
    /* 兩輪補位：先湊每桌下限，再補到各桌目標人數 */
    this.rebalanceVirtualSeating();
    /* 建構完成後再廣播大廳，避免 onLobbyChanged 閉包尚未賦值 */
  }

  /** 優先讓每桌達到最少人數，再依 botTarget 補齊 */
  private rebalanceVirtualSeating(): void {
    const tables = [...this.tables.values()].sort(
      (a, b) => a.slotIndex - b.slotIndex || a.tier.localeCompare(b.tier),
    );
    for (const t of tables) {
      if (t.botTarget < TARGET_BOTS_MIN || t.botTarget > TARGET_BOTS_MAX) {
        t.botTarget = randomBotTarget();
      }
      const saved = t.botTarget;
      t.botTarget = TARGET_BOTS_MIN;
      this.fillBots(t);
      t.botTarget = saved;
    }
    for (const t of tables) {
      this.fillBots(t);
    }
  }

  listLobby(): PublicTableState[] {
    /* 每次列出大廳都強制補齊 4 桌／額度並依目標人數補位 */
    for (const tier of Object.keys(TABLE_TIERS) as TableTierId[]) {
      this.ensureTierTables(tier);
    }
    return [...this.tables.values()]
      .map((t) => this.toPublic(t))
      .sort((a, b) => {
        const tierOrder = ["MICRO", "LOW", "MID", "HIGH"];
        const ta = tierOrder.indexOf(a.tier);
        const tb = tierOrder.indexOf(b.tier);
        if (ta !== tb) return ta - tb;
        return a.slotIndex - b.slotIndex;
      });
  }

  getTable(roomId: string): ActiveTable | undefined {
    return this.tables.get(roomId);
  }

  /** 每個額度固定維持 TABLES_PER_TIER 張桌，並湊滿對手 */
  ensureTierTables(tier: TableTierId): void {
    /* 清掉同額度、非固定桌號的舊桌（無人時） */
    for (const [id, t] of [...this.tables.entries()]) {
      if (t.tier !== tier) continue;
      const stable = id === stableRoomId(tier, t.slotIndex);
      const hasHuman = t.occupants.some((o) => o.kind === "HUMAN");
      if (!stable && !hasHuman) {
        this.clearTurnTimer(id);
        this.tables.delete(id);
      }
    }

    for (let slot = 0; slot < TABLES_PER_TIER; slot++) {
      const id = stableRoomId(tier, slot);
      let table = this.tables.get(id);
      if (!table) {
        table = this.createEmptyTable(tier, slot);
      } else {
        /* 修正舊資料缺欄 */
        table.slotIndex = slot;
        table.labelZh = tableLabelZh(slot);
        table.code = roomCode(tier, slot);
        if (!table.botTarget || table.botTarget < TARGET_BOTS_MIN) {
          table.botTarget = randomBotTarget();
        }
      }
      this.fillBots(table);
    }
  }

  /** @deprecated 改用 ensureTierTables；保留相容 */
  ensureOpenTable(tier: TableTierId): ActiveTable {
    this.ensureTierTables(tier);
    return this.findJoinableTable(tier) ?? this.tables.get(stableRoomId(tier, 0))!;
  }

  private notifyLobby(): void {
    /* 延遲一拍，避免建構／賦值期間 callback 讀到 undefined */
    queueMicrotask(() => {
      try {
        this.onLobbyChanged?.();
      } catch (e) {
        console.error("[poker] lobby broadcast failed", e);
      }
    });
  }

  private tableStats(table: ActiveTable): {
    humans: number;
    bots: number;
  } {
    let humans = 0;
    let bots = 0;
    for (const o of table.occupants) {
      if (o.kind === "HUMAN") humans += 1;
      else bots += 1;
    }
    return { humans, bots };
  }

  private canJoinTable(table: ActiveTable): boolean {
    if (this.nextFreeSeat(table) !== null) return true;
    const { bots } = this.tableStats(table);
    if (table.engine && !table.engine.isComplete) return false;
    /* 踢 AI 後仍須 ≥ MIN_BOTS */
    return bots > MIN_BOTS_AT_TABLE;
  }

  private findJoinableTable(tier: TableTierId): ActiveTable | undefined {
    return [...this.tables.values()]
      .filter((t) => t.tier === tier)
      .sort((a, b) => a.slotIndex - b.slotIndex)
      .find((t) => this.canJoinTable(t));
  }

  /** 同額度中排隊最短的桌（滿桌時用） */
  private findShortestQueueTable(tier: TableTierId): ActiveTable | undefined {
    const list = [...this.tables.values()]
      .filter((t) => t.tier === tier)
      .sort(
        (a, b) =>
          a.waitQueue.length - b.waitQueue.length ||
          a.slotIndex - b.slotIndex,
      );
    return list.find((t) => t.waitQueue.length < MAX_QUEUE_PER_TABLE);
  }

  private createEmptyTable(tier: TableTierId, slotIndex: number): ActiveTable {
    const cfg = TABLE_TIERS[tier];
    const table: ActiveTable = {
      roomId: stableRoomId(tier, slotIndex),
      code: roomCode(tier, slotIndex),
      tier,
      slotIndex,
      labelZh: tableLabelZh(slotIndex),
      smallBlind: cfg.smallBlind,
      bigBlind: cfg.bigBlind,
      minBuyIn: cfg.minBuyIn,
      maxBuyIn: cfg.maxBuyIn,
      maxSeats: MAX_SEATS,
      botTarget: randomBotTarget(),
      occupants: [],
      waitQueue: [],
      buttonSeatIndex: 0,
      handNumber: 0,
      engine: null,
      lastCompleteSnapshot: null,
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
    /** 指定要進入的固定牌桌 */
    roomId?: string;
  }): JoinHumanResult {
    if (this.userToRoom.has(opts.userId)) {
      const rid = this.userToRoom.get(opts.userId)!;
      const t = this.tables.get(rid);
      const seat = t?.occupants.find((o) => o.userId === opts.userId);
      if (t && seat) {
        seat.socketId = opts.socketId;
        return { status: "seated", table: t, seat };
      }
    }

    /* 已在排隊：更新連線，或改排另一桌 */
    const queuedRoom = this.userToQueue.get(opts.userId);
    if (queuedRoom) {
      const qt = this.tables.get(queuedRoom);
      const entry = qt?.waitQueue.find((e) => e.userId === opts.userId);
      if (qt && entry) {
        if (!opts.roomId || opts.roomId === queuedRoom) {
          entry.socketId = opts.socketId;
          entry.name = opts.name;
          entry.avatarUrl = opts.avatarUrl;
          const position =
            qt.waitQueue.findIndex((e) => e.userId === opts.userId) + 1;
          return {
            status: "queued",
            table: qt,
            position,
            queueCount: qt.waitQueue.length,
          };
        }
        this.removeFromQueue(opts.userId);
      }
    }

    const cfg = TABLE_TIERS[opts.tier];
    if (opts.buyIn < cfg.minBuyIn || opts.buyIn > cfg.maxBuyIn) {
      throw new Error(
        `買入需介於 ${cfg.minBuyIn}–${cfg.maxBuyIn}`,
      );
    }

    this.ensureTierTables(opts.tier);

    let target: ActiveTable | undefined;
    if (opts.roomId) {
      target = this.tables.get(opts.roomId);
      if (!target || target.tier !== opts.tier) {
        throw new Error("找不到該牌桌");
      }
      if (!this.canJoinTable(target)) {
        return this.enqueueHuman(target, opts);
      }
    } else {
      target = this.findJoinableTable(opts.tier);
      if (!target) {
        target = this.findShortestQueueTable(opts.tier);
        if (!target) {
          throw new Error("此額度牌桌皆已滿且排隊已滿，請稍後再試");
        }
        return this.enqueueHuman(target, opts);
      }
    }

    return this.seatHuman(target, opts);
  }

  private enqueueHuman(
    table: ActiveTable,
    opts: {
      userId: string;
      pokerUserId: string;
      name: string;
      avatarUrl?: string | null;
      buyIn: number;
      socketId: string;
    },
  ): JoinHumanResult {
    if (table.waitQueue.length >= MAX_QUEUE_PER_TABLE) {
      throw new Error("此桌排隊已滿，請選其他桌");
    }
    table.waitQueue.push({
      userId: opts.userId,
      pokerUserId: opts.pokerUserId,
      name: opts.name,
      avatarUrl: opts.avatarUrl,
      buyIn: opts.buyIn,
      socketId: opts.socketId,
      joinedQueueAt: Date.now(),
    });
    this.userToQueue.set(opts.userId, table.roomId);
    const position = table.waitQueue.length;
    this.notifyLobby();
    if (opts.socketId && this.emitToSocket) {
      this.emitToSocket(opts.socketId, {
        type: "queued",
        roomId: table.roomId,
        code: table.code,
        labelZh: table.labelZh,
        position,
        queueCount: table.waitQueue.length,
      });
    }
    return {
      status: "queued",
      table,
      position,
      queueCount: table.waitQueue.length,
    };
  }

  private seatHuman(
    target: ActiveTable,
    opts: {
      userId: string;
      pokerUserId: string;
      name: string;
      avatarUrl?: string | null;
      buyIn: number;
      socketId: string;
    },
  ): JoinHumanResult {
    const idx = this.claimSeatForHuman(target);
    if (idx === null) {
      return this.enqueueHuman(target, opts);
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
      missedTurns: 0,
      restUntilMs: null,
      timeBankSec: TIME_BANK_SECONDS,
      socketId: opts.socketId,
      sessionHud: emptyHudAccum(),
    };
    target.occupants.push(seat);
    this.userToRoom.set(opts.userId, target.roomId);
    this.userToQueue.delete(opts.userId);

    this.fillBots(target);
    this.broadcast(target);
    this.notifyLobby();
    this.maybeStartHand(target);
    return { status: "seated", table: target, seat };
  }

  /**
   * 取消排隊，回傳已預扣的買入（供伺服器退款）
   */
  leaveQueue(userId: string): { roomId: string; buyIn: number } | null {
    const roomId = this.userToQueue.get(userId);
    if (!roomId) return null;
    const table = this.tables.get(roomId);
    if (!table) {
      this.userToQueue.delete(userId);
      return null;
    }
    const entry = table.waitQueue.find((e) => e.userId === userId);
    if (!entry) {
      this.userToQueue.delete(userId);
      return null;
    }
    const buyIn = entry.buyIn;
    this.removeFromQueue(userId);
    this.notifyLobby();
    if (entry.socketId && this.emitToSocket) {
      this.emitToSocket(entry.socketId, {
        type: "queue_cancelled",
        roomId,
        buyIn,
      });
    }
    return { roomId, buyIn };
  }

  private removeFromQueue(userId: string): void {
    const roomId = this.userToQueue.get(userId);
    if (!roomId) return;
    const table = this.tables.get(roomId);
    if (table) {
      table.waitQueue = table.waitQueue.filter((e) => e.userId !== userId);
    }
    this.userToQueue.delete(userId);
  }

  /** 有空位時依序讓排隊玩家入座 */
  private tryPromoteFromQueue(table: ActiveTable): void {
    while (table.waitQueue.length > 0 && this.canJoinTable(table)) {
      const entry = table.waitQueue[0]!;
      if (this.userToRoom.has(entry.userId)) {
        table.waitQueue.shift();
        this.userToQueue.delete(entry.userId);
        continue;
      }
      const idx = this.claimSeatForHuman(table);
      if (idx === null) break;

      table.waitQueue.shift();
      this.userToQueue.delete(entry.userId);

      const seat: TableOccupant = {
        seatId: newId("seat"),
        seatIndex: idx,
        kind: "HUMAN",
        userId: entry.userId,
        pokerUserId: entry.pokerUserId,
        name: entry.name,
        avatarUrl: entry.avatarUrl,
        stack: entry.buyIn,
        sittingOut: false,
        leaveAfterHand: false,
        missedTurns: 0,
        restUntilMs: null,
        timeBankSec: TIME_BANK_SECONDS,
        socketId: entry.socketId,
        sessionHud: emptyHudAccum(),
      };
      table.occupants.push(seat);
      this.userToRoom.set(entry.userId, table.roomId);

      if (entry.socketId && this.emitToSocket) {
        this.emitToSocket(entry.socketId, {
          type: "queue_admitted",
          roomId: table.roomId,
          seatId: seat.seatId,
          table: this.toPublic(table, seat.seatId),
        });
      }
    }

    /* 通知仍在排隊者更新順位 */
    for (let i = 0; i < table.waitQueue.length; i++) {
      const e = table.waitQueue[i]!;
      if (e.socketId && this.emitToSocket) {
        this.emitToSocket(e.socketId, {
          type: "queued",
          roomId: table.roomId,
          code: table.code,
          labelZh: table.labelZh,
          position: i + 1,
          queueCount: table.waitQueue.length,
        });
      }
    }
  }

  leaveHuman(userId: string): void {
    void this.settleLeaveWithStackAsync(userId);
  }

  /**
   * 結算離桌（同步捷徑）。全下中會改走非同步等待，此處可能回傳 null。
   * 伺服器請改用 settleLeaveWithStackAsync。
   */
  settleLeaveWithStack(
    userId: string,
  ): { roomId: string; stack: number } | null {
    const roomId = this.userToRoom.get(userId);
    if (!roomId) return null;
    const table = this.tables.get(roomId);
    if (!table) return null;
    const seat = table.occupants.find((o) => o.userId === userId);
    if (!seat) return null;

    if (table.engine && !table.engine.isComplete) {
      const eng = table.engine.snapshot?.seats.find(
        (s) => s.seatId === seat.seatId,
      );
      /* 全下爭池中不可蓋牌離桌，交由 async 等待本手結束 */
      if (eng && !eng.folded && eng.allIn) {
        seat.leaveAfterHand = true;
        return null;
      }
      if (eng && !eng.folded) {
        this.clearTurnTimer(table.roomId);
        this.clearRunoutTimer(table.roomId);
        const events = table.engine.forceFold(seat.seatId);
        this.dispatchEngineEvents(table, events);
      }
    }

    return this.forceLeaveWithStack(userId);
  }

  /**
   * 離桌並取得最終兌現籌碼：
   * - 一般情況：強制蓋牌後立刻離席，回傳剩餘籌碼
   * - 全下中：等本手攤牌結束，再以結算後籌碼離席
   */
  settleLeaveWithStackAsync(
    userId: string,
  ): Promise<{ roomId: string; stack: number } | null> {
    const roomId = this.userToRoom.get(userId);
    if (!roomId) return Promise.resolve(null);
    const table = this.tables.get(roomId);
    if (!table) return Promise.resolve(null);
    const seat = table.occupants.find((o) => o.userId === userId);
    if (!seat) return Promise.resolve(null);

    if (table.engine && !table.engine.isComplete) {
      const eng = table.engine.snapshot?.seats.find(
        (s) => s.seatId === seat.seatId,
      );
      if (eng && !eng.folded && eng.allIn) {
        seat.leaveAfterHand = true;
        return new Promise((resolve) => {
          const prev = this.pendingLeaveResolvers.get(userId);
          if (prev) prev(null);

          let settled = false;
          const finish = (
            result: { roomId: string; stack: number } | null,
          ) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            this.pendingLeaveResolvers.delete(userId);
            resolve(result);
          };

          const timer = setTimeout(() => {
            finish(this.forceLeaveWithStack(userId));
          }, 25_000);

          this.pendingLeaveResolvers.set(userId, finish);
        });
      }
      if (eng && !eng.folded) {
        this.clearTurnTimer(table.roomId);
        this.clearRunoutTimer(table.roomId);
        const events = table.engine.forceFold(seat.seatId);
        this.dispatchEngineEvents(table, events);
      }
    }

    return Promise.resolve(this.forceLeaveWithStack(userId));
  }

  /** 玩家是否仍佔有牌桌座位（含手牌進行中） */
  isUserSeated(userId: string): boolean {
    return this.userToRoom.has(userId);
  }

  /** 是否正在排隊等座 */
  isUserQueued(userId: string): boolean {
    return this.userToQueue.has(userId);
  }

  getQueuedBuyIn(userId: string): number | null {
    const roomId = this.userToQueue.get(userId);
    if (!roomId) return null;
    const table = this.tables.get(roomId);
    const entry = table?.waitQueue.find((e) => e.userId === userId);
    return entry?.buyIn ?? null;
  }

  getUserSeatStack(userId: string): number {
    const roomId = this.userToRoom.get(userId);
    if (!roomId) return 0;
    const table = this.tables.get(roomId);
    const seat = table?.occupants.find((o) => o.userId === userId);
    if (!seat) return 0;
    const eng = table?.engine?.snapshot?.seats.find(
      (s) => s.seatId === seat.seatId,
    );
    return eng?.stack ?? seat.stack;
  }

  /** 強制離席並回傳當下籌碼（供斷線兌現） */
  forceLeaveWithStack(userId: string): { roomId: string; stack: number } | null {
    const roomId = this.userToRoom.get(userId);
    if (!roomId) return null;
    const table = this.tables.get(roomId);
    if (!table) return null;
    const seat = table.occupants.find((o) => o.userId === userId);
    if (!seat) return null;
    const eng = table.engine?.snapshot?.seats.find(
      (s) => s.seatId === seat.seatId,
    );
    const completeSnap = table.lastCompleteSnapshot?.seats.find(
      (s) => s.seatId === seat.seatId,
    );
    const stack = eng?.stack ?? completeSnap?.stack ?? seat.stack;
    if (userId) this.clearRestLeaveTimer(userId);
    this.removeOccupant(table, seat.seatId);
    this.userToRoom.delete(userId);
    this.rebuyBustedBots(table);
    this.tryPromoteFromQueue(table);
    this.fillBots(table);
    this.broadcast(table);
    this.notifyLobby();
    return { roomId, stack };
  }

  /**
   * 牌桌內加買入（僅手牌之間）。stack 不可超過 maxBuyIn。
   */
  topUpHuman(
    userId: string,
    amount: number,
  ): { table: ActiveTable; seat: TableOccupant; amount: number } {
    const roomId = this.userToRoom.get(userId);
    if (!roomId) throw new Error("未入桌");
    const table = this.tables.get(roomId);
    if (!table) throw new Error("找不到牌桌");
    const seat = table.occupants.find((o) => o.userId === userId);
    if (!seat) throw new Error("找不到座位");

    if (table.engine && !table.engine.isComplete) {
      throw new Error("手牌進行中不可加買入，請等本手結束");
    }

    const amt = Math.floor(amount);
    if (!Number.isFinite(amt) || amt < table.bigBlind) {
      throw new Error(`加買入至少 ${table.bigBlind}（一大盲）`);
    }

    const room = Math.max(0, table.maxBuyIn - seat.stack);
    if (room < table.bigBlind) {
      throw new Error("桌上籌碼已達本桌上限，無法再加買入");
    }
    if (amt > room) {
      throw new Error(`最多還可加買入 ${room.toLocaleString()}`);
    }

    seat.stack += amt;
    seat.sittingOut = false;
    this.broadcast(table);
    this.notifyLobby();
    return { table, seat, amount: amt };
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
    seat.missedTurns = 0;
    if (seat.sittingOut || seat.restUntilMs) {
      this.clearRestLeaveTimer(userId);
      seat.sittingOut = false;
      seat.restUntilMs = null;
    }
    const events = table.engine.applyAction(seat.seatId, type, amount);
    this.dispatchEngineEvents(table, events);
  }

  /** 玩家點「回來了」結束 AFK 休息 */
  resumeFromRest(userId: string): void {
    const roomId = this.userToRoom.get(userId);
    if (!roomId) throw new Error("未入桌");
    const table = this.tables.get(roomId);
    if (!table) throw new Error("找不到牌桌");
    const seat = table.occupants.find((o) => o.userId === userId);
    if (!seat) throw new Error("找不到座位");

    this.clearRestLeaveTimer(userId);
    seat.sittingOut = false;
    seat.restUntilMs = null;
    seat.missedTurns = 0;
    this.broadcast(table);
    this.notifyLobby();
    if (!table.engine || table.engine.isComplete) {
      this.maybeStartHand(table);
    }
  }

  // ---------------------------------------------------------------------------

  private nextFreeSeat(table: ActiveTable): number | null {
    const used = new Set(table.occupants.map((o) => o.seatIndex));
    for (let i = 0; i < table.maxSeats; i++) {
      if (!used.has(i)) return i;
    }
    return null;
  }

  /** 真人入座：優先空位；沒空位則請 AI 讓位（仍保留最少對手） */
  private claimSeatForHuman(table: ActiveTable): number | null {
    const free = this.nextFreeSeat(table);
    if (free !== null) return free;

    const bots = table.occupants.filter((o) => o.kind === "AI_BOT");
    if (bots.length <= MIN_BOTS_AT_TABLE) return null;

    /* 手牌進行中不踢人，等本手結束再入 */
    if (table.engine && !table.engine.isComplete) return null;

    const victim = bots[bots.length - 1]!;
    const seatIndex = victim.seatIndex;
    this.removeOccupant(table, victim.seatId);
    return seatIndex;
  }

  /**
   * 依 botTarget 補／裁牌桌對手（平台虛擬玩家常客）：
   * - 目標 5–9 人；排隊中保留空位給真人
   * - 真人變多：自動裁對手（上限 = 剩餘座位）
   * - 真人離開：再補回目標人數
   * - 輸光：自動補買入
   */
  private rebuyBustedBots(table: ActiveTable): void {
    const topUp = Math.floor((table.minBuyIn + table.maxBuyIn) / 2);
    for (const o of table.occupants) {
      if (o.kind !== "AI_BOT") continue;
      if (o.stack >= table.bigBlind) continue;
      o.stack = topUp;
      o.sittingOut = false;
      o.leaveAfterHand = false;
    }
  }

  private claimVirtualSeatMate(): {
    id: string;
    displayName: string;
    avatarUrl: string;
    botProfile: AiBotProfileId;
  } | null {
    const free = getPokerVirtualRoster().filter(
      (p) => !this.claimedVirtualIds.has(p.id),
    );
    if (free.length === 0) return null;
    const pick = free[Math.floor(Math.random() * free.length)]!;
    this.claimedVirtualIds.add(pick.id);
    return {
      id: pick.id,
      displayName: pick.displayName,
      avatarUrl: resolvePokerVirtualAvatar(pick.id),
      botProfile: pokerBotProfileForPlayer(pick.id),
    };
  }

  private releaseVirtualSeatMate(virtualPlayerId?: string): void {
    if (virtualPlayerId) this.claimedVirtualIds.delete(virtualPlayerId);
  }

  /** 從「超過下限」的空閒桌挪一位，優先保證每桌至少 TARGET_BOTS_MIN */
  private stealVirtualFromOverstaffed(): {
    id: string;
    displayName: string;
    avatarUrl: string;
    botProfile: AiBotProfileId;
  } | null {
    for (const t of this.tables.values()) {
      if (t.engine && !t.engine.isComplete) continue;
      const bots = t.occupants.filter((o) => o.kind === "AI_BOT");
      if (bots.length <= TARGET_BOTS_MIN) continue;
      const victim = bots[bots.length - 1]!;
      this.removeOccupant(t, victim.seatId);
      this.tryPromoteFromQueue(t);
      this.broadcast(t);
      return this.claimVirtualSeatMate();
    }
    return null;
  }

  private fillBots(table: ActiveTable): void {
    this.rebuyBustedBots(table);
    if (
      !table.botTarget ||
      table.botTarget < TARGET_BOTS_MIN ||
      table.botTarget > TARGET_BOTS_MAX
    ) {
      table.botTarget = randomBotTarget();
    }
    const { humans, bots } = this.tableStats(table);
    /* 排隊中保留空位，不讓對手佔滿 */
    const queueReserve = table.waitQueue.length;
    const roomForBots = Math.max(0, table.maxSeats - humans - queueReserve);
    /* 有空位時至少湊到 TARGET_BOTS_MIN */
    const want = Math.min(
      roomForBots,
      Math.max(table.botTarget, Math.min(TARGET_BOTS_MIN, roomForBots)),
    );

    /* 過多對手：手牌未進行時裁到目標（但不低於下限，除非座位被真人佔滿） */
    const trimFloor = Math.min(TARGET_BOTS_MIN, roomForBots, want);
    if (
      bots > want &&
      bots > trimFloor &&
      (!table.engine || table.engine.isComplete)
    ) {
      const botList = table.occupants.filter((o) => o.kind === "AI_BOT");
      const removeCount = Math.min(bots - want, bots - trimFloor);
      for (let i = 0; i < removeCount; i++) {
        const victim = botList[botList.length - 1 - i];
        if (!victim) break;
        this.removeOccupant(table, victim.seatId);
      }
    }

    let botsNow = this.tableStats(table).bots;
    while (botsNow < want) {
      const seatIndex = this.nextFreeSeat(table);
      if (seatIndex === null) break;
      let mate = this.claimVirtualSeatMate();
      if (!mate && botsNow < TARGET_BOTS_MIN) {
        mate = this.stealVirtualFromOverstaffed();
      }
      if (!mate) break;
      const tierBias = botProfileForTier(table.tier);
      const profile =
        Math.random() < 0.75
          ? mate.botProfile
          : tierBias === "LOOSE_PASSIVE"
            ? "BALANCED"
            : tierBias;
      table.occupants.push({
        seatId: newId("bot"),
        seatIndex,
        kind: "AI_BOT",
        name: mate.displayName,
        avatarUrl: mate.avatarUrl,
        virtualPlayerId: mate.id,
        stack: Math.floor((table.minBuyIn + table.maxBuyIn) / 2),
        botProfile: profile,
        sittingOut: false,
        leaveAfterHand: false,
        missedTurns: 0,
        restUntilMs: null,
        seatedAtMs: Date.now(),
        minStayMs: randomVirtualStayMs(),
        timeBankSec: TIME_BANK_SECONDS,
        sessionHud: emptyHudAccum(),
      });
      botsNow += 1;
    }
  }

  private removeOccupant(table: ActiveTable, seatId: string): void {
    const victim = table.occupants.find((o) => o.seatId === seatId);
    if (victim?.virtualPlayerId) {
      this.releaseVirtualSeatMate(victim.virtualPlayerId);
    }
    table.occupants = table.occupants.filter((o) => o.seatId !== seatId);
  }

  /**
   * 模擬真人久坐後離桌：需已坐超過 minStayMs，且池裡有人可替補。
   * 每桌每手最多換 1 人，且僅約 30% 機率真的走，避免整桌同時大換血。
   */
  private maybeRotateLongSeatedBots(table: ActiveTable): void {
    const freePool =
      getPokerVirtualRoster().length - this.claimedVirtualIds.size;
    if (freePool < 1) return;

    const bots = table.occupants.filter((o) => o.kind === "AI_BOT");
    if (bots.length <= TARGET_BOTS_MIN) return;

    const now = Date.now();
    const eligible = bots.filter((o) => {
      const seatedAt = o.seatedAtMs ?? now;
      const stay = o.minStayMs ?? randomVirtualStayMs();
      return now - seatedAt >= stay;
    });
    if (eligible.length === 0) return;

    /* 打亂後取一位候選人 */
    const pick =
      eligible[Math.floor(Math.random() * eligible.length)]!;
    if (Math.random() > 0.3) return;
    pick.leaveAfterHand = true;
  }

  private maybeStartHand(table: ActiveTable): void {
    if (table.engine && !table.engine.isComplete) return;
    table.lastCompleteSnapshot = null;
    this.rebuyBustedBots(table);

    /* 慢速換人：坐滿最短停留（約 12–28 分）後，每手最多換 1 人 */
    this.maybeRotateLongSeatedBots(table);

    // 清離席對手（釋放虛擬玩家池）；真人應已在 hand-complete 兌現
    const pendingHumans = table.occupants.filter(
      (o) => o.leaveAfterHand && o.kind === "HUMAN" && o.userId,
    );
    for (const o of pendingHumans) {
      const userId = o.userId!;
      const pending = this.pendingLeaveResolvers.get(userId);
      const left = this.forceLeaveWithStack(userId);
      pending?.(left);
    }
    const botsLeaving = table.occupants.filter(
      (o) => o.leaveAfterHand && o.kind === "AI_BOT",
    );
    for (const o of botsLeaving) {
      this.removeOccupant(table, o.seatId);
    }
    this.tryPromoteFromQueue(table);
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

  private dispatchEngineEvents(table: ActiveTable, events: EngineEvent[]): void {
    for (const ev of events) {
      if (ev.type === "error") {
        this.emit(table.roomId, { type: "error", message: ev.message });
        continue;
      }
      this.afterEngineEvent(table, ev);
    }
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

    if (ev.type === "hand-complete") {
      this.applySessionHud(table, ev);
    }

    const publicEvent = serializeEngineEvent(ev, (seatId) => {
      const occ = table.occupants.find((o) => o.seatId === seatId);
      if (occ) return occ.name;
      const seat = snap?.seats.find((s) => s.seatId === seatId);
      return seat?.name ?? seatId;
    });

    const humans = table.occupants.filter(
      (o) => o.kind === "HUMAN" && o.socketId && this.emitToSocket,
    );
    if (humans.length > 0) {
      /* 只對真人發一次（含底牌），避免房間廣播造成紀錄重複 */
      for (const o of humans) {
        this.emitToSocket!(o.socketId!, {
          type: "hand_event",
          event: publicEvent,
          publicSnapshot: this.toPublic(table, o.seatId),
        });
      }
    } else {
      this.emit(table.roomId, {
        type: "hand_event",
        event: publicEvent,
        publicSnapshot: this.toPublic(table),
      });
    }

    if (ev.type === "hand-complete") {
      this.clearTurnTimer(table.roomId);
      this.clearRunoutTimer(table.roomId);
      this.onHandComplete?.(table, ev);
      /* 保留結算快照：公牌、攤牌底牌、籌碼，讓玩家看清楚誰贏 */
      table.lastCompleteSnapshot = ev.snapshot;
      table.engine = null;
      table.turnDeadlineMs = null;

      /* 全下後申請離桌者：本手已結算，立刻以最終籌碼離席並兑现 */
      this.flushPendingLeavers(table);

      this.rebuyBustedBots(table);

      const showMs = ev.snapshot.board.length >= 3 ? 5200 : 2800;
      this.clearNextHandTimer(table.roomId);
      const timer = setTimeout(() => {
        this.nextHandTimers.delete(table.roomId);
        table.lastCompleteSnapshot = null;
        this.maybeStartHand(table);
      }, showMs);
      this.nextHandTimers.set(table.roomId, timer);
      this.broadcast(table);
      return;
    }

    if (snap?.actingSeatId) {
      this.scheduleTurn(table, snap.actingSeatId);
    } else if (table.engine?.needsRunout()) {
      this.scheduleRunout(table);
    }
  }

  private flushPendingLeavers(table: ActiveTable): void {
    const leavers = table.occupants.filter(
      (o) => o.leaveAfterHand && o.kind === "HUMAN" && o.userId,
    );
    for (const o of leavers) {
      const userId = o.userId!;
      const pending = this.pendingLeaveResolvers.get(userId);
      const left = this.forceLeaveWithStack(userId);
      pending?.(left);
    }
  }

  private applySessionHud(table: ActiveTable, ev: EngineEvent): void {
    if (ev.type !== "hand-complete") return;
    const deltas = computeHandHudDeltas(
      ev.snapshot,
      ev.winners,
      table.startingStacks,
    );
    for (const d of deltas) {
      const occ = table.occupants.find((o) => o.seatId === d.seatId);
      if (!occ) continue;
      occ.sessionHud = applyHandDeltas(occ.sessionHud, d);
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
    this.clearRunoutTimer(table.roomId);
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

  private scheduleRunout(table: ActiveTable): void {
    this.clearRunoutTimer(table.roomId);
    const timer = setTimeout(() => {
      this.runoutTimers.delete(table.roomId);
      if (!table.engine?.needsRunout()) return;
      const next = table.engine.continueRunout();
      if (next) this.afterEngineEvent(table, next);
    }, 1600);
    this.runoutTimers.set(table.roomId, timer);
  }

  private clearRunoutTimer(roomId: string): void {
    const t = this.runoutTimers.get(roomId);
    if (t) clearTimeout(t);
    this.runoutTimers.delete(roomId);
  }

  private clearNextHandTimer(roomId: string): void {
    const t = this.nextHandTimers.get(roomId);
    if (t) clearTimeout(t);
    this.nextHandTimers.delete(roomId);
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

    const events = table.engine.applyTimeout(seatId);
    this.dispatchEngineEvents(table, events);

    if (occ?.kind === "HUMAN" && occ.userId) {
      occ.missedTurns = (occ.missedTurns ?? 0) + 1;
      if (occ.missedTurns >= AFK_MISSED_TURNS_TO_REST && !occ.restUntilMs) {
        this.enterAfkRest(table, occ);
      }
    }
  }

  private enterAfkRest(table: ActiveTable, occ: TableOccupant): void {
    if (!occ.userId) return;
    const restUntilMs = Date.now() + AFK_REST_MS;
    occ.sittingOut = true;
    occ.restUntilMs = restUntilMs;
    occ.missedTurns = AFK_MISSED_TURNS_TO_REST;

    if (occ.socketId && this.emitToSocket) {
      this.emitToSocket(occ.socketId, {
        type: "afk_rest",
        restUntilMs,
        message:
          "連續兩次未行動，已進入休息 10 分鐘。請點「回來了」繼續；否則時間到會自動離桌兌現。",
      });
    }

    this.clearRestLeaveTimer(occ.userId);
    const userId = occ.userId;
    const timer = setTimeout(() => {
      this.restLeaveTimers.delete(userId);
      this.autoLeaveAfterAfkRest(userId);
    }, AFK_REST_MS);
    this.restLeaveTimers.set(userId, timer);

    this.broadcast(table);
    this.notifyLobby();
  }

  private autoLeaveAfterAfkRest(userId: string): void {
    const roomId = this.userToRoom.get(userId);
    if (!roomId) return;
    const table = this.tables.get(roomId);
    const seat = table?.occupants.find((o) => o.userId === userId);
    if (!seat?.restUntilMs) return;
    /* 仍在休息中才踢：若已回來則 restUntilMs 為 null */
    if (!seat.sittingOut) return;

    const left = this.forceLeaveWithStack(userId);
    if (left) {
      this.onHumanAutoLeave?.(
        userId,
        left,
        "休息時間到仍未回來，已自動離桌並兌現",
      );
    }
  }

  private clearRestLeaveTimer(userId: string): void {
    const t = this.restLeaveTimers.get(userId);
    if (t) clearTimeout(t);
    this.restLeaveTimers.delete(userId);
  }

  private runBot(table: ActiveTable, seatId: string): void {
    if (!table.engine || table.engine.isComplete) return;
    const snap = table.engine.snapshot;
    if (!snap || snap.actingSeatId !== seatId) return;
    const decision = decideBotAction(snap, seatId);
    const events = table.engine.applyAction(
      seatId,
      decision.type,
      decision.amount,
    );
    this.dispatchEngineEvents(table, events);
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
    for (const o of table.occupants) {
      if (o.kind === "HUMAN" && o.socketId && this.emitToSocket) {
        this.emitToSocket(o.socketId, {
          type: "table_state",
          table: this.toPublic(table, o.seatId),
        });
      }
    }
  }

  toPublic(table: ActiveTable, viewerSeatId?: string): PublicHandSnapshot {
    const engineSnap =
      table.engine?.snapshot ?? table.lastCompleteSnapshot ?? undefined;
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
        restUntilMs: o.restUntilMs ?? null,
        isBot: false,
        holeCards: showCards
          ? (eng?.holeCards ?? []).map((c) => c.code)
          : undefined,
        folded: eng?.folded,
        allIn: eng?.allIn,
        streetCommitted: eng?.streetCommitted,
        committed: eng?.committed,
        hud: toPublicHud(o.sessionHud ?? emptyHudAccum()),
      };
    });

    return {
      roomId: table.roomId,
      code: table.code,
      tier: table.tier,
      slotIndex: table.slotIndex,
      labelZh: table.labelZh,
      smallBlind: table.smallBlind,
      bigBlind: table.bigBlind,
      minBuyIn: table.minBuyIn,
      maxBuyIn: table.maxBuyIn,
      handNumber: table.handNumber,
      buttonSeatIndex: table.buttonSeatIndex,
      sbSeatIndex: engineSnap?.sbSeatIndex ?? null,
      bbSeatIndex: engineSnap?.bbSeatIndex ?? null,
      seats,
      /* 對外不區分對手來源，只呈現在座人數 */
      humanCount: table.occupants.length,
      botCount: 0,
      seatedCount: table.occupants.length,
      maxSeats: table.maxSeats,
      canJoin: this.canJoinTable(table),
      canQueue:
        !this.canJoinTable(table) &&
        table.waitQueue.length < MAX_QUEUE_PER_TABLE,
      queueCount: table.waitQueue.length,
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
