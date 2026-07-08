"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { RssFeedLink } from "@/components/feeds/rss-feed-link";
import { FeedPreviewPanel } from "@/components/feeds/feed-preview-panel";
import { cn } from "@/lib/utils";

type GameFeedSubscribeSectionProps = {
  gameId: number;
};

export function GameFeedSubscribeSection({ gameId }: GameFeedSubscribeSectionProps) {
  const t = useTranslations("game");
  const tHome = useTranslations("home");
  const [previewOpen, setPreviewOpen] = useState(false);

  const jsonApiHref = `/api/feeds/preview?feed=game&id=${gameId}&limit=10`;

  return (
    <div className="mt-2 space-y-2">
      <p className="text-xs text-zinc-500">{t("gameFeedSubscribeHint")}</p>
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <RssFeedLink
          href={`/feed/game/${gameId}`}
          label={t("gameFeedRss")}
        />
        <span className="text-zinc-700" aria-hidden="true">
          ·
        </span>
        <a
          href={`/feed/game/${gameId}?format=atom`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-cyan-400/90 transition-colors hover:text-cyan-300"
        >
          {tHome("atomFeed")}
        </a>
        <span className="text-zinc-700" aria-hidden="true">
          ·
        </span>
        <button
          type="button"
          onClick={() => setPreviewOpen((open) => !open)}
          aria-expanded={previewOpen}
          className="inline-flex items-center gap-1 text-xs text-violet-400/90 transition-colors hover:text-violet-300"
        >
          {previewOpen ? t("gameFeedJsonHide") : t("gameFeedJson")}
          <ChevronDown
            className={cn(
              "size-3.5 transition-transform",
              previewOpen && "rotate-180"
            )}
          />
        </button>
      </div>

      {previewOpen && (
        <GameFeedPreviewPanel gameId={gameId} jsonApiHref={jsonApiHref} />
      )}
    </div>
  );
}

function GameFeedPreviewPanel({
  gameId,
  jsonApiHref,
}: {
  gameId: number;
  jsonApiHref: string;
}) {
  const tFeeds = useTranslations("feeds");

  return (
    <div className="mx-auto max-w-md rounded-xl border border-white/8 bg-zinc-950/50 px-3 py-2 text-center">
      <FeedPreviewPanel feed="game" gameId={gameId} centered />
      <p className="mt-2 border-t border-white/5 pt-2 text-[11px] text-zinc-600">
        {tFeeds("previewApiHint")}{" "}
        <a
          href={jsonApiHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-violet-400/90 hover:text-violet-300"
        >
          JSON
        </a>
      </p>
    </div>
  );
}
