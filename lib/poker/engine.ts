/**
 * No-Limit Texas Hold'em 狀態機引擎
 *
 * 流程：waiting → preflop → flop → turn → river → showdown → complete
 * 位移／計時由伺服器驅動；本模組為純函式狀態轉換（可單測）。
 */

import { Deck } from "./deck";
import { evaluateHand } from "./hand-evaluator";
import {
  calculateSidePots,
  awardPots,
  awardUncontestedPot,
  aggregateAwards,
  totalPot,
  type PotContributor,
} from "./pot";
import type {
  Card,
  HandSnapshot,
  PlayerAction,
  PlayerActionType,
  SeatPlayer,
  SidePot,
  Street,
} from "./types";

export interface EngineSeatInput {
  seatId: string;
  seatIndex: number;
  name: string;
  stack: number;
  isBot?: boolean;
  botProfile?: SeatPlayer["botProfile"];
}

export interface StartHandConfig {
  handId: string;
  smallBlind: number;
  bigBlind: number;
  /** 莊位 seatIndex；下一手通常 +1 */
  buttonSeatIndex: number;
  seats: EngineSeatInput[];
  /** 可注入牌組（測試用固定牌序） */
  deck?: Deck;
  nowMs?: number;
}

export type EngineEvent =
  | { type: "hand-started"; snapshot: HandSnapshot }
  | { type: "action"; action: PlayerAction; snapshot: HandSnapshot }
  | { type: "street"; street: Street; board: Card[]; snapshot: HandSnapshot }
  | {
      type: "hand-complete";
      winners: Map<string, number>;
      sidePots: SidePot[];
      snapshot: HandSnapshot;
    }
  | { type: "error"; message: string };

interface InternalState {
  handId: string;
  street: Street;
  board: Card[];
  seats: SeatPlayer[];
  deck: Deck;
  smallBlind: number;
  bigBlind: number;
  buttonSeatIndex: number;
  sbSeatIndex: number;
  bbSeatIndex: number;
  /** 本街需跟到的金額 */
  currentBet: number;
  /** 本街最後一次加注的「增量」（用於 min-raise） */
  lastRaiseSize: number;
  actingSeatId: string | null;
  /** 本街還需行動的座位（發牌後重置；跟注／過牌後移除） */
  pendingActionSeatIds: Set<string>;
  actionLog: PlayerAction[];
  /** 是否已結束 */
  complete: boolean;
}

function activeContenders(seats: SeatPlayer[]): SeatPlayer[] {
  return seats.filter((s) => !s.folded && !s.sittingOut);
}

function canAct(s: SeatPlayer): boolean {
  return !s.folded && !s.allIn && !s.sittingOut && s.stack > 0;
}

/** 從 fromIndex 的下一位開始，依座位環找下一個可行動玩家 */
function nextActor(
  seats: SeatPlayer[],
  fromSeatIndex: number,
  predicate: (s: SeatPlayer) => boolean = canAct,
): SeatPlayer | null {
  const ordered = seats.slice().sort((a, b) => a.seatIndex - b.seatIndex);
  if (ordered.length === 0) return null;
  const start = ordered.findIndex((s) => s.seatIndex > fromSeatIndex);
  const rot =
    start === -1
      ? ordered
      : [...ordered.slice(start), ...ordered.slice(0, start)];
  for (const s of rot) {
    if (predicate(s)) return s;
  }
  return null;
}

function seatById(seats: SeatPlayer[], id: string): SeatPlayer {
  const s = seats.find((x) => x.seatId === id);
  if (!s) throw new Error(`Unknown seat ${id}`);
  return s;
}

export class PokerHandEngine {
  private state: InternalState | null = null;

  get snapshot(): HandSnapshot | null {
    if (!this.state) return null;
    return this.toSnapshot(this.state);
  }

  get isComplete(): boolean {
    return this.state?.complete ?? true;
  }

