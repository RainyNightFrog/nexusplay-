import type { Game } from "@/lib/games";
import {
  HOME_ANNOUNCEMENTS,
  type HomeAnnouncement,
  type HomeAnnouncementAccent,
} from "@/lib/home-announcements";
import { getPlatformGameMeta } from "@/lib/platform-catalog";

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
] as const;

export type GamePickTemplateKey = (typeof GAME_PICK_TEMPLATE_KEYS)[number];

const ACCENT_CYCLE: HomeAnnouncementAccent[] = [
  "cyan",
  "violet",
  "fuchsia",
  "amber",
];

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

export function buildGameMarqueeItems(
  games: Game[],
  formatLabel: (templateKey: GamePickTemplateKey, title: string) => string,
  options?: { count?: number; random?: () => number }
): MarqueeGameItem[] {
  const random = options?.random ?? Math.random;
  const count = options?.count ?? 6;
  const picks = pickRandomItems(games, count, random);

  return picks.map((game, index) => {
    const templateKey = pickGameTemplateKey(random);
    return {
      kind: "game" as const,
      id: `game-${game.id}`,
      gameId: game.id,
      title: game.title,
      label: formatLabel(templateKey, game.title),
      accent: resolveGameAccent(game.title, index),
    };
  });
}

export function buildAnnouncementMarqueeItems(
  formatLabel: (announcement: HomeAnnouncement) => string,
  uploadHref?: string
): MarqueeAnnouncementItem[] {
  return HOME_ANNOUNCEMENTS.map((announcement) => ({
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
