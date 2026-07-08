"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Globe, Heart, Loader2, UserRound } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { FollowCreatorButton } from "@/components/creator/follow-creator-button";
import { UserBadge } from "@/components/UserBadge";
import { RssFeedLink } from "@/components/feeds/rss-feed-link";
import { FeedJsonLink } from "@/components/feeds/feed-json-link";
import { SiteHeader } from "@/components/layout/site-header";
import { Badge } from "@/components/ui/badge";
import { useGameFavoriteActions } from "@/hooks/use-game-favorite-actions";
import { useFormatCount } from "@/hooks/use-format-count";
import type { PublicCreatorProfile } from "@/lib/creator-public-service";
import { cn } from "@/lib/utils";

export default function CreatorPublicPage() {
  const t = useTranslations("creatorPublic");
  const th = useTranslations("home");
  const router = useRouter();
  const params = useParams();
  const creatorId = String(params.id ?? "");
  const { formatCount } = useFormatCount();
  const { favoriteCounts, loadFavoriteCounts } = useGameFavoriteActions();
  const [creator, setCreator] = useState<PublicCreatorProfile | null>(null);
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!creatorId) return;
    fetch(`/api/creators/${creatorId}`)
      .then((response) => response.json())
      .then((data: { creator?: PublicCreatorProfile; error?: string }) => {
        if (!data.creator) {
          setError(data.error ?? t("notFound"));
          return;
        }
        setCreator(data.creator);
      })
      .catch(() => setError(t("loadFailed")))
      .finally(() => setLoading(false));

    fetch(`/api/creators/${creatorId}/follow`)
      .then((response) => response.json())
      .then((data: { following?: boolean; followerCount?: number }) => {
        setFollowing(data.following === true);
        setFollowerCount(data.followerCount ?? 0);
      })
      .catch(() => undefined);
  }, [creatorId, t]);

  useEffect(() => {
    if (!creator?.games.length) return;
    void loadFavoriteCounts(creator.games.map((game) => game.id));
  }, [creator?.games, loadFavoriteCounts]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-violet-400" />
      </div>
    );
  }

  if (error || !creator) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-rose-400">{error ?? t("notFound")}</p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-4 text-sm text-violet-400 hover:underline"
        >
          {t("backHome")}
        </button>
      </div>
    );
  }

  return (
    <div className="dark relative min-h-full text-zinc-100">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <div className="flex size-20 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-zinc-900">
            {creator.avatarUrl ? (
              <Image
                src={creator.avatarUrl}
                alt={creator.displayName}
                width={80}
                height={80}
                className="size-full object-cover"
              />
            ) : (
              <UserRound className="size-10 text-violet-400" />
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">
              <UserBadge
                username={creator.displayName}
                title={creator.equippedTitle}
                usernameClassName="text-3xl font-bold text-white"
                titleClassName="text-sm"
              />
            </h1>
            <p className="mt-1 text-sm text-zinc-500">{t("memberSince", {
              date: new Date(creator.createdAt).toLocaleDateString(),
            })}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              {creator.website && (
                <a
                  href={creator.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-cyan-400 hover:underline"
                >
                  <Globe className="size-3.5" />
                  {t("website")}
                </a>
              )}
              {creator.twitter && (
                <span className="text-sm text-zinc-400">@{creator.twitter}</span>
              )}
              <RssFeedLink
                href={`/feed/creator/${creator.id}`}
                label={t("rssFeed")}
              />
              <a
                href={`/feed/creator/${creator.id}?format=atom`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-cyan-400/90 hover:text-cyan-300"
              >
                {t("atomFeed")}
              </a>
              <FeedJsonLink
                href={`/api/feeds/preview?feed=creator&id=${creator.id}&limit=10`}
                label={t("jsonFeed")}
              />
            </div>
          </div>
        </div>

        <FollowCreatorButton
          creatorId={creator.id}
          initialFollowing={following}
          initialFollowerCount={followerCount}
          className="mt-6 flex justify-center sm:justify-start"
        />

        <section className="mt-10">
          <h2 className="mb-4 text-lg font-semibold text-white">{t("gamesTitle")}</h2>
          {creator.games.length === 0 ? (
            <p className="text-sm text-zinc-500">{t("gamesEmpty")}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {creator.games.map((game) => (
                <Link
                  key={game.id}
                  href={`/game/${game.id}`}
                  className={cn(
                    "overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60",
                    "transition hover:border-violet-400/30 hover:shadow-lg hover:shadow-violet-500/10"
                  )}
                >
                  <div className="relative aspect-video">
                    <Image
                      src={game.coverUrl}
                      alt={game.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-white">{game.title}</h3>
                    <p className="mt-1 line-clamp-2 text-xs text-zinc-500">
                      {game.description}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge className="border-0 bg-white/10 text-zinc-300">
                        {game.category}
                      </Badge>
                      {game.tipsEnabled && (
                        <Badge className="border-0 bg-fuchsia-500/15 text-fuchsia-200">
                          {t("tipsEnabled")}
                        </Badge>
                      )}
                      {(favoriteCounts[game.id] ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs text-rose-300/90">
                          <Heart className="size-3.5" />
                          {formatCount(favoriteCounts[game.id] ?? 0)}{" "}
                          {th("statsFavorites")}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
