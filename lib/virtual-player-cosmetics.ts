import { VIRTUAL_PLAYERS } from "@/lib/virtual-players";

/**
 * 少數虛擬玩家隨機裝備 AP 商店外觀（頭像框／名字色／氣泡）。
 * 刻意只給一小撮，避免聊天看起來「人人都掛特效」像機器人。
 */

export type VirtualPlayerCosmeticsCss = {
  avatarFrameClass: string | null;
  nameColorClass: string | null;
  chatBubbleClass: string | null;
};

/** 全體虛擬玩家中隨機抽取的人數（約 6–8%，看起來自然） */
const COSMETIC_PLAYER_COUNT = 7;

type ApRarity = "common" | "rare" | "epic" | "legendary" | "mythic";

const LOADOUTS: Record<
  ApRarity,
  Array<{
    frame: string;
    name: string;
    bubble: string;
  }>
> = {
  common: [
    {
      frame: "ap-frame-cyan",
      name: "ap-name-cyan",
      bubble: "ap-bubble-mint",
    },
    {
      frame: "ap-frame-mint-hex",
      name: "ap-name-lime",
      bubble: "ap-bubble-sky",
    },
  ],
  rare: [
    {
      frame: "ap-frame-violet",
      name: "ap-name-aurora",
      bubble: "ap-bubble-sunset",
    },
    {
      frame: "ap-frame-ember",
      name: "ap-name-rose",
      bubble: "ap-bubble-plasma",
    },
    {
      frame: "ap-frame-gold",
      name: "ap-name-ice",
      bubble: "ap-bubble-void",
    },
  ],
  epic: [
    {
      frame: "ap-frame-crystal",
      name: "ap-name-crimson",
      bubble: "ap-bubble-obsidian",
    },
    {
      frame: "ap-frame-void-orbit",
      name: "ap-name-aurora",
      bubble: "ap-bubble-plasma",
    },
  ],
  legendary: [
    {
      frame: "ap-frame-void-orbit",
      name: "ap-name-gold-legend",
      bubble: "ap-badge-rain-storm",
    },
    {
      frame: "ap-frame-eternal-rain",
      name: "ap-name-gold-legend",
      bubble: "ap-badge-rain-storm",
    },
  ],
  mythic: [
    {
      frame: "ap-frame-eternal-rain",
      name: "ap-name-prism-myth",
      bubble: "ap-badge-frog-aurora",
    },
  ],
};

function hashString(value: string, salt: number) {
  let hash = salt;
  for (const char of value) {
    hash = Math.imul(31, hash) + char.charCodeAt(0);
    hash |= 0;
  }
  return Math.abs(hash);
}

function rarityFromSeed(playerId: string): ApRarity {
  const roll = hashString(playerId, 419) % 100;
  if (roll < 8) return "mythic";
  if (roll < 22) return "legendary";
  if (roll < 42) return "epic";
  if (roll < 70) return "rare";
  return "common";
}

/** 以穩定 hash 打亂後取前 N 位，每位玩家是否有外觀跨重啟不變 */
function buildCosmeticAssignment(): Map<string, VirtualPlayerCosmeticsCss> {
  const shuffled = [...VIRTUAL_PLAYERS].sort(
    (a, b) => hashString(a.id, 907) - hashString(b.id, 907)
  );
  const picked = shuffled.slice(0, COSMETIC_PLAYER_COUNT);

  const map = new Map<string, VirtualPlayerCosmeticsCss>();
  for (const player of picked) {
    const rarity = rarityFromSeed(player.id);
    const options = LOADOUTS[rarity];
    const pick = options[hashString(player.id, 557) % options.length]!;
    map.set(player.id, {
      avatarFrameClass: pick.frame,
      nameColorClass: pick.name,
      chatBubbleClass: pick.bubble,
    });
  }
  return map;
}

const VIRTUAL_PLAYER_COSMETICS = buildCosmeticAssignment();

export function getVirtualPlayerCosmeticsCss(
  virtualPlayerId: string
): VirtualPlayerCosmeticsCss | null {
  return VIRTUAL_PLAYER_COSMETICS.get(virtualPlayerId) ?? null;
}

/** 測試／除錯：目前有裝備外觀的虛擬玩家 ID */
export function listVirtualPlayerIdsWithCosmetics(): string[] {
  return [...VIRTUAL_PLAYER_COSMETICS.keys()];
}
