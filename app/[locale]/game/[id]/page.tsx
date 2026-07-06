"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { useParams, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Code2,
  Copy,
  Gamepad2,
  Heart,
  Loader2,
  Maximize2,
  MessagesSquare,
  Share2,
  ThumbsUp,
  Upload,
  User,
  Users,
  X,
} from "lucide-react";
import { GameEmbedBridge } from "@/components/game/game-embed-bridge";
import { SupporterWall } from "@/components/game/supporter-wall";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { SiteHeader } from "@/components/layout/site-header";
import { LeaderboardNavButton } from "@/components/LeaderboardModal";
import { Link, useRouter } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { isDirectlyPlayable } from "@/lib/games-data";
import { buildEmbedCode, IFRAME_SANDBOX } from "@/lib/iframe-sandbox";
import { isSafeEmbedUrl } from "@/lib/embed-url";
import { TAG_COLORS, type Game } from "@/lib/games";
import { useGameI18n } from "@/hooks/use-game-i18n";
import { useAuth } from "@/hooks/use-auth";
import { useFormatCount } from "@/hooks/use-format-count";
import { useApiError } from "@/hooks/use-api-error";
import { useEscapeKey, useScrollLock } from "@/hooks/use-scroll-lock";
import { cn } from "@/lib/utils";
import { trackGaEvent } from "@/components/analytics/google-analytics";

const TipSupportPanel = dynamic(
  () =>
    import("@/components/game/tip-support-panel").then(
      (module) => module.TipSupportPanel
    ),
  { ssr: false }
);

const GameDetailSections = dynamic(
  () =>
    import("@/components/game/game-detail-sections").then(
      (module) => module.GameDetailSections
    ),
  { ssr: false }
);

function GamePageFallback() {
  const tc = useTranslations("common");

  return (
    <div className="dark flex min-h-full flex-col items-center justify-center px-4 text-zinc-100">
      <Loader2 className="mb-4 size-10 animate-spin text-cyan-400" />
      <p className="text-sm text-zinc-400">{tc("loadingGame")}</p>
    </div>
  );
}

export default function GamePage() {
  return (
    <Suspense fallback={<GamePageFallback />}>
      <GamePageContent />
    </Suspense>
  );
}

