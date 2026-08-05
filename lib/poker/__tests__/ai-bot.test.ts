/**
 * AI 決策抽樣測試：弱牌不應無腦全下
 * 執行：npx tsx lib/poker/__tests__/ai-bot.test.ts
 */

import assert from "node:assert/strict";
import { decideBotAction } from "../ai-bot";
import { cardFromCode } from "../deck";
import type { HandSnapshot, SeatPlayer } from "../types";

function seat(partial: Partial<SeatPlayer> & Pick<SeatPlayer, "seatId" | "holeCards">): SeatPlayer {
  return {
    seatIndex: 0,
    name: "Bot",
    stack: 2000,
    streetCommitted: 0,
    committed: 0,
    folded: false,
    allIn: false,
    sittingOut: false,
    isBot: true,
    botProfile: "GTO_LITE",
    ...partial,
  };
}

function snap(over: Partial<HandSnapshot> & { seats: SeatPlayer[] }): HandSnapshot {
  return {
    handId: "t",
    street: "flop",
    board: [],
    potTotal: 100,
    sidePots: [],
    currentBet: 0,
    minRaiseTo: 40,
    buttonSeatIndex: 0,
    sbSeatIndex: 0,
    bbSeatIndex: 1,
    actingSeatId: "bot",
    actionLog: [],
    smallBlind: 10,
    bigBlind: 20,
    ...over,
  };
}

let fail = 0;
function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    fail += 1;
    console.error(`  ✗ ${name}`, e);
  }
}

console.log("ai-bot.test.ts");

run("trash hand facing large bet folds (not all-in call)", () => {
  const bot = seat({
    seatId: "bot",
    holeCards: [cardFromCode("2c"), cardFromCode("7d")],
    stack: 2000,
    streetCommitted: 0,
  });
  const s = snap({
    street: "turn",
    board: ["9h", "Js", "Kc", "3d"].map(cardFromCode),
    potTotal: 200,
    currentBet: 180,
    minRaiseTo: 360,
    seats: [
      bot,
      seat({
        seatId: "villain",
        seatIndex: 1,
        holeCards: [],
        streetCommitted: 180,
        stack: 1800,
      }),
    ],
  });
  /* 固定 rng：不觸發虛張 */
  const d = decideBotAction(s, "bot", () => 0.99);
  assert.equal(d.type, "fold");
});

run("nuts full house may value shove", () => {
  const bot = seat({
    seatId: "bot",
    holeCards: [cardFromCode("Ah"), cardFromCode("Ad")],
    stack: 500,
    streetCommitted: 0,
  });
  const s = snap({
    street: "river",
    board: ["As", "Kc", "Kd", "2h", "7c"].map(cardFromCode),
    potTotal: 400,
    currentBet: 0,
    minRaiseTo: 40,
    seats: [bot],
  });
  let sawAggressive = false;
  for (let i = 0; i < 20; i++) {
    const d = decideBotAction(s, "bot", () => i / 20);
    if (d.type === "bet" || d.type === "raise" || d.type === "all-in") {
      sawAggressive = true;
      break;
    }
  }
  assert.ok(sawAggressive);
});

run("medium strength does not open-shove deep stack on flop check", () => {
  const bot = seat({
    seatId: "bot",
    holeCards: [cardFromCode("Th"), cardFromCode("9h")],
    stack: 5000,
    streetCommitted: 0,
    botProfile: "GTO_LITE",
  });
  const s = snap({
    street: "flop",
    board: ["2c", "7d", "Jd"].map(cardFromCode),
    potTotal: 60,
    currentBet: 0,
    minRaiseTo: 40,
    seats: [bot],
  });
  let shoves = 0;
  for (let i = 0; i < 40; i++) {
    const d = decideBotAction(s, "bot", () => (i % 10) / 10);
    if (d.type === "all-in") shoves += 1;
  }
  assert.ok(shoves <= 2, `too many shoves: ${shoves}`);
});

if (fail) {
  console.error(`\n${fail} failed`);
  process.exit(1);
}
console.log("All ai-bot tests passed.\n");