  startHand(config: StartHandConfig): EngineEvent {
    const eligible = config.seats
      .filter((s) => s.stack > 0)
      .sort((a, b) => a.seatIndex - b.seatIndex);

    if (eligible.length < 2) {
      return { type: "error", message: "Need at least 2 players with chips" };
    }

    const seats: SeatPlayer[] = eligible.map((s) => ({
      seatId: s.seatId,
      seatIndex: s.seatIndex,
      name: s.name,
      stack: s.stack,
      isBot: s.isBot ?? false,
      botProfile: s.botProfile,
      committed: 0,
      streetCommitted: 0,
      holeCards: [],
      folded: false,
      allIn: false,
      sittingOut: false,
    }));

    const button = seats.find((s) => s.seatIndex === config.buttonSeatIndex)
      ? config.buttonSeatIndex
      : seats[0]!.seatIndex;

    const isHeadsUp = seats.length === 2;
    // HU: button = SB；多人：button 左邊 = SB
    const sbSeat = isHeadsUp
      ? seats.find((s) => s.seatIndex === button)!
      : nextActor(seats, button, () => true)!;
    const bbSeat = nextActor(
      seats,
      sbSeat.seatIndex,
      () => true,
    )!;

    const deck = config.deck ?? new Deck();
    const now = config.nowMs ?? Date.now();

    const state: InternalState = {
      handId: config.handId,
      street: "preflop",
      board: [],
      seats,
      deck,
      smallBlind: config.smallBlind,
      bigBlind: config.bigBlind,
      buttonSeatIndex: button,
      sbSeatIndex: sbSeat.seatIndex,
      bbSeatIndex: bbSeat.seatIndex,
      currentBet: 0,
      lastRaiseSize: config.bigBlind,
      actingSeatId: null,
      pendingActionSeatIds: new Set(),
      actionLog: [],
      complete: false,
    };

    this.postBlind(state, sbSeat.seatId, config.smallBlind, now);
    this.postBlind(state, bbSeat.seatId, config.bigBlind, now);
    state.currentBet = Math.min(
      config.bigBlind,
      seatById(state.seats, bbSeat.seatId).streetCommitted,
    );

    // 發兩張底牌（從 SB 開始按座位順序）
    const dealOrder = this.clockwiseFrom(state.seats, sbSeat.seatIndex);
    for (let r = 0; r < 2; r++) {
      for (const s of dealOrder) {
        s.holeCards.push(...state.deck.draw(1));
      }
    }

    // Preflop 第一個行動：BB 左邊（HU 則是 BB／非 button）
    const first = nextActor(state.seats, bbSeat.seatIndex);
    state.actingSeatId = first?.seatId ?? null;
    this.resetPendingForStreet(state);

    this.state = state;
    return { type: "hand-started", snapshot: this.toSnapshot(state) };
  }

