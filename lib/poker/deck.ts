/**
 * 牌組：建立、洗牌、發牌（Fisher–Yates）
 */

import {
  type Card,
  type Rank,
  type Suit,
  RANKS,
  SUITS,
  RANK_VALUE,
  SUIT_VALUE,
} from "./types";

export function cardFromCode(code: string): Card {
  if (code.length !== 2) {
    throw new Error(`Invalid card code: ${code}`);
  }
  const rankChar = code[0] as Rank;
  const suitChar = code[1]!.toLowerCase() as Suit;
  if (!(rankChar in RANK_VALUE) || !(suitChar in SUIT_VALUE)) {
    throw new Error(`Invalid card code: ${code}`);
  }
  return {
    rank: RANK_VALUE[rankChar],
    suit: SUIT_VALUE[suitChar],
    code: `${rankChar}${suitChar}`,
  };
}

export function cardToCode(card: Card): string {
  return card.code;
}

/** 標準 52 張 */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const r of RANKS) {
    for (const s of SUITS) {
      deck.push({
        rank: RANK_VALUE[r],
        suit: SUIT_VALUE[s],
        code: `${r}${s}`,
      });
    }
  }
  return deck;
}

/**
 * Fisher–Yates 洗牌。
 * @param rng 可注入隨機源（測試用）；預設 Math.random
 */
export function shuffleDeck(
  deck: Card[],
  rng: () => number = Math.random,
): Card[] {
  const out = deck.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}

export class Deck {
  private cards: Card[];

  constructor(cards?: Card[], rng?: () => number) {
    this.cards = cards
      ? cards.slice()
      : shuffleDeck(createDeck(), rng ?? Math.random);
  }

  get remaining(): number {
    return this.cards.length;
  }

  draw(n = 1): Card[] {
    if (n > this.cards.length) {
      throw new Error(`Cannot draw ${n}; only ${this.cards.length} left`);
    }
    return this.cards.splice(0, n);
  }

  /** 燒牌（burn）後發 n 張 */
  burnAndDraw(n: number): Card[] {
    if (this.cards.length < n + 1) {
      throw new Error("Not enough cards to burn and draw");
    }
    this.cards.shift();
    return this.draw(n);
  }
}
