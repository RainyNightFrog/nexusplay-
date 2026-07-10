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

/** 依虛擬玩家 ID 產生穩定 DiceBear 頭像 URL */
export function resolveVirtualPlayerAvatarUrl(playerId: string): string {
  const style =
    AVATAR_STYLES[hashString(playerId, 37) % AVATAR_STYLES.length]!;
  const seed = encodeURIComponent(playerId);
  return `https://api.dicebear.com/9.x/${style}/png?seed=${seed}&size=128`;
}

/** @deprecated 請改用 resolveVirtualPlayerAvatarUrl */
export function getVirtualPlayerAvatarUrl(playerId: string): string | null {
  return resolveVirtualPlayerAvatarUrl(playerId);
}
