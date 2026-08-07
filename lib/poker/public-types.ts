/**
 * 客戶端／伺服器共用的公開牌桌狀態型別（勿依賴 node:crypto）
 */

import type { TableTierId } from "./types";
import type { PublicSeatHud } from "./hud-stats";

export type { PublicSeatHud };

export type OccupantKind = "HUMAN" | "AI_BOT";

export type PublicSeat = {
  seatId: string;
  seatIndex: number;
  kind: OccupantKind;
  name: string;
  avatarUrl?: string | null;
  stack: number;
  sittingOut: boolean;
  /** 休息結束時間戳（sittingOut 且 AFK 休息中） */
  restUntilMs?: number | null;
  isBot: boolean;
  holeCards?: string[];
  folded?: boolean;
  allIn?: boolean;
  streetCommitted?: number;
  committed?: number;
  /** 本桌 session 風格統計（點座位可看） */
  hud?: PublicSeatHud;
};

export type PublicTableState = {
  roomId: string;
  code: string;
  tier: TableTierId;
  /** 同額度內桌號 0–3 */
  slotIndex: number;
  /** 顯示名稱，例如「第 1 桌」 */
  labelZh: string;
  smallBlind: number;
  bigBlind: number;
  minBuyIn: number;
  maxBuyIn: number;
  handNumber: number;
  buttonSeatIndex: number;
  /** 當前手小盲座位（無進行中手牌時可為 null） */
  sbSeatIndex?: number | null;
  /** 當前手大盲座位 */
  bbSeatIndex?: number | null;
  seats: PublicSeat[];
  humanCount: number;
  botCount: number;
  seatedCount: number;
  maxSeats: number;
  /** 是否尚可立刻入座 */
  canJoin: boolean;
  /** 是否可排隊（已滿／手牌中） */
  canQueue?: boolean;
  /** 目前排隊人數 */
  queueCount?: number;
  street?: string;
  board?: string[];
  potTotal?: number;
  currentBet?: number;
  minRaiseTo?: number;
  actingSeatId?: string | null;
  turnDeadlineMs?: number | null;
};

export type PublicHandSnapshot = PublicTableState & {
  yourSeatId?: string;
};
