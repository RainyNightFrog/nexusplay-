import { getVirtualPlayerById } from "@/lib/virtual-players";

function hashString(value: string, salt: number) {
  let hash = salt;
  for (const char of value) {
    hash = Math.imul(31, hash) + char.charCodeAt(0);
    hash |= 0;
  }
  return Math.abs(hash);
}

const VIRTUAL_ACHIEVEMENT_HIGHLIGHTS = [
  "初次勝利",
  "論壇新手",
  "夜貓子",
  "收藏愛好者",
  "連勝入門",
  "社交蝴蝶",
  "創作起步",
  "打賞支持者",
  "排行榜常客",
  "平台元老",
] as const;

export type VirtualPlayerSocialStats = {
  isCreator: boolean;
  forumPostCount: number;
  achievementCount: number;
  achievementHighlights: string[];
  donatedTotal: number;
  tipsReceivedCount: number;
  publishedGames: number;
  website: string | null;
};

export function getVirtualPlayerSocialStats(
  playerId: string
): VirtualPlayerSocialStats | null {
  const player = getVirtualPlayerById(playerId);
  if (!player) return null;

  const h1 = hashString(playerId, 17);
  const h2 = hashString(playerId, 53);
  const h3 = hashString(playerId, 91);
  const isCreator = h1 % 6 === 0;
  const achievementCount = 1 + (h3 % 9);

  const highlights: string[] = [];
  for (let index = 0; index < Math.min(achievementCount, 4); index += 1) {
    const pick =
      VIRTUAL_ACHIEVEMENT_HIGHLIGHTS[
        (h2 + index * 7) % VIRTUAL_ACHIEVEMENT_HIGHLIGHTS.length
      ]!;
    if (!highlights.includes(pick)) highlights.push(pick);
  }

  return {
    isCreator,
    forumPostCount: h2 % 14,
    achievementCount,
    achievementHighlights: highlights,
    donatedTotal: (h1 % 28) * 10,
    tipsReceivedCount: isCreator ? h2 % 18 : 0,
    publishedGames: isCreator ? 1 + (h3 % 4) : 0,
    website: null,
  };
}