  /**
   * 套用玩家動作。
   * amount：
   * - call/check/fold：忽略或 0
   * - bet/raise：目標本街總投入（raise-to），非增量
   * - all-in：可省略（自動推入剩餘籌碼）
   */
  applyAction(
    seatId: string,
    type: PlayerActionType,
    amount = 0,
    nowMs = Date.now(),
  ): EngineEvent[] {
    if (!this.state || this.state.complete) {
      return [{ type: "error", message: "No active hand" }];
    }
    const state = this.state;

    if (state.actingSeatId !== seatId) {
      return [{ type: "error", message: "Not your turn" }];
    }

    const seat = seatById(state.seats, seatId);
    if (!canAct(seat)) {
      return [{ type: "error", message: "Seat cannot act" }];
    }

    const toCall = state.currentBet - seat.streetCommitted;
    let action: PlayerAction;

    try {
      switch (type) {
        case "fold":
          seat.folded = true;
          action = this.record(state, seatId, "fold", 0, nowMs);
          break;

        case "check":
          if (toCall > 0) {
            return [
              { type: "error", message: "Cannot check; must call or fold" },
            ];
          }
          action = this.record(state, seatId, "check", 0, nowMs);
          break;

        case "call": {
          if (toCall <= 0) {
            return [
              { type: "error", message: "Nothing to call; check instead" },
            ];
          }
          const pay = Math.min(toCall, seat.stack);
          this.commit(seat, pay);
          if (seat.stack === 0) seat.allIn = true;
          action = this.record(
            state,
            seatId,
            seat.allIn ? "all-in" : "call",
            pay,
            nowMs,
          );
          break;
        }

        case "bet":
        case "raise": {
          // amount = raise-to（本街 committed 目標）
          const raiseTo = amount;
          if (raiseTo <= state.currentBet && seat.stack > toCall) {
            return [
              {
                type: "error",
                message: `Raise must be to more than ${state.currentBet}`,
              },
            ];
          }
          const need = raiseTo - seat.streetCommitted;
          if (need <= 0) {
            return [{ type: "error", message: "Invalid bet size" }];
          }
          if (need > seat.stack) {
            return [{ type: "error", message: "Insufficient stack" }];
          }

          const isAllIn = need === seat.stack;
          const raiseSize = raiseTo - state.currentBet;

          // 非 all-in 時需滿足最小加注
          if (!isAllIn && state.currentBet > 0 && raiseSize < state.lastRaiseSize) {
            return [
              {
                type: "error",
                message: `Min raise size is ${state.lastRaiseSize}`,
              },
            ];
          }
          if (!isAllIn && state.currentBet === 0 && raiseTo < state.bigBlind) {
            return [
              {
                type: "error",
                message: `Min bet is ${state.bigBlind}`,
              },
            ];
          }

          this.commit(seat, need);
          if (raiseTo > state.currentBet) {
            if (raiseSize >= state.lastRaiseSize) {
              state.lastRaiseSize = raiseSize;
            }
            state.currentBet = seat.streetCommitted;
            // 加注後其他未 all-in 者需重新行動
            this.reopenPending(state, seatId);
          }
          if (seat.stack === 0) seat.allIn = true;
          action = this.record(
            state,
            seatId,
            seat.allIn ? "all-in" : state.currentBet === raiseTo && toCall === 0
              ? "bet"
              : "raise",
            need,
            nowMs,
          );
          break;
        }

        case "all-in": {
          const pay = seat.stack;
          if (pay <= 0) {
            return [{ type: "error", message: "Already all-in" }];
          }
          const newStreet = seat.streetCommitted + pay;
          this.commit(seat, pay);
          seat.allIn = true;
          if (newStreet > state.currentBet) {
            const raiseSize = newStreet - state.currentBet;
            if (raiseSize >= state.lastRaiseSize) {
              state.lastRaiseSize = raiseSize;
            }
            state.currentBet = newStreet;
            this.reopenPending(state, seatId);
          }
          action = this.record(state, seatId, "all-in", pay, nowMs);
          break;
        }

        default:
          return [{ type: "error", message: `Unknown action ${type}` }];
      }
    } catch (e) {
      return [
        {
          type: "error",
          message: e instanceof Error ? e.message : "Action failed",
        },
      ];
    }

    state.pendingActionSeatIds.delete(seatId);

    // 只剩一人 → 先廣播行動再結算
    const contenders = activeContenders(state.seats);
    if (contenders.length === 1) {
      state.actingSeatId = null;
      const actionEv: EngineEvent = {
        type: "action",
        action,
        snapshot: this.toSnapshot(state),
      };
      return [actionEv, this.finishUncontested(state, contenders[0]!.seatId)];
    }

    // 本街結束 → 先廣播行動，再進下一街／All-in 開公牌
    if (this.isBettingRoundComplete(state)) {
      state.actingSeatId = null;
      const actionEv: EngineEvent = {
        type: "action",
        action,
        snapshot: this.toSnapshot(state),
      };
      return [actionEv, this.advanceStreet(state)];
    }

    // 下一位
    const next = nextActor(state.seats, seat.seatIndex);
    state.actingSeatId = next?.seatId ?? null;
    if (!state.actingSeatId) {
      const actionEv: EngineEvent = {
        type: "action",
        action,
        snapshot: this.toSnapshot(state),
      };
      return [actionEv, this.advanceStreet(state)];
    }

    return [
      {
        type: "action",
        action,
        snapshot: this.toSnapshot(state),
      },
    ];
  }

