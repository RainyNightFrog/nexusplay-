import { VIRTUAL_PLAYERS } from "@/lib/virtual-players";

/**
 * 少數虛擬玩家裝備 AP 商店外觀。
 * 人選＝貢獻榜虛擬池（同 LEADERBOARD_VIRTUAL_DONATION_COUNT 邏輯）中打賞金額最高的若干位；
 * 稀有度依模擬貢獻金額分級。
 */

export type VirtualPlayerCosmeticsCss = {
  avatarFrameClass: string | null;
  nameColorClass: string | null;
  chatBubbleClass: string | null;
};

/** 與 platform-leaderboard-virtual 貢獻榜池一致 */
const DONATION_POOL_COUNT = 20;
const COSMETIC_PLAYER_COUNT = 8;
const DONATION_MIN_USD = 1;
const DONATION_MAX_USD = 160;

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

/** 與貢獻榜 getVirtualDonationUsd 相同演算法 */
function getVirtualDonationUsd(playerId: string): number {
  const span = DONATION_MAX_USD - DONATION_MIN_USD + 1;
  const dollars = DONATION_MIN_USD + (hashString(playerId, 241) % span);
  const cents = hashString(playerId, 313) % 100;
  return Math.round((dollars + cents / 100) * 100) / 100;
}

function rarityFromDonationUsd(amountUsd: number): ApRarity {
  if (amountUsd >= 140) return "mythic";
  if (amountUsd >= 110) return "legendary";
  if (amountUsd >= 80) return "epic";
  if (amountUsd >= 45) return "rare";
  return "common";
}

/** 貢獻榜虛擬池（hash 389 取前 20）中，打賞最高的 COSMETIC_PLAYER_COUNT 位 */
function buildCosmeticAssignment(): Map<string, VirtualPlayerCosmeticsCss> {
  const pool = [...VIRTUAL_PLAYERS]
    .sort((a, b) => hashString(a.id, 389) - hashString(b.id, 389))
    .slice(0, DONATION_POOL_COUNT)
    .map((player) => ({
      id: player.id,
      donationUsd: getVirtualDonationUsd(player.id),
    }))
    .sort((a, b) => {
      if (b.donationUsd !== a.donationUsd) return b.donationUsd - a.donationUsd;
      return a.id.localeCompare(b.id);
    })
    .slice(0, COSMETIC_PLAYER_COUNT);

  const map = new Map<string, VirtualPlayerCosmeticsCss>();
  for (const entry of pool) {
    const rarity = rarityFromDonationUsd(entry.donationUsd);
    const options = LOADOUTS[rarity];
    const pick = options[hashString(entry.id, 557) % options.length]!;
    map.set(entry.id, {
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
