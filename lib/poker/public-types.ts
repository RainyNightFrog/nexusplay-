/**
 * 客戶端／伺服器共用的公開牌桌狀態型別（勿依賴 node:crypto）
 */

import type { TableTierId } from "./types";

export type OccupantKind = "HUMAN" | "AI_BOT";

export type PublicSeat = {
  seatId: string;
  seatIndex: number;
  kind: OccupantKind;
  name: string;
  avatarUrl?: string | null;
  stack: number;
  sittingOut: boolean;
  isBot: boolean;
  holeCards?: string[];
  folded?: boolean;
  allIn?: boolean;
  streetCommitted?: number;
  committed?: number;
};

export type PublicTableState = {
  roomId: string;
  code: string;
  tier: TableTierId;
  smallBlind: number;
  bigBlind: number;
  minBuyIn: number;
  maxBuyIn: number;
  handNumber: number;
  buttonSeatIndex: number;
  seats: PublicSeat[];
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