  /** 逾時：可 check 則 check，否則 fold */
  applyTimeout(seatId: string, nowMs = Date.now()): EngineEvent[] {
    if (!this.state || this.state.actingSeatId !== seatId) {
      return [{ type: "error", message: "Timeout seat mismatch" }];
    }
    const seat = seatById(this.state.seats, seatId);
    const toCall = this.state.currentBet - seat.streetCommitted;
    if (toCall <= 0) {
      return this.applyAction(seatId, "check", 0, nowMs);
    }
    return this.applyAction(seatId, "fold", 0, nowMs);
  }

  /**
   * 強制蓋牌離桌用：即使未輪到該座位也可 fold。
   * 輪到自己時走正常 applyAction；否則直接標記 folded 並推進牌局。
   */
  forceFold(seatId: string, nowMs = Date.now()): EngineEvent[] {
    if (!this.state || this.state.complete) {
      return [{ type: "error", message: "No active hand" }];
    }
    const state = this.state;
    const seat = seatById(state.seats, seatId);
    if (seat.folded) {
      return [
        {
          type: "action",
          action: {
            seatId,
            type: "fold",
            amount: 0,
            street: state.street,
            atMs: nowMs,
          },
          snapshot: this.toSnapshot(state),
        },
      ];
    }

    /* 已是唯一存活者：先頒獎結束，避免 fold 後 0 人 */
    const before = activeContenders(state.seats);
    if (before.length === 1 && before[0]!.seatId === seatId) {
      return [this.finishUncontested(state, seatId)];
    }

    /* 全下不可蓋牌放棄爭池（離桌應等本手結束） */
    if (seat.allIn) {
      return [];
    }

    if (state.actingSeatId === seatId) {
      return this.applyAction(seatId, "fold", 0, nowMs);
    }

    seat.folded = true;
    state.pendingActionSeatIds.delete(seatId);
    const action = this.record(state, seatId, "fold", 0, nowMs);
    const actionEv: EngineEvent = {
      type: "action",
      action,
      snapshot: this.toSnapshot(state),
    };

    const contenders = activeContenders(state.seats);
    if (contenders.length === 1) {
      return [actionEv, this.finishUncontested(state, contenders[0]!.seatId)];
    }
    if (contenders.length === 0) {
      return [actionEv, this.finishUncontested(state, seatId)];
    }
    if (this.isBettingRoundComplete(state)) {
      return [actionEv, this.advanceStreet(state)];
    }
    return [actionEv];
  }

  /**
   * 是否需要 All-in 開公牌／進攤牌（無人可互加注，但 ≥2 人仍爭池）。
   */
  needsRunout(): boolean {
    if (!this.state || this.state.complete) return false;
    if (activeContenders(this.state.seats).length < 2) return false;
    const actors = this.state.seats.filter(canAct);
    return actors.length < 2;
  }

  /** 開下一張公牌，或河牌後攤牌結算（由伺服器延遲呼叫，讓玩家看得到） */
  continueRunout(): EngineEvent | null {
    if (!this.needsRunout() || !this.state) return null;
    return this.advanceStreet(this.state);
  }

