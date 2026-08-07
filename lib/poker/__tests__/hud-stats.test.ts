/**
 * HUD 統計單元測試（node:test）
 */
import assert from "node:assert/strict";
import { cardFromCode } from "../deck";
import type { HandSnapshot, PlayerAction, SeatPlayer } from "../types";
import {
  applyHandDeltas,
  computeHandHudDeltas,
  emptyHudAccum,
  forcedBlindIndices,
  toPublicHud,
} from "../hud-stats";

function seat(
  partial: Partial<SeatPlayer> & Pick<SeatPlayer, "seatId" | "seatIndex">,
): SeatPlayer {
  return {
    name: partial.seatId,
    stack: 1000,
    isBot: false,
    committed: 0,
    streetCommitted: 0,
    holeCards: [cardFromCode("As"), cardFromCode("Kd")],
    folded: false,
    allIn: false,
    sittingOut: false,
    ...partial,
  };
}

function snap(partial: Partial<HandSnapshot> & { actionLog: PlayerAction[] }): HandSnapshot {
  return {
    handId: "h1",
    street: "complete",
    board: [],
    seats: [],
    potTotal: 0,
    sidePots: [],
    currentBet: 0,
    minRaiseTo: 0,
    buttonSeatIndex: 0,
    sbSeatIndex: 0,
    bbSeatIndex: 1,
    actingSeatId: null,
    smallBlind: 10,
    bigBlind: 20,
    ...partial,
  };
}

function act(
  seatId: string,
  type: PlayerAction["type"],
  street: PlayerAction["street"],
  amount = 0,
): PlayerAction {
  return { seatId, type, amount, street, atMs: 0 };
}

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (e) {
    console.error(`fail - ${name}`);
    throw e;
  }
}

run("forcedBlindIndices marks first two blind posts", () => {
  const log = [
    act("sb", "bet", "preflop", 10),
    act("bb", "bet", "preflop", 20),
    act("utg", "raise", "preflop", 60),
  ];
  const blinds = forcedBlindIndices(log);
  assert.equal(blinds.has(0), true);
  assert.equal(blinds.has(1), true);
  assert.equal(blinds.has(2), false);
});

run("VPIP/PFR: raise counts, blind post does not", () => {
  const seats = [
    seat({ seatId: "sb", seatIndex: 0, committed: 10, folded: true }),
    seat({ seatId: "bb", seatIndex: 1, committed: 20, folded: true }),
    seat({
      seatId: "utg",
      seatIndex: 2,
      committed: 60,
      folded: false,
      stack: 940,
    }),
  ];
  const log = [
    act("sb", "bet", "preflop", 10),
    act("bb", "bet", "preflop", 20),
    act("utg", "raise", "preflop", 60),
    act("sb", "fold", "preflop"),
    act("bb", "fold", "preflop"),
  ];
  const deltas = computeHandHudDeltas(
    snap({ seats, actionLog: log, potTotal: 90 }),
    new Map([["utg", 90]]),
    new Map([
      ["sb", 1000],
      ["bb", 1000],
      ["utg", 1000],
    ]),
  );
  const utg = deltas.find((d) => d.seatId === "utg")!;
  const sb = deltas.find((d) => d.seatId === "sb")!;
  assert.equal(utg.vpip, true);
  assert.equal(utg.pfr, true);
  assert.equal(sb.vpip, false);
  assert.equal(sb.foldPreflop, true);
});

run("limp is VPIP but not PFR", () => {
  const seats = [
    seat({ seatId: "sb", seatIndex: 0, committed: 20, folded: true }),
    seat({ seatId: "bb", seatIndex: 1, committed: 20, folded: false }),
    seat({ seatId: "utg", seatIndex: 2, committed: 20, folded: true }),
  ];
  const log = [
    act("sb", "bet", "preflop", 10),
    act("bb", "bet", "preflop", 20),
    act("utg", "call", "preflop", 20),
    act("sb", "call", "preflop", 10),
    act("bb", "check", "preflop"),
    act("utg", "fold", "flop"),
    act("sb", "fold", "flop"),
  ];
  const deltas = computeHandHudDeltas(
    snap({
      seats,
      actionLog: log,
      board: [cardFromCode("2c"), cardFromCode("7d"), cardFromCode("9h")],
    }),
    new Map([["bb", 60]]),
  );
  const utg = deltas.find((d) => d.seatId === "utg")!;
  assert.equal(utg.vpip, true);
  assert.equal(utg.pfr, false);
});

run("applyHandDeltas accumulates public percents", () => {
  let a = emptyHudAccum();
  a = applyHandDeltas(a, {
    seatId: "x",
    vpip: true,
    pfr: true,
    threeBet: false,
    threeBetOpp: false,
    cbet: false,
    cbetOpp: false,
    sawFlop: false,
    wtsd: false,
    wonAtSd: false,
    foldPreflop: false,
    betRaise: 1,
    call: 0,
    won: true,
    netDelta: 50,
  });
  a = applyHandDeltas(a, {
    seatId: "x",
    vpip: false,
    pfr: false,
    threeBet: false,
    threeBetOpp: false,
    cbet: false,
    cbetOpp: false,
    sawFlop: false,
    wtsd: false,
    wonAtSd: false,
    foldPreflop: true,
    betRaise: 0,
    call: 0,
    won: false,
    netDelta: -20,
  });
  const pub = toPublicHud(a);
  assert.equal(pub.hands, 2);
  assert.equal(pub.vpipPct, 50);
  assert.equal(pub.pfrPct, 50);
  assert.equal(pub.foldPfPct, 50);
  assert.equal(pub.wonHands, 1);
  assert.equal(pub.netProfit, 30);
});

console.log("hud-stats tests done");