function GamePageContent() {
  const t = useTranslations("game");
  const td = useTranslations("dashboard");
  const tc = useTranslations("common");
  const tn = useTranslations("nav");
  const locale = useLocale();
  const { localizedDescription, localizedTag } = useGameI18n();
  const { formatCount } = useFormatCount();
  const { translateApiError } = useApiError();
  const { profile } = useAuth();
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const gameId = params.id as string;

  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [forumPostCount, setForumPostCount] = useState(0);
  const [isDraftPreview, setIsDraftPreview] = useState(false);
  const [isPartnerPreview, setIsPartnerPreview] = useState(false);

  const [liked, setLiked] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [favoriteSubmitting, setFavoriteSubmitting] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [showEmbed, setShowEmbed] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2500);
  }, []);

  const closeFullscreen = useCallback(() => setShowFullscreen(false), []);
  const closeEmbed = useCallback(() => setShowEmbed(false), []);

  useScrollLock(showFullscreen || showEmbed);
  useEscapeKey(showFullscreen, closeFullscreen);
  useEscapeKey(showEmbed, closeEmbed);

  useEffect(() => {
    const root = document.documentElement;
    if (showFullscreen || showEmbed) {
      root.dataset.gameModalOpen = "true";
    } else {
      delete root.dataset.gameModalOpen;
    }
    return () => {
      delete root.dataset.gameModalOpen;
    };
  }, [showFullscreen, showEmbed]);

  useEffect(() => {
    let cancelled = false;

    async function loadGame() {
      setLoading(true);
      setLoadError(null);

      try {
        const response = await fetch(`/api/games/${gameId}`, {
          credentials: "same-origin",
        });
        const data = (await response.json()) as {
          game?: Game;
          error?: string;
          isDraftPreview?: boolean;
          isPartnerPreview?: boolean;
        };

        if (!response.ok || !data.game) {
          if (!cancelled) {
            setGame(null);
            setLoadError(translateApiError(data.error) ?? tc("notFound"));
          }
          return;
        }

        let loadedGame = data.game;

        if (!isDirectlyPlayable(loadedGame.embedUrl)) {
          if (!cancelled) setMigrating(true);

          const migrateResponse = await fetch(`/api/games/${gameId}/migrate`, {
            method: "POST",
          });
          const migrateData = (await migrateResponse.json()) as {
            game?: Game;
            error?: string;
          };

          if (migrateResponse.ok && migrateData.game) {
            loadedGame = migrateData.game;
          } else if (!cancelled) {
            setLoadError(
              migrateData.error ?? tc("reuploadLegacy")
            );
            setGame(loadedGame);
            return;
          }
        }

        if (!cancelled) {
          setGame(loadedGame);
          setIsDraftPreview(Boolean(data.isDraftPreview));
          setIsPartnerPreview(Boolean(data.isPartnerPreview));
        }
      } catch {
        if (!cancelled) {
          setGame(null);
          setLoadError(tc("readGameFailed"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setMigrating(false);
        }
      }
    }

    loadGame();

    return () => {
      cancelled = true;
    };
  }, [gameId, tc, translateApiError]);

  useEffect(() => {
    if (!game?.id) return;

    fetch(`/api/games/${game.id}/social-stats`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { favoriteCount?: number } | null) => {
        if (typeof data?.favoriteCount === "number") {
          setFavoriteCount(data.favoriteCount);
        }
      })
      .catch(() => undefined);
  }, [game?.id]);

  useEffect(() => {
    if (!profile || !game?.id) return;

    fetch(`/api/auth/favorites?gameId=${game.id}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { favorited?: boolean } | null) => {
        if (data) setFavorited(data.favorited === true);
      })
      .catch(() => undefined);
  }, [profile, game?.id]);

  async function toggleFavorite() {
    if (!game) return;

    if (!profile) {
      router.push(`/auth?redirect=${encodeURIComponent(`/game/${game.id}`)}`);
      return;
    }

    setFavoriteSubmitting(true);
    try {
      const response = await fetch(
        favorited
          ? `/api/auth/favorites?gameId=${game.id}`
          : "/api/auth/favorites",
        {
          method: favorited ? "DELETE" : "POST",
          headers: favorited ? undefined : { "Content-Type": "application/json" },
          body: favorited ? undefined : JSON.stringify({ gameId: game.id }),
        }
      );

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? tc("favoriteFailed"));
      }

      setFavorited((prev) => !prev);
      setFavoriteCount((count) => (favorited ? Math.max(0, count - 1) : count + 1));
      showToast(favorited ? tc("favoriteRemoved") : tc("favoriteAdded"));
    } catch (favoriteError) {
      showToast(
        (favoriteError instanceof Error
          ? translateApiError(favoriteError.message)
          : null) ?? tc("favoriteFailed")
      );
    } finally {
      setFavoriteSubmitting(false);
    }
  }

  useEffect(() => {
    if (!game?.title) return;

    const draftSaved = searchParams.get("draftSaved") === "1";
    const published = searchParams.get("published") === "1";

    if (!draftSaved && !published) return;

    showToast(
      draftSaved
        ? td("draftSavedSuccessDesc", { title: game.title })
        : td("publicLiveSuccessDesc", { title: game.title, id: game.id })
    );

    const url = new URL(window.location.href);
    url.searchParams.delete("draftSaved");
    url.searchParams.delete("published");
    window.history.replaceState({}, "", url.toString());
  }, [game?.title, game?.id, searchParams, showToast, td]);

  useEffect(() => {
    if (!game?.id) return;
    fetch(`/api/games/${game.id}/play?locale=${encodeURIComponent(locale)}`, {
      method: "POST",
      credentials: "same-origin",
    }).catch(() => undefined);
    trackGaEvent("game_play", {
      game_id: game.id,
      game_title: game.title,
    });
  }, [game?.id, game?.title, locale]);

  useEffect(() => {
    if (!game?.id) return;
    fetch(`/api/games/${game.id}/forum/posts`)
      .then((response) => response.json())
      .then((data: { posts?: unknown[] }) => {
        setForumPostCount(data.posts?.length ?? 0);
      })
      .catch(() => setForumPostCount(0));
  }, [game?.id]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "forum") {
      router.replace(`/game/${gameId}/forum`);
    }
  }, [gameId, router]);

  const playable = game ? isDirectlyPlayable(game.embedUrl) : false;
  const trustedEmbedUrl =
    game && playable && isSafeEmbedUrl(game.embedUrl) ? game.embedUrl : null;

  const iframeSrc = useMemo(() => {
    if (!trustedEmbedUrl || !game) return null;
    if (trustedEmbedUrl.startsWith("/demos/")) {
      const sep = trustedEmbedUrl.includes("?") ? "&" : "?";
      return `${trustedEmbedUrl}${sep}gid=${game.id}`;
    }
    return trustedEmbedUrl;
  }, [trustedEmbedUrl, game]);

  const embedCode = useMemo(() => {
    if (!iframeSrc) return "";
    const absoluteUrl = iframeSrc.startsWith("/")
      ? `${window.location.origin}${iframeSrc}`
      : iframeSrc;
    return buildEmbedCode(
      absoluteUrl,
      game?.viewportWidth ?? 960,
      game?.viewportHeight ?? 600
    );
  }, [iframeSrc, game?.viewportWidth, game?.viewportHeight]);

  const viewportWidth = game?.viewportWidth ?? 960;
  const viewportHeight = game?.viewportHeight ?? 600;
  const playerMaxWidth = Math.min(viewportWidth, 1024);
  const showCreatorFullscreen = game?.fullscreenButton ?? true;

  const handleShare = async () => {
    if (!game) return;
    const url = window.location.href;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: game.title,
          text: `${game.title} · NexusPlay`,
          url,
        });
        showToast(tc("shareSuccess"));
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }
    await copyToClipboard(url, tc("linkCopied"));
  };

  useEffect(() => {
    if (!showFullscreen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setShowFullscreen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showFullscreen]);

  const copyToClipboard = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(successMessage);
    } catch {
      showToast(tc("copyFailed"));
    }
  };

  if (loading) {
    return (
      <div className="dark flex min-h-full flex-col items-center justify-center px-4 text-zinc-100">
        <Loader2 className="mb-4 size-10 animate-spin text-cyan-400" />
        <p className="text-sm text-zinc-400">
          {migrating ? tc("preparingGame") : tc("loadingGame")}
        </p>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="dark flex min-h-full flex-col items-center justify-center px-4 text-zinc-100">
        <Gamepad2 className="mb-4 size-12 text-zinc-600" />
        <h1 className="text-xl font-semibold text-white">{tc("notFound")}</h1>
        <p className="mt-2 text-sm text-zinc-500">
          {loadError ?? tc("notFoundDesc", { id: gameId })}
        </p>
        <Link href="/" className={cn(buttonVariants(), "mt-6")}>
          {tn("backHome")}
        </Link>
      </div>
    );
  }

  return (
    <div className="dark relative min-h-full text-zinc-100">
      <SiteHeader>
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "gap-1.5 text-zinc-400 hover:text-cyan-300"
            )}
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">{tn("backHome")}</span>
          </Link>

          <h1 className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-300 sm:text-base">
            {game.title}
          </h1>

          <div className="ml-auto flex items-center gap-2">
            <LeaderboardNavButton />
            <LanguageSwitcher />
            <Link
              href={`/game/${game.id}/forum`}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "gap-1.5 border-violet-400/25 bg-violet-500/10 text-violet-200 hover:border-violet-400/40 hover:bg-violet-500/15"
              )}
            >
              <MessagesSquare className="size-3.5" />
              <span className="hidden sm:inline">{t("communityForum")}</span>
              {forumPostCount > 0 && (
                <span className="rounded-full bg-violet-500/25 px-1.5 py-0.5 text-[10px] font-bold">
                  {forumPostCount}
                </span>
              )}
            </Link>
          </div>
      </SiteHeader>

      {isDraftPreview && (
        <div className="border-b border-amber-400/20 bg-amber-500/10 px-4 py-2.5 text-center text-sm text-amber-200">
          {t("draftPreviewBanner")}
        </div>
      )}
      {isPartnerPreview && (
        <div className="border-b border-violet-400/20 bg-violet-500/10 px-4 py-2.5 text-center text-sm text-violet-200">
          {t("partnerPreviewBanner")}
        </div>
      )}

      <main className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="min-w-0"
          >
            <div
              className={cn(
                showFullscreen && iframeSrc
                  ? "fixed inset-3 z-[61] flex flex-col overflow-hidden overscroll-contain sm:inset-4 md:inset-6"
                  : "overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60 shadow-2xl shadow-black/50 ring-1 ring-white/5",
                showFullscreen &&
                  iframeSrc &&
                  "rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl shadow-black/60"
              )}
              onClick={(event) => {
                if (showFullscreen) event.stopPropagation();
              }}
              onWheel={(event) => {
                if (showFullscreen) event.stopPropagation();
              }}
            >
              {showFullscreen && iframeSrc && (
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {game.title}
                    </p>
                    <p className="text-xs text-zinc-500">{tc("fullscreenHint")}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={closeFullscreen}
                    className="shrink-0 text-zinc-400 hover:text-white"
                    aria-label={tc("fullscreenHint")}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              )}

              <div
                className={cn(
                  "relative w-full bg-black",
                  showFullscreen && iframeSrc
                    ? "min-h-0 flex-1"
                    : "mx-auto max-h-[80vh]"
                )}
                style={
                  showFullscreen || !iframeSrc
                    ? undefined
                    : {
                        aspectRatio: `${viewportWidth} / ${viewportHeight}`,
                        width: `min(100%, ${playerMaxWidth}px)`,
                      }
                }
              >
                {iframeSrc ? (
                  <>
                    <iframe
                      ref={iframeRef}
                      src={iframeSrc}
                      title={game.title}
                      className="absolute inset-0 size-full border-0"
                      sandbox={IFRAME_SANDBOX}
                      allowFullScreen
                      referrerPolicy="no-referrer"
                    />
                    {showCreatorFullscreen && !showFullscreen && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setShowFullscreen(true)}
                        className={cn(
                          "absolute bottom-3 right-3 z-10 size-9 rounded-lg",
                          "border border-white/15 bg-zinc-950/80 text-zinc-200 backdrop-blur-sm",
                          "hover:border-cyan-400/40 hover:bg-zinc-900 hover:text-cyan-200",
                          "shadow-[0_0_20px_rgba(34,211,238,0.15)]"
                        )}
                        aria-label={tc("expandGame")}
                      >
                        <Maximize2 className="size-4" />
                      </Button>
                    )}
                    <GameEmbedBridge
                      iframeRef={iframeRef}
                      gameId={gameId}
                      expanded={showFullscreen}
                    />
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
                    <Upload className="size-10 text-zinc-600" />
                    <div>
                      <p className="font-medium text-white">
                        {tc("reuploadRequired")}
                      </p>
                      <p className="mt-2 text-sm text-zinc-500">
                        {loadError ?? tc("reuploadZipHint")}
                      </p>
                    </div>
                    <Link
                      href="/dashboard/upload"
                      className={cn(buttonVariants(), "gap-2")}
                    >
                      <Upload className="size-4" />
                      {tc("reupload")}
                    </Link>
                  </div>
                )}
              </div>

              {!showFullscreen && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 px-4 py-3">
                  <p className="text-xs text-zinc-500">
                    {playable ? t("startPlayHint") : t("reuploadHint")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleShare}
                      className="gap-1.5 border-white/10 bg-white/5 text-zinc-300 hover:border-cyan-400/30 hover:text-white"
                    >
                      <Share2 className="size-3.5" />
                      {tc("share")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowEmbed(true)}
                      disabled={!iframeSrc}
                      className="gap-1.5 border-white/10 bg-white/5 text-zinc-300 hover:border-violet-400/30 hover:text-white disabled:opacity-40"
                    >
                      <Code2 className="size-3.5" />
                      {tc("embed")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFullscreen(true)}
                      disabled={!iframeSrc || !showCreatorFullscreen}
                      className="gap-1.5 border-white/10 bg-white/5 text-zinc-300 hover:border-amber-400/30 hover:text-white disabled:opacity-40"
                    >
                      <Maximize2 className="size-3.5" />
                      {tc("expandGame")}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {showFullscreen && iframeSrc && (
              <div
                className="mx-auto w-full max-h-[80vh]"
                style={{
                  aspectRatio: `${viewportWidth} / ${viewportHeight}`,
                  width: `min(100%, ${playerMaxWidth}px)`,
                }}
                aria-hidden
              />
            )}
          </motion.section>

          <motion.aside
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="space-y-5"
          >
            <div
              className={cn(
                "rounded-2xl border border-white/10 bg-zinc-900/60 p-5 text-center",
                "shadow-lg shadow-black/40 backdrop-blur-sm"
              )}
            >
              <h2 className="text-2xl font-bold tracking-tight text-white">
                {game.title}
              </h2>

              <div className="mt-3 flex items-center justify-center gap-2 text-sm text-zinc-400">
                <User className="size-4 shrink-0 text-violet-400" />
                <span>
                  {tc("creator")}：
                  {game.creatorId ? (
                    <Link
                      href={`/creator/${game.creatorId}`}
                      className="ml-1 font-medium text-violet-300 hover:underline"
                    >
                      {game.creator || tc("defaultCreator")}
                    </Link>
                  ) : (
                    <span className="ml-1 font-medium text-zinc-200">
                      {game.creator || tc("defaultCreator")}
                    </span>
                  )}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-center gap-2 text-sm text-zinc-400">
                <Users className="size-4 shrink-0 text-cyan-400" />
                <span>
                  {formatCount(game.players)} {tc("plays")}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap justify-center gap-4 text-sm text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Heart className="size-4 text-rose-400" />
                  {formatCount(game.likes)} {tc("likes")}
                </span>
                <span className="flex items-center gap-1.5">
                  <Share2 className="size-4 text-fuchsia-400" />
                  {formatCount(game.shares)} {tc("shareGame")}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                {game.tags.map((tag) => (
                  <span
                    key={tag}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
                      TAG_COLORS[tag] ??
                        "bg-zinc-700/50 text-zinc-300 ring-zinc-600/40"
                    )}
                  >
                    {localizedTag(tag)}
                  </span>
                ))}
              </div>

              <p className="mt-5 text-sm leading-relaxed text-zinc-400">
                {game ? localizedDescription(game.title, game.description) : ""}
              </p>

              <Link
                href={`/game/${game.id}/forum`}
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "mt-5 w-full justify-center gap-2 border-violet-400/25 bg-violet-500/10 text-violet-200 hover:border-violet-400/40 hover:bg-violet-500/15"
                )}
              >
                <MessagesSquare className="size-4" />
                {t("enterCommunityForum")}
                {forumPostCount > 0 && (
                  <span className="rounded-full bg-violet-500/25 px-2 py-0.5 text-[11px]">
                    {t("postCount", { count: forumPostCount })}
                  </span>
                )}
              </Link>
            </div>

            <TipSupportPanel
              gameId={game.id}
              gameTitle={game.title}
              tipsEnabled={game.tipsEnabled}
              suggestedTipAmount={game.suggestedTipAmount}
            />

            <SupporterWall gameId={game.id} />

            <div
              className={cn(
                "flex gap-3 rounded-2xl border border-white/10 bg-zinc-900/60 p-4",
                "shadow-lg shadow-black/40"
              )}
            >
              <Button
                variant="outline"
                onClick={() => setLiked((prev) => !prev)}
                className={cn(
                  "flex-1 gap-2 border-white/10 bg-white/5 transition-all",
                  liked
                    ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-300"
                    : "text-zinc-300 hover:border-cyan-400/30 hover:text-white"
                )}
              >
                <ThumbsUp
                  className={cn("size-4", liked && "fill-cyan-400 text-cyan-400")}
                />
                {liked ? tc("liked") : tc("like")}
              </Button>
              <Button
                variant="outline"
                onClick={() => void toggleFavorite()}
                disabled={favoriteSubmitting}
                className={cn(
                  "flex-1 gap-2 border-white/10 bg-white/5 transition-all",
                  favorited
                    ? "border-rose-400/40 bg-rose-500/15 text-rose-300"
                    : "text-zinc-300 hover:border-rose-400/30 hover:text-white"
                )}
              >
                <Heart
                  className={cn(
                    "size-4",
                    favorited && "fill-rose-400 text-rose-400"
                  )}
                />
                {favorited ? tc("favorited") : tc("favorite")}
                {favoriteCount > 0 && (
                  <span className="ml-1 font-mono text-[11px] text-rose-200/80">
                    {favoriteCount}
                  </span>
                )}
              </Button>
            </div>
          </motion.aside>
        </div>

        {game && (
          <GameDetailSections
            gameId={game.id}
            description={localizedDescription(game.title, game.description)}
            detailsHtml={game.detailsHtml}
            creator={game.creator || tc("defaultCreator")}
            playersLabel={tc("playsCount", {
              count: formatCount(game.players ?? 0),
            })}
            forumPostCount={forumPostCount}
            galleryUrls={game.galleryUrls ?? []}
            devlogs={game.devlogs ?? []}
          />
        )}
      </main>

      <AnimatePresence>
        {showFullscreen && iframeSrc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] touch-none overscroll-none bg-black/90 backdrop-blur-md"
            onClick={closeFullscreen}
            onWheel={(event) => event.preventDefault()}
            onTouchMove={(event) => event.preventDefault()}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEmbed && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] touch-none overscroll-none bg-black/70 backdrop-blur-sm"
              onClick={closeEmbed}
              onWheel={(event) => event.preventDefault()}
              onTouchMove={(event) => event.preventDefault()}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn(
                "fixed left-1/2 top-1/2 z-[61] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2",
                "overscroll-contain rounded-2xl border border-white/10 bg-zinc-900 p-5 shadow-2xl shadow-black/60"
              )}
              onWheel={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code2 className="size-5 text-violet-400" />
                  <h3 className="font-semibold text-white">{tc("embedTitle")}</h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={closeEmbed}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="size-4" />
                </Button>
              </div>
              <pre className="max-h-40 overflow-auto rounded-xl border border-white/10 bg-zinc-950 p-4 text-xs leading-relaxed text-cyan-200/90">
                {embedCode}
              </pre>
              <Button
                onClick={() => copyToClipboard(embedCode, tc("embedCopied"))}
                className="mt-4 w-full gap-2 bg-gradient-to-r from-cyan-500 to-violet-600 text-white hover:from-cyan-400 hover:to-violet-500"
              >
                <Copy className="size-4" />
                {tc("copyEmbed")}
              </Button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={cn(
              "fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2",
              "rounded-full border border-cyan-400/30 bg-zinc-900/95 px-5 py-2.5",
              "text-sm text-cyan-100 shadow-xl shadow-cyan-500/10 backdrop-blur-md"
            )}
          >
            <Check className="size-4 text-cyan-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
