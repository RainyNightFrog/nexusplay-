import { VIRTUAL_PLAYERS } from "@/lib/virtual-players";

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

/** 虛擬玩家以外的搞笑預設頭像（多風格 DiceBear） */
const EXTRA_AVATAR_PRESETS = [
  { id: "fun-01", displayName: "廢鐵機器人" },
  { id: "fun-02", displayName: "笑到抽筋" },
  { id: "fun-03", displayName: "像素青蛙" },
  { id: "fun-04", displayName: "霓虹拇指" },
  { id: "fun-05", displayName: "冒險貓" },
  { id: "fun-06", displayName: "呆萌圓臉" },
  { id: "fun-07", displayName: "賽博貓頭鷹" },
  { id: "fun-08", displayName: "太空鴨" },
  { id: "fun-09", displayName: "幽靈表情" },
  { id: "fun-10", displayName: "機械小狗" },
  { id: "fun-11", displayName: "夜市攤販" },
  { id: "fun-12", displayName: "打機熊貓" },
  { id: "fun-13", displayName: "泡麵戰士" },
  { id: "fun-14", displayName: "鍵盤武士" },
  { id: "fun-15", displayName: "咖啡因幽靈" },
  { id: "fun-16", displayName: "西瓜頭" },
  { id: "fun-17", displayName: "章魚船長" },
  { id: "fun-18", displayName: "雷達蝦" },
  { id: "fun-19", displayName: "雲端蝸牛" },
  { id: "fun-20", displayName: "螢光水母" },
  { id: "fun-21", displayName: "週末戰士" },
  { id: "fun-22", displayName: "遲到專家" },
  { id: "fun-23", displayName: "AFK 大師" },
  { id: "fun-24", displayName: "連輸十把" },
  { id: "fun-25", displayName: "幸運非酋" },
  { id: "fun-26", displayName: "爆肝夜貓" },
  { id: "fun-27", displayName: "摸魚達人" },
  { id: "fun-28", displayName: "社恐選手" },
  { id: "fun-29", displayName: "嘴砲砲手" },
  { id: "fun-30", displayName: "躺平冠軍" },
] as const;

export type SelectableAvatarPreset = {
  id: string;
  displayName: string;
  url: string;
};

function hashString(value: string, salt: number) {
  let hash = salt;
  for (const char of value) {
    hash = Math.imul(31, hash) + char.charCodeAt(0);
    hash |= 0;
  }
  return Math.abs(hash);
}

function styleForSeed(seed: string) {
  return AVATAR_STYLES[hashString(seed, 37) % AVATAR_STYLES.length]!;
}

/** 依種子產生穩定 DiceBear 頭像 URL（走同源代理，避免手機擋 api.dicebear.com） */
export function resolveDiceBearAvatarUrl(
  seed: string,
  size: number = 128
): string {
  const style = styleForSeed(seed);
  const encoded = encodeURIComponent(seed);
  const safeSize = Math.min(Math.max(Math.round(size), 32), 512);
  return `/api/avatar/dicebear/9.x/${style}/png?seed=${encoded}&size=${safeSize}`;
}

/** 依虛擬玩家 ID 產生穩定 DiceBear 頭像 URL */
export function resolveVirtualPlayerAvatarUrl(
  playerId: string,
  size: number = 128
): string {
  return resolveDiceBearAvatarUrl(playerId, size);
}

/** @deprecated 請改用 resolveVirtualPlayerAvatarUrl */
export function getVirtualPlayerAvatarUrl(playerId: string): string | null {
  return resolveVirtualPlayerAvatarUrl(playerId);
}

/** 個人資料可選的全部預設頭像（虛擬玩家 + 額外搞笑款） */
export function listSelectableAvatarPresets(
  size: number = 128
): SelectableAvatarPreset[] {
  const fromVirtual = VIRTUAL_PLAYERS.map((player) => ({
    id: player.id,
    displayName: player.displayName,
    url: resolveVirtualPlayerAvatarUrl(player.id, size),
  }));

  const fromExtra = EXTRA_AVATAR_PRESETS.map((preset) => ({
    id: preset.id,
    displayName: preset.displayName,
    url: resolveDiceBearAvatarUrl(preset.id, size),
  }));

  return [...fromVirtual, ...fromExtra];
}

const PRESET_ID_SET = new Set(
  listSelectableAvatarPresets().map((preset) => preset.id)
);

export function isSelectableAvatarPresetId(id: string): boolean {
  return PRESET_ID_SET.has(id);
}

/** 判斷目前頭像 URL 是否對應某個預設頭像（忽略 size 差異） */
export function avatarUrlMatchesPresetId(
  avatarUrl: string | null | undefined,
  presetId: string
): boolean {
  if (!avatarUrl) return false;
  try {
    const url = new URL(avatarUrl, "http://localhost");
    const isDicebear =
      url.hostname.includes("dicebear.com") ||
      url.pathname.startsWith("/api/avatar/dicebear/");
    if (!isDicebear) return false;
    return url.searchParams.get("seed") === presetId;
  } catch {
    return false;
  }
}

export function resolveSelectableAvatarPresetUrl(
  presetId: string,
  size: number = 256
): string | null {
  if (!isSelectableAvatarPresetId(presetId)) return null;
  return resolveDiceBearAvatarUrl(presetId, size);
}

export const AVATAR_PRESET_PAGE_SIZE = 12;