  /** 測試用：同步發完公牌直到手牌結束 */
  drainRunout(): EngineEvent[] {
    const out: EngineEvent[] = [];
    while (this.needsRunout()) {
      const ev = this.continueRunout();
      if (!ev) break;
      out.push(ev);
      if (ev.type === "hand-complete" || ev.type === "error") break;
    }
    return out;
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private postBlind(
    state: InternalState,
    seatId: string,
    amount: number,
    nowMs: number,
  ): void {
    const seat = seatById(state.seats, seatId);
    const pay = Math.min(amount, seat.stack);
    this.commit(seat, pay);
    if (seat.stack === 0) seat.allIn = true;
    state.actionLog.push({
      seatId,
      type: seat.allIn ? "all-in" : "bet",
      amount: pay,
      street: "preflop",
      atMs: nowMs,
    });
  }

  private commit(seat: SeatPlayer, amount: number): void {
    if (amount > seat.stack) throw new Error("Commit exceeds stack");
    seat.stack -= amount;
    seat.committed += amount;
    seat.streetCommitted += amount;
  }

  private record(
    state: InternalState,
    seatId: string,
    type: PlayerActionType,
    amount: number,
    nowMs: number,
  ): PlayerAction {
    const action: PlayerAction = {
      seatId,
      type,
      amount,
      street: state.street,
      atMs: nowMs,
    };
    state.actionLog.push(action);
    return action;
  }

  private clockwiseFrom(seats: SeatPlayer[], fromIndex: number): SeatPlayer[] {
    const ordered = seats.slice().sort((a, b) => a.seatIndex - b.seatIndex);
    const start = ordered.findIndex((s) => s.seatIndex >= fromIndex);
    const i = start === -1 ? 0 : start;
    return [...ordered.slice(i), ...ordered.slice(0, i)];
  }

  private resetPendingForStreet(state: InternalState): void {
    state.pendingActionSeatIds = new Set(
      state.seats.filter(canAct).map((s) => s.seatId),
    );
  }

  private reopenPending(state: InternalState, raiserId: string): void {
    state.pendingActionSeatIds = new Set(
      state.seats
        .filter((s) => canAct(s) && s.seatId !== raiserId)
        .map((s) => s.seatId),
    );
  }

  private isBettingRoundComplete(state: InternalState): boolean {
    const actors = state.seats.filter(canAct);
    if (actors.length === 0) return true;

    // 所有可行動者 streetCommitted 已對齊 currentBet（或全 all-in）
    for (const s of actors) {
      if (s.streetCommitted < state.currentBet) return false;
      if (state.pendingActionSeatIds.has(s.seatId)) return false;
    }
    return true;
  }

  private clearStreetCommitments(state: InternalState): void {
    for (const s of state.seats) {
      s.streetCommitted = 0;
    }
    state.currentBet = 0;
    state.lastRaiseSize = state.bigBlind;
  }

  private advanceStreet(state: InternalState): EngineEvent {
    const contenders = activeContenders(state.seats);
    if (contenders.length === 1) {
      return this.finishUncontested(state, contenders[0]!.seatId);
    }

    // 若所有人都 all-in（或只剩一人可行動），逐街開公牌（不一次發完）
    const canStillBet =
      state.seats.some(canAct) && state.seats.filter(canAct).length >= 2;

    const order: Street[] = ["preflop", "flop", "turn", "river", "showdown"];
    const idx = order.indexOf(state.street as (typeof order)[number]);
    if (idx < 0) {
      return this.finishShowdown(state);
    }

    if (!canStillBet) {
      // 河牌已開滿 → 攤牌；否則開下一街給玩家看
      if (state.board.length >= 5) {
        state.street = "showdown";
        state.actingSeatId = null;
        return this.finishShowdown(state);
      }
      this.clearStreetCommitments(state);
      if (state.board.length === 0) {
        state.board.push(...state.deck.burnAndDraw(3));
        state.street = "flop";
      } else if (state.board.length === 3) {
        state.board.push(...state.deck.burnAndDraw(1));
        state.street = "turn";
      } else {
        state.board.push(...state.deck.burnAndDraw(1));
        state.street = "river";
      }
      state.actingSeatId = null;
      this.state = state;
      return {
        type: "street",
        street: state.street,
        board: state.board.slice(),
        snapshot: this.toSnapshot(state),
      };
    }

    const nextStreet = order[idx + 1]!;
    this.clearStreetCommitments(state);

    if (nextStreet === "flop") {
      state.board.push(...state.deck.burnAndDraw(3));
      state.street = "flop";
    } else if (nextStreet === "turn") {
      state.board.push(...state.deck.burnAndDraw(1));
      state.street = "turn";
    } else if (nextStreet === "river") {
      state.board.push(...state.deck.burnAndDraw(1));
      state.street = "river";
    } else {
      state.street = "showdown";
      state.actingSeatId = null;
      return this.finishShowdown(state);
    }

    // 翻後第一個行動：莊家左邊第一位可行動者
    const first = nextActor(state.seats, state.buttonSeatIndex);
    state.actingSeatId = first?.seatId ?? null;
    this.resetPendingForStreet(state);

    // 若無人可互加注（全 all-in），回傳本街公牌，由 orchestrator 延遲繼續開牌
    if (!state.actingSeatId || state.seats.filter(canAct).length < 2) {
      state.actingSeatId = null;
      this.state = state;
      return {
        type: "street",
        street: state.street,
        board: state.board.slice(),
        snapshot: this.toSnapshot(state),
      };
    }

    return {
      type: "street",
      street: state.street,
      board: state.board.slice(),
      snapshot: this.toSnapshot(state),
    };
  }

  private buildContributors(state: InternalState): PotContributor[] {
    return state.seats.map((s) => ({
      seatId: s.seatId,
      seatIndex: s.seatIndex,
      committed: s.committed,
      folded: s.folded,
    }));
  }

  private finishUncontested(
    state: InternalState,
    winnerSeatId: string,
  ): EngineEvent {
    const pots = calculateSidePots(this.buildContributors(state));
    const awards = awardUncontestedPot(pots, winnerSeatId);
    return this.applyAwards(state, pots, awards);
  }

  private finishShowdown(state: InternalState): EngineEvent {
    const pots = calculateSidePots(this.buildContributors(state));
    const contestants = activeContenders(state.seats).map((s) => {
      const cards = [...s.holeCards, ...state.board];
      const hand = evaluateHand(cards);
      return {
        seatId: s.seatId,
        seatIndex: s.seatIndex,
        handScore: hand.score,
        label: hand.label,
      };
    });

    const awards = awardPots(pots, contestants);
    return this.applyAwards(state, pots, awards);
  }

  private applyAwards(
    state: InternalState,
    pots: SidePot[],
    awards: ReturnType<typeof awardPots>,
  ): EngineEvent {
    const won = aggregateAwards(awards);
    for (const [seatId, amount] of won) {
      const seat = seatById(state.seats, seatId);
      seat.stack += amount;
    }
    state.street = "complete";
    state.complete = true;
    state.actingSeatId = null;
    this.state = state;

    return {
      type: "hand-complete",
      winners: won,
      sidePots: pots,
      snapshot: this.toSnapshot(state),
    };
  }

  private toSnapshot(state: InternalState): HandSnapshot {
    const pots = calculateSidePots(this.buildContributors(state));
    return {
      handId: state.handId,
      street: state.street,
      board: state.board.slice(),
      seats: state.seats.map((s) => ({
        ...s,
        holeCards: s.holeCards.slice(),
      })),
      potTotal: totalPot(pots),
      sidePots: pots,
      currentBet: state.currentBet,
      minRaiseTo: state.currentBet + state.lastRaiseSize,
      buttonSeatIndex: state.buttonSeatIndex,
      sbSeatIndex: state.sbSeatIndex,
      bbSeatIndex: state.bbSeatIndex,
      actingSeatId: state.actingSeatId,
      actionLog: state.actionLog.slice(),
      smallBlind: state.smallBlind,
      bigBlind: state.bigBlind,
    };
  }
}

/** 下一手莊位：下一個仍有籌碼的座位 */
export function nextButtonSeatIndex(
  seats: { seatIndex: number; stack: number }[],
  currentButton: number,
): number {
  const ordered = seats
    .filter((s) => s.stack > 0)
    .sort((a, b) => a.seatIndex - b.seatIndex);
  if (ordered.length === 0) return currentButton;
  const start = ordered.findIndex((s) => s.seatIndex > currentButton);
  if (start === -1) return ordered[0]!.seatIndex;
  return ordered[start]!.seatIndex;
}
