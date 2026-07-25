import type { Game } from "@/lib/games";
import {
  HOME_ANNOUNCEMENTS,
  type HomeAnnouncement,
  type HomeAnnouncementAccent,
} from "@/lib/home-announcements";
import { PLATFORM_GAMES, getPlatformGameMeta } from "@/lib/platform-catalog";

export type MarqueeAnnouncementItem = {
  kind: "announcement";
  id: string;
  label: string;
  href?: string;
  external?: boolean;
  accent?: HomeAnnouncementAccent;
};

export type MarqueeGameItem = {
  kind: "game";
  id: string;
  gameId: number;
  slug?: string | null;
  title: string;
  label: string;
  accent: HomeAnnouncementAccent;
};

export type MarqueeFeedItem = MarqueeAnnouncementItem | MarqueeGameItem;

export const GAME_PICK_TEMPLATE_KEYS = [
  "announcements.gameHot",
  "announcements.gameRecommend",
  "announcements.gamePlayNow",
  "announcements.gameTrending",
  "announcements.gameMustTry",
  "announcements.gameClickPlay",
] as const;

export type GamePickTemplateKey = (typeof GAME_PICK_TEMPLATE_KEYS)[number];

const ACCENT_CYCLE: HomeAnnouncementAccent[] = [
  "cyan",
  "violet",
  "fuchsia",
  "amber",
];

const PLATFORM_SLUGS = new Set(PLATFORM_GAMES.map((game) => game.slug));

export function shuffleInPlace<T>(items: T[], random = Math.random): void {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
}

export function pickRandomItems<T>(items: T[], count: number, random = Math.random): T[] {
  const copy = [...items];
  shuffleInPlace(copy, random);
  return copy.slice(0, Math.min(count, copy.length));
}

export function pickGameTemplateKey(random = Math.random): GamePickTemplateKey {
  const index = Math.floor(random() * GAME_PICK_TEMPLATE_KEYS.length);
  return GAME_PICK_TEMPLATE_KEYS[index] ?? GAME_PICK_TEMPLATE_KEYS[0];
}

export function resolveGameAccent(title: string, index: number): HomeAnnouncementAccent {
  const meta = getPlatformGameMeta(title);
  if (meta?.featuredAccent) {
    return meta.featuredAccent;
  }
  return ACCENT_CYCLE[index % ACCENT_CYCLE.length] ?? "cyan";
}

function isPlatformGame(game: Game): boolean {
  return Boolean(game.slug && PLATFORM_SLUGS.has(game.slug));
}

/**
 * 優先抽平台虛擬遊戲（街機 + demos），其餘再補社群作品，
 * 讓跑馬燈常出現可點擊直達的推薦。
 */
export function buildGameMarqueeItems(
  games: Game[],
  formatLabel: (templateKey: GamePickTemplateKey, title: string) => string,
  options?: { count?: number; random?: () => number }
): MarqueeGameItem[] {
  const random = options?.random ?? Math.random;
  const count = options?.count ?? 8;
  const platformGames = games.filter(isPlatformGame);
  const communityGames = games.filter((game) => !isPlatformGame(game));

  const platformQuota = Math.min(
    Math.max(Math.ceil(count * 0.65), Math.min(5, count)),
    platformGames.length,
    count
  );
  const communityQuota = Math.min(count - platformQuota, communityGames.length);

  const picks = [
    ...pickRandomItems(platformGames, platformQuota, random),
    ...pickRandomItems(communityGames, communityQuota, random),
  ];

  // 平台遊戲不足時，用社群作品補滿
  if (picks.length < count) {
    const usedIds = new Set(picks.map((game) => game.id));
    const leftovers = games.filter((game) => !usedIds.has(game.id));
    picks.push(...pickRandomItems(leftovers, count - picks.length, random));
  }

  shuffleInPlace(picks, random);

  return picks.map((game, index) => {
    const templateKey = pickGameTemplateKey(random);
    return {
      kind: "game" as const,
      id: `game-${game.id}`,
      gameId: game.id,
      slug: game.slug,
      title: game.title,
      label: formatLabel(templateKey, game.title),
      accent: resolveGameAccent(game.title, index),
    };
  });
}

export function buildAnnouncementMarqueeItems(
  formatLabel: (announcement: HomeAnnouncement) => string,
  uploadHref?: string,
  options?: { count?: number; random?: () => number }
): MarqueeAnnouncementItem[] {
  const random = options?.random ?? Math.random;
  const count = options?.count ?? HOME_ANNOUNCEMENTS.length;
  const selected = pickRandomItems(HOME_ANNOUNCEMENTS, count, random);

  return selected.map((announcement) => ({
    kind: "announcement" as const,
    id: announcement.id,
    label: formatLabel(announcement),
    href:
      announcement.id === "upload" && uploadHref
        ? uploadHref
        : announcement.href,
    external: announcement.external,
    accent: announcement.accent,
  }));
}

export function mergeMarqueeFeed(
  announcements: MarqueeAnnouncementItem[],
  games: MarqueeGameItem[],
  random = Math.random
): MarqueeFeedItem[] {
  const merged: MarqueeFeedItem[] = [...announcements, ...games];
  shuffleInPlace(merged, random);
  return merged;
}
