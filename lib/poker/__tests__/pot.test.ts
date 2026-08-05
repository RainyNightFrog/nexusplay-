/**
 * Pot / Side-pot / Split-pot 單元測試
 * 執行：npx tsx lib/poker/__tests__/pot.test.ts
 */

import assert from "node:assert/strict";
import {
  calculateSidePots,
  awardPots,
  aggregateAwards,
  totalPot,
  type PotContributor,
} from "../pot";

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}`);
    throw e;
  }
}

console.log("pot.test.ts");

run("single main pot — no all-in", () => {
  const c: PotContributor[] = [
    { seatId: "a", seatIndex: 0, committed: 100, folded: false },
    { seatId: "b", seatIndex: 1, committed: 100, folded: false },
  ];
  const pots = calculateSidePots(c);
  assert.equal(totalPot(pots), 200);
  assert.equal(pots.length, 1);
  assert.deepEqual(pots[0]!.eligibleSeatIds.sort(), ["a", "b"]);
});

run("3-way all-in side pots", () => {
  // A all-in 50, B all-in 100, C calls 200
  const c: PotContributor[] = [
    { seatId: "a", seatIndex: 0, committed: 50, folded: false },
    { seatId: "b", seatIndex: 1, committed: 100, folded: false },
    { seatId: "c", seatIndex: 2, committed: 200, folded: false },
  ];
  const pots = calculateSidePots(c);
  assert.equal(totalPot(pots), 350);

  // Main: 50*3=150, eligible A,B,C
  // Side1: 50*2=100, eligible B,C
  // Side2: 100*1=100, eligible C only → uncontested to C
  assert.ok(pots.length >= 2);

  const main = pots.find(
    (p) =>
      p.eligibleSeatIds.includes("a") &&
      p.eligibleSeatIds.includes("b") &&
      p.eligibleSeatIds.includes("c"),
  );
  assert.ok(main);
  assert.equal(main!.amount, 150);

  const sideBC = pots.find(
    (p) =>
      !p.eligibleSeatIds.includes("a") &&
      p.eligibleSeatIds.includes("b") &&
      p.eligibleSeatIds.includes("c"),
  );
  assert.ok(sideBC);
  assert.equal(sideBC!.amount, 100);

  const sideC = pots.find(
    (p) =>
      p.eligibleSeatIds.length === 1 && p.eligibleSeatIds[0] === "c",
  );
  assert.ok(sideC);
  assert.equal(sideC!.amount, 100);
});

run("folded player chips stay in pot but cannot win", () => {
  const c: PotContributor[] = [
    { seatId: "a", seatIndex: 0, committed: 100, folded: true },
    { seatId: "b", seatIndex: 1, committed: 100, folded: false },
    { seatId: "c", seatIndex: 2, committed: 100, folded: false },
  ];
  const pots = calculateSidePots(c);
  assert.equal(totalPot(pots), 300);
  assert.ok(!pots[0]!.eligibleSeatIds.includes("a"));
  assert.deepEqual(pots[0]!.eligibleSeatIds.sort(), ["b", "c"]);
});

run("split pot with odd chip — lower seatIndex gets remainder", () => {
  const pots = [
    { amount: 101, eligibleSeatIds: ["a", "b"] },
  ];
  const awards = awardPots(pots, [
    { seatId: "a", seatIndex: 0, handScore: 1000 },
    { seatId: "b", seatIndex: 1, handScore: 1000 },
  ]);
  const agg = aggregateAwards(awards);
  assert.equal(agg.get("a"), 51);
  assert.equal(agg.get("b"), 50);
  assert.equal((agg.get("a") ?? 0) + (agg.get("b") ?? 0), 101);
});

run("best hand wins side pot only among eligible", () => {
  const pots = calculateSidePots([
    { seatId: "a", seatIndex: 0, committed: 50, folded: false },
    { seatId: "b", seatIndex: 1, committed: 100, folded: false },
    { seatId: "c", seatIndex: 2, committed: 100, folded: false },
  ]);
  // A has best overall hand but only eligible for main
  const awards = awardPots(pots, [
    { seatId: "a", seatIndex: 0, handScore: 9000 },
    { seatId: "b", seatIndex: 1, handScore: 100 },
    { seatId: "c", seatIndex: 2, handScore: 500 },
  ]);
  const agg = aggregateAwards(awards);
  assert.equal(agg.get("a"), 150); // 50*3 main
  assert.equal(agg.get("c"), 100); // side B+C, C wins
  assert.equal(agg.get("b") ?? 0, 0);
});

console.log("All pot tests passed.\n");
