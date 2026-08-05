/**
 * 狀態機整合測試：盲注、跟注、all-in 邊池、攤牌
 * 執行：npx tsx lib/poker/__tests__/engine.test.ts
 */

import assert from "node:assert/strict";
import { Deck, cardFromCode, createDeck } from "../deck";
import { PokerHandEngine } from "../engine";
import { evaluateHand } from "../hand-evaluator";

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}`);
    throw e;
  }
}

/** 依指定順序建構牌組（先抽出的在前） */
function deckFromCodes(codes: string[]): Deck {
  const ordered = codes.map(cardFromCode);
  const used = new Set(ordered.map((c) => c.code));
  const rest = createDeck().filter((c) => !used.has(c.code));
  return new Deck([...ordered, ...rest]);
}

console.log("engine.test.ts");

run("heads-up blinds and fold awards pot", () => {
  // Deal order HU from SB: SB c1, BB c1, SB c2, BB c2
  // Then burn + flop...
  const deck = deckFromCodes([
    "As",
    "Kh", // SB, BB hole1
    "Ad",
    "Qc", // SB, BB hole2
    "2c", // burn
    "3d",
    "4h",
    "5s", // flop (unused if fold)
  ]);

  const engine = new PokerHandEngine();
  const start = engine.startHand({
    handId: "h1",
    smallBlind: 10,
    bigBlind: 20,
    buttonSeatIndex: 0,
    seats: [
      { seatId: "sb", seatIndex: 0, name: "SB", stack: 1000 },
      { seatId: "bb", seatIndex: 1, name: "BB", stack: 1000 },
    ],
    deck,
  });
  assert.equal(start.type, "hand-started");
  const snap = engine.snapshot!;
  assert.equal(snap.street, "preflop");
  // HU: button = SB
  assert.equal(snap.sbSeatIndex, 0);
  assert.equal(snap.bbSeatIndex, 1);
  // First to act preflop HU = BB's left = SB (button)
  assert.equal(snap.actingSeatId, "sb");

  const fold = engine.applyAction("sb", "fold");
  assert.equal(fold.type, "hand-complete");
  if (fold.type === "hand-complete") {
    assert.equal(fold.winners.get("bb"), 30); // 10+20
    const bb = fold.snapshot.seats.find((s) => s.seatId === "bb")!;
    assert.equal(bb.stack, 1000 - 20 + 30);
  }
});

run("3-way all-in side pots settle correctly", () => {
  // Seats 0,1,2 — button 0 → SB=1, BB=2; first actor = 0 (UTG)
  // Hole cards deal from SB(1): 
  // round1: s1, s2, s0
  // round2: s1, s2, s0
  // Give s0 AA, s1 KK, s2 QQ — board all low → A wins main, then compare side
  const deck = deckFromCodes([
    // deal order: seat1, seat2, seat0, seat1, seat2, seat0
    "Kh",
    "Qh",
    "Ah",
    "Kd",
    "Qd",
    "Ad",
    // burn + flop
    "2c",
    "3d",
    "4h",
    "5s",
    // burn + turn
    "6c",
    "7d",
    // burn + river
    "8c",
    "9d",
  ]);

  const engine = new PokerHandEngine();
  engine.startHand({
    handId: "h2",
    smallBlind: 50,
    bigBlind: 100,
    buttonSeatIndex: 0,
    seats: [
      { seatId: "a", seatIndex: 0, name: "A", stack: 100 }, // shortest
      { seatId: "b", seatIndex: 1, name: "B", stack: 300 },
      { seatId: "c", seatIndex: 2, name: "C", stack: 500 },
    ],
    deck,
  });

  // Preflop: A to act first — all-in 100
  let ev = engine.applyAction("a", "all-in");
  assert.ok(ev.type === "action" || ev.type === "street" || ev.type === "hand-complete");

  // B all-in 300 (has posted SB 50, stack left 250 → all-in adds 250, committed 300)
  if (!engine.isComplete) {
    assert.equal(engine.snapshot!.actingSeatId, "b");
    ev = engine.applyAction("b", "all-in");
  }

  // C calls / all-in covering
  if (!engine.isComplete) {
    assert.equal(engine.snapshot!.actingSeatId, "c");
    ev = engine.applyAction("c", "all-in");
  }

  // Should run out and complete
  assert.equal(ev.type, "hand-complete");
  if (ev.type === "hand-complete") {
    const total = [...ev.winners.values()].reduce((s, n) => s + n, 0);
    assert.equal(total, 100 + 300 + 500); // all chips in
    // A has AA — wins main pot 100*3=300
    assert.equal(ev.winners.get("a"), 300);
    // Side B vs C: 200*2=400 — KK vs QQ → B wins
    assert.equal(ev.winners.get("b"), 400);
    // C gets leftover uncontested 200
    assert.equal(ev.winners.get("c"), 200);
  }
});

run("timeout auto-folds when facing bet", () => {
  const engine = new PokerHandEngine();
  engine.startHand({
    handId: "h3",
    smallBlind: 10,
    bigBlind: 20,
    buttonSeatIndex: 0,
    seats: [
      { seatId: "sb", seatIndex: 0, name: "SB", stack: 500 },
      { seatId: "bb", seatIndex: 1, name: "BB", stack: 500 },
    ],
  });
  const ev = engine.applyTimeout("sb");
  assert.equal(ev.type, "hand-complete");
});

run("check-check advances to flop", () => {
  const engine = new PokerHandEngine();
  engine.startHand({
    handId: "h4",
    smallBlind: 10,
    bigBlind: 20,
    buttonSeatIndex: 0,
    seats: [
      { seatId: "a", seatIndex: 0, name: "A", stack: 1000 },
      { seatId: "b", seatIndex: 1, name: "B", stack: 1000 },
      { seatId: "c", seatIndex: 2, name: "C", stack: 1000 },
    ],
  });
  // button 0, SB=1, BB=2, UTG=0
  assert.equal(engine.snapshot!.actingSeatId, "a");
  engine.applyAction("a", "call"); // 20
  engine.applyAction("b", "call"); // 10 more
  const ev = engine.applyAction("c", "check");
  assert.equal(ev.type, "street");
  if (ev.type === "street") {
    assert.equal(ev.street, "flop");
    assert.equal(ev.board.length, 3);
  }
});

run("evaluate showdown winner helper sanity", () => {
  const board = ["2c", "3d", "4h", "9s", "Kd"].map(cardFromCode);
  const a = evaluateHand([...["Ah", "Ad"].map(cardFromCode), ...board]);
  const b = evaluateHand([...["Kh", "Qs"].map(cardFromCode), ...board]);
  assert.ok(a.score > b.score);
});

console.log("All engine tests passed.\n");
