/**
 * 撲克桌對手／積分榜：使用平台既有虛擬玩家名單（對外不當「虛擬」標籤）。
 * 約 68 人固定池；積分為決定性時間漂移，名次會緩慢交換。
 */

import { resolveVirtualPlayerAvatarUrl } from "@/lib/virtual-player-avatar";
import {
  VIRTUAL_PLAYERS,
  type VirtualPlayer,
} from "@/lib/virtual-players";
import type { AiBotProfileId } from "./types";

/** 撲克常客池：使用全站虛擬玩家（約 95 人），支撐 16 桌 × 5–9 人 */
export const POKER_VIRTUAL_ROSTER_SIZE = VIRTUAL_PLAYERS.length;

function hashString(value: string, salt: number): number {
  let hash = salt;
  for (let i = 0; i < value.length; i++) {
    hash = Math.imul(31, hash) + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

let cachedRoster: VirtualPlayer[] | null = null;

/** 撲克桌／積分榜用的常客名單（全站虛擬玩家） */
export function getPokerVirtualRoster(): VirtualPlayer[] {
  if (cachedRoster) return cachedRoster;
  const sorted = [...VIRTUAL_PLAYERS].sort(
    (a, b) => hashString(a.id, 91) - hashString(b.id, 91),
  );
  cachedRoster = sorted.slice(0, POKER_VIRTUAL_ROSTER_SIZE);
  return cachedRoster;
}

/** 入座最短停留（毫秒）：約 12–28 分鐘，避免頻繁換人 */
export function randomVirtualStayMs(rng: () => number = Math.random): number {
  const minMin = 12;
  const maxMin = 28;
  return (minMin + Math.floor(rng() * (maxMin - minMin + 1))) * 60_000;
}

export function pokerBotProfileForPlayer(playerId: string): AiBotProfileId {
  /* 偏 GTO／緊兇，大幅降低鬆被動（避免亂跟亂推） */
  const profiles: AiBotProfileId[] = [
    "GTO_LITE",
    "GTO_LITE",
    "TIGHT_AGGRESSIVE",
    "TIGHT_AGGRESSIVE",
    "BALANCED",
    "GTO_LITE",
  ];
  return profiles[hashString(playerId, 41) % profiles.length]!;
}

export function resolvePokerVirtualAvatar(playerId: string): string {
  return resolveVirtualPlayerAvatarUrl(playerId);
}

/**
 * 依穩定順位給積分：頭 15 名約 930 萬～6500 萬，其餘更低。
 * 再加時間微抖，讓鄰近名次會緩慢互換。
 */
function pointsForStableIndex(
  playerId: string,
  index: number,
  total: number,
  nowMs: number,
): number {
  const h2 = hashString(playerId, 53);
  const h3 = hashString(playerId, 99);

  let base: number;
  if (index < 15) {
    const t = index / 14;
    const eased = t ** 0.82;
    base = 65_500_000 - eased * (65_500_000 - 9_300_000);
  } else {
    const t = (index - 15) / Math.max(1, total - 15);
    base = 8_800_000 - t * 8_000_000;
  }

  const dayPhase = ((nowMs / 86_400_000) + (h3 % 100) / 100) % 1;
  const sessionWave =
    Math.sin(dayPhase * Math.PI * 2) * (base * (0.01 + (h2 % 10) / 1000));

  const hourBucket = Math.floor(nowMs / 3_600_000);
  const hourJitter =
    ((hashString(`${playerId}:h${hourBucket}`, 7) % 2000) / 2000 - 0.5) *
    base *
    0.022;

  const slot = Math.floor(nowMs / (17 * 60_000));
  const slotJitter =
    ((hashString(`${playerId}:s${slot}`, 13) % 2000) / 2000 - 0.5) *
    base *
    0.012;

  const dow = new Date(nowMs).getUTCDay();
  const weekendBoost =
    dow === 0 || dow === 6 ? base * 0.006 : -base * 0.002;

  return Math.max(80_000, Math.floor(base + sessionWave + hourJitter + slotJitter + weekendBoost));
}

/** @deprecated 改由 listPokerVirtualLeaderRows 依順位計算；保留給單點查詢 */
export function computePokerVirtualPoints(
  playerId: string,
  nowMs = Date.now(),
): number {
  const ordered = [...getPokerVirtualRoster()].sort(
    (a, b) => hashString(b.id, 17) - hashString(a.id, 17),
  );
  const index = Math.max(
    0,
    ordered.findIndex((p) => p.id === playerId),
  );
  return pointsForStableIndex(playerId, index, ordered.length, nowMs);
}

export type PokerVirtualLeaderRow = {
  virtualPlayerId: string;
  displayName: string;
  avatarUrl: string;
  pointsBalance: number;
};

export function listPokerVirtualLeaderRows(
  nowMs = Date.now(),
): PokerVirtualLeaderRow[] {
  const ordered = [...getPokerVirtualRoster()].sort(
    (a, b) => hashString(b.id, 17) - hashString(a.id, 17),
  );
  return ordered
    .map((p, index) => ({
      virtualPlayerId: p.id,
      displayName: p.displayName,
      avatarUrl: resolveVirtualPlayerAvatarUrl(p.id),
      pointsBalance: pointsForStableIndex(
        p.id,
        index,
        ordered.length,
        nowMs,
      ),
    }))
    .sort((a, b) => b.pointsBalance - a.pointsBalance);
}
