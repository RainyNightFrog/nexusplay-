/**
 * Virtual Texas Hold'em — 核心型別與常數
 * 純虛擬積分制；無真實貨幣欄位。
 */

export type Suit = "c" | "d" | "h" | "s";
export type Rank =
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "T"
  | "J"
  | "Q"
  | "K"
  | "A";

/** 單張牌：rank 2–14（A=14），suit 0–3 */
export interface Card {
  rank: number;
  suit: number;
  /** 標準編碼，例如 "As", "Td" */
  code: string;
}

export type Street =
  | "waiting"
  | "preflop"
  | "flop"
  | "turn"
  | "river"
  | "showdown"
  | "complete";

export type PlayerActionType =
  | "fold"
  | "check"
  | "call"
  | "bet"
  | "raise"
  | "all-in";

export type TableTierId = "MICRO" | "LOW" | "MID" | "HIGH";

export type AiBotProfileId =
  | "LOOSE_PASSIVE"
  | "BALANCED"
  | "TIGHT_AGGRESSIVE"
  | "GTO_LITE";

export interface TableTierConfig {
  id: TableTierId;
  nameZh: string;
  smallBlind: number;
  bigBlind: number;
  minBuyIn: number;
  maxBuyIn: number;
  botProfile: AiBotProfileId;
}

/** 四級盲注／買入／AI 行為 */
export const TABLE_TIERS: Record<TableTierId, TableTierConfig> = {
  MICRO: {
    id: "MICRO",
    nameZh: "微額新手檯",
    smallBlind: 10,
    bigBlind: 20,
    minBuyIn: 1_000,
    maxBuyIn: 4_000,
    botProfile: "BALANCED",
  },
  LOW: {
    id: "LOW",
    nameZh: "低額娛樂檯",
    smallBlind: 100,
    bigBlind: 200,
    minBuyIn: 10_000,
    maxBuyIn: 40_000,
    botProfile: "GTO_LITE",
  },
  MID: {
    id: "MID",
    nameZh: "中額競技檯",
    smallBlind: 1_000,
    bigBlind: 2_000,
    minBuyIn: 100_000,
    maxBuyIn: 400_000,
    botProfile: "TIGHT_AGGRESSIVE",
  },
  HIGH: {
    id: "HIGH",
    nameZh: "高額大師檯",
    smallBlind: 10_000,
    bigBlind: 20_000,
    minBuyIn: 1_000_000,
    maxBuyIn: 4_000_000,
    botProfile: "GTO_LITE",
  },
};

/** 決策倒數（秒）與 Time Bank */
/** 行動倒數秒數（不含 time bank） */
export const TURN_TIMER_SECONDS = 15;
/** 額外思考時間庫（秒） */
export const TIME_BANK_SECONDS = 30;
/** 連續錯過幾次行動後進入休息 */
export const AFK_MISSED_TURNS_TO_REST = 2;
/** 休息時長：期間可點「回來了」；到期未回則自動離桌兌現 */
export const AFK_REST_MS = 10 * 60 * 1000;

/** 座位：固定 9 人桌（可有空位） */
export const MIN_SEATS = 2;
export const MAX_SEATS = 9;
/** 每個額度固定開放的牌桌數（供玩家自行挑選） */
export const TABLES_PER_TIER = 4;
/** 空桌時對手隨機人數下限／上限（每桌 5–9 人） */
export const TARGET_BOTS_MIN = 5;
export const TARGET_BOTS_MAX = 9;
/**
 * 真人入座可讓對手讓位，但至少保留此數量對手
 */
export const MIN_BOTS_AT_TABLE = 5;
/** @deprecated */
export const MIN_HUMANS_BEFORE_BOT_FILL = 3;

export const SUITS: Suit[] = ["c", "d", "h", "s"];
export const RANKS: Rank[] = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "T",
  "J",
  "Q",
  "K",
  "A",
];

export const RANK_VALUE: Record<Rank, number> = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  T: 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

export const SUIT_VALUE: Record<Suit, number> = {
  c: 0,
  d: 1,
  h: 2,
  s: 3,
};

export type HandCategory =
  | "high-card"
  | "pair"
  | "two-pair"
  | "three-of-a-kind"
  | "straight"
  | "flush"
  | "full-house"
  | "four-of-a-kind"
  | "straight-flush"
  | "royal-flush";

export const HAND_CATEGORY_RANK: Record<HandCategory, number> = {
  "high-card": 0,
  pair: 1,
  "two-pair": 2,
  "three-of-a-kind": 3,
  straight: 4,
  flush: 5,
  "full-house": 6,
  "four-of-a-kind": 7,
  "straight-flush": 8,
  "royal-flush": 9,
};

export interface EvaluatedHand {
  category: HandCategory;
  /** 可比較的整數分數（愈大愈強） */
  score: number;
  /** 最佳五張 */
  bestCards: Card[];
  label: string;
}

export interface PotShare {
  potIndex: number;
  amount: number;
  eligibleSeatIds: string[];
}

export interface SidePot {
  amount: number;
  /** 有資格爭奪此底池的座位 id（未蓋牌且貢獻達此層） */
  eligibleSeatIds: string[];
}

export interface SeatPlayer {
  seatId: string;
  seatIndex: number;
  name: string;
  stack: number;
  isBot: boolean;
  botProfile?: AiBotProfileId;
  /** 本手已投入底池總額 */
  committed: number;
  /** 本街已投入 */
  streetCommitted: number;
  holeCards: Card[];
  folded: boolean;
  allIn: boolean;
  sittingOut: boolean;
}

export interface PlayerAction {
  seatId: string;
  type: PlayerActionType;
  amount: number;
  street: Street;
  atMs: number;
}

export interface HandSnapshot {
  handId: string;
  street: Street;
  board: Card[];
  seats: SeatPlayer[];
  potTotal: number;
  sidePots: SidePot[];
  /** 當前需跟注至的金額（本街最高 committed） */
  currentBet: number;
  /** 最小加注增量（通常 = BB，之後 = 上一次加注額） */
  minRaiseTo: number;
  buttonSeatIndex: number;
  sbSeatIndex: number;
  bbSeatIndex: number;
  actingSeatId: string | null;
  actionLog: PlayerAction[];
  smallBlind: number;
  bigBlind: number;
}
