"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Gamepad2, Megaphone, Zap } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Game } from "@/lib/games";
import {
  HOME_ANNOUNCEMENT_ACCENT_CLASS,
  type HomeAnnouncementAccent,
} from "@/lib/home-announcements";
import {
  buildAnnouncementMarqueeItems,
  buildGameMarqueeItems,
  mergeMarqueeFeed,
  type GamePickTemplateKey,
  type MarqueeFeedItem,
} from "@/lib/marquee-feed";
import { cn } from "@/lib/utils";

type AnnouncementMarqueeProps = {
  uploadHref?: string;
};

const GAME_PICK_COUNT = 6;
const FEED_ROTATE_MS = 3 * 60 * 1000;

function MarqueeSeparator() {
  return (
    <span
      className="nexus-marquee-separator shrink-0 text-base font-bold"
      aria-hidden="true"
    >
      ◆
    </span>
  );
}

function MarqueeBadge({ label }: { label: string }) {
  return (
    <span className="nexus-marquee-badge inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em]">
      <Zap className="size-3" aria-hidden="true" />
      {label}
    </span>
  );
}

function MarqueeText({
  label,
  href,
  external,
  accent = "cyan",
  gameIcon = false,
}: {
  label: string;
  href?: string;
  external?: boolean;
  accent?: HomeAnnouncementAccent;
  gameIcon?: boolean;
}) {
  const accentClass = HOME_ANNOUNCEMENT_ACCENT_CLASS[accent];
  const className = cn(
    "inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold tracking-wide transition-opacity hover:opacity-80",
    accentClass
  );
  const content = (
    <>
      {gameIcon && <Gamepad2 className="size-3.5 shrink-0 opacity-90" aria-hidden="true" />}
      <span>{label}</span>
    </>
  );

  if (!href) {
    return <span className={className}>{content}</span>;
  }

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {content}
      </a>
    );
  }

  if (href.startsWith("#")) {
    return (
      <a href={href} className={className}>
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}

function MarqueeLeadBlock({ label }: { label: string }) {
  return (
    <>
      <MarqueeBadge label={label} />
      <MarqueeSeparator />
      <span className="inline-flex shrink-0 items-center gap-1.5 text-cyan-300/90">
        <Megaphone className="size-3.5" aria-hidden="true" />
        <span className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-200/80">
          LIVE
        </span>
      </span>
      <MarqueeSeparator />
    </>
  );
}

export function AnnouncementMarquee({ uploadHref }: AnnouncementMarqueeProps) {
  const t = useTranslations("home");
  const [games, setGames] = useState<Game[]>([]);
  const [feedSeed, setFeedSeed] = useState(0);
  const [mounted, setMounted] = useState(false);

  const formatGameLabel = useCallback(
    (templateKey: GamePickTemplateKey, title: string) =>
      t(templateKey, { title }),
    [t]
  );

  const feedItems = useMemo(() => {
    const announcements = buildAnnouncementMarqueeItems(
      (announcement) => t(announcement.messageKey),
      uploadHref
    );
    const gameItems = buildGameMarqueeItems(games, formatGameLabel, {
      count: GAME_PICK_COUNT,
    });

    return mergeMarqueeFeed(announcements, gameItems);
  }, [feedSeed, formatGameLabel, games, t, uploadHref]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const trackSegments = useMemo(() => {
    if (feedItems.length === 0) {
      return [];
    }
    return [feedItems, feedItems];
  }, [feedItems]);

  useEffect(() => {
    let cancelled = false;

    async function loadGames() {
      try {
        const response = await fetch("/api/games?sort=views");
        const data = (await response.json()) as { games?: Game[] };
        if (!cancelled) {
          setGames(data.games ?? []);
        }
      } catch {
        if (!cancelled) {
          setGames([]);
        }
      }
    }

    void loadGames();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setFeedSeed((current) => current + 1);
    }, FEED_ROTATE_MS);

    return () => window.clearInterval(timer);
  }, []);

  if (!mounted) {
    return (
      <section
        className="nexus-announcement-marquee relative mb-8 w-full overflow-hidden"
        aria-hidden="true"
      >
        <div className="nexus-announcement-marquee-border absolute inset-x-0 top-0 h-px" />
        <div className="nexus-announcement-marquee-border absolute inset-x-0 bottom-0 h-px" />
        <div className="nexus-announcement-marquee-bg absolute inset-0" />
        <div className="relative py-3 sm:py-3.5" />
      </section>
    );
  }

  return (
    <section
      className="nexus-announcement-marquee relative mb-8 w-full overflow-hidden"
      aria-label={t("announcements.label")}
    >
      <div className="nexus-announcement-marquee-border absolute inset-x-0 top-0 h-px" />
      <div className="nexus-announcement-marquee-border absolute inset-x-0 bottom-0 h-px" />
      <div className="nexus-announcement-marquee-bg absolute inset-0" />
      <div className="nexus-announcement-marquee-shimmer pointer-events-none absolute inset-0" />

      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent sm:w-24" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-zinc-950 via-zinc-950/80 to-transparent sm:w-24" />

      <div className="relative overflow-hidden py-3 sm:py-3.5">
        <div
          key={feedSeed}
          className="nexus-announcement-marquee-track flex w-max items-center gap-10 sm:gap-12"
        >
          {trackSegments.flatMap((segment, segmentIndex) =>
            segment.map((item, itemIndex) => (
              <div
                key={`${feedSeed}-${segmentIndex}-${item.kind}-${item.id}-${itemIndex}`}
                className="flex shrink-0 items-center gap-10 sm:gap-12"
              >
                {itemIndex === 0 && (
                  <MarqueeLeadBlock label={t("announcements.label")} />
                )}
                <MarqueeFeedEntry item={item} />
                <MarqueeSeparator />
              </div>
            ))
          )}
        </div>
      </div>

      <ul className="sr-only">
        {feedItems.map((item) => (
          <li key={item.id}>
            {item.kind === "game" ? item.label : item.label}
          </li>
        ))}
      </ul>
    </section>
  );
}

function MarqueeFeedEntry({ item }: { item: MarqueeFeedItem }) {
  if (item.kind === "game") {
    return (
      <MarqueeText
        label={item.label}
        href={`/game/${item.gameId}`}
        accent={item.accent}
        gameIcon
      />
    );
  }

  return (
    <MarqueeText
      label={item.label}
      href={item.href}
      external={item.external}
      accent={item.accent}
    />
  );
}
