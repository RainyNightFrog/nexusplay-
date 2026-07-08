const AVATAR_STYLES = [
  "notionists",
  "avataaars",
  "lorelei",
  "micah",
  "personas",
  "fun-emoji",
  "bottts",
  "pixel-art",
  "adventurer",
  "thumbs",
] as const;

function hashString(value: string, salt: number) {
  let hash = salt;
  for (const char of value) {
    hash = Math.imul(31, hash) + char.charCodeAt(0);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** 約七成虛擬玩家顯示不同風格的生成頭像 */
export function getVirtualPlayerAvatarUrl(playerId: string): string | null {
  if (hashString(playerId, 91) % 10 >= 7) {
    return null;
  }

  const style = AVATAR_STYLES[hashString(playerId, 37) % AVATAR_STYLES.length]!;
  const seed = encodeURIComponent(playerId);
  return `https://api.dicebear.com/9.x/${style}/png?seed=${seed}&size=128`;
}
