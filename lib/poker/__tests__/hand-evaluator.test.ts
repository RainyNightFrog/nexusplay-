/**
 * Hand evaluator 單元測試
 * 執行：npx tsx lib/poker/__tests__/hand-evaluator.test.ts
 */

import assert from "node:assert/strict";
import { cardFromCode } from "../deck";
import {
  evaluateHand,
  compareHands,
  isPairOrBetter,
} from "../hand-evaluator";

function cards(...codes: string[]) {
  return codes.map(cardFromCode);
}

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}`);
    throw e;
  }
}

console.log("hand-evaluator.test.ts");

run("royal flush beats straight flush", () => {
  const royal = evaluateHand(cards("Ah", "Kh", "Qh", "Jh", "Th", "2c", "3d"));
  const sf = evaluateHand(cards("9h", "Kh", "Qh", "Jh", "Th", "2c", "3d"));
  assert.equal(royal.category, "royal-flush");
  assert.equal(sf.category, "straight-flush");
  assert.ok(compareHands(royal, sf) > 0);
});

run("wheel straight A-5", () => {
  const wheel = evaluateHand(cards("Ah", "2c", "3d", "4s", "5h", "9c", "Kd"));
  assert.equal(wheel.category, "straight");
  assert.match(wheel.label, /5 high|Straight/);
});

run("full house vs flush", () => {
  const boat = evaluateHand(cards("Ah", "Ad", "Ac", "Kd", "Ks", "2c", "3d"));
  const flush = evaluateHand(cards("2h", "5h", "9h", "Jh", "Qh", "Ac", "Kd"));
  assert.equal(boat.category, "full-house");
  assert.equal(flush.category, "flush");
  assert.ok(compareHands(boat, flush) > 0);
});

run("two pair kicker decides", () => {
  const a = evaluateHand(cards("Ah", "Ad", "Kh", "Kd", "Qc", "2c", "3d"));
  const b = evaluateHand(cards("Ah", "As", "Kh", "Ks", "Jc", "2c", "3d"));
  assert.equal(a.category, "two-pair");
  assert.equal(b.category, "two-pair");
  assert.ok(compareHands(a, b) > 0);
});

run("identical hands tie", () => {
  const a = evaluateHand(cards("Ah", "Kd", "7c", "4s", "2h"));
  const b = evaluateHand(cards("As", "Kc", "7d", "4h", "2c"));
  assert.equal(compareHands(a, b), 0);
});

run("pair or better helper", () => {
  const pair = evaluateHand(cards("Ah", "Ad", "7c", "4s", "2h", "9c", "Jd"));
  const high = evaluateHand(cards("Ah", "Kd", "7c", "4s", "2h", "9c", "Jd"));
  assert.equal(isPairOrBetter(pair), true);
  assert.equal(isPairOrBetter(high), false);
});

run("four of a kind", () => {
  const quads = evaluateHand(cards("9h", "9d", "9c", "9s", "Ah", "2c", "3d"));
  assert.equal(quads.category, "four-of-a-kind");
});

console.log("All hand-evaluator tests passed.\n");
