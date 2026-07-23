"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useGameRouteId } from "@/hooks/use-game-route-id";
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
  Pencil,
  Coins,
  Share2,
  ThumbsUp,
  Upload,
  User,
  Users,
  X,
} from "lucide-react";
import { GameEmbedBridge } from "@/components/game/game-embed-bridge";
import { FollowCreatorButton } from "@/components/creator/follow-creator-button";
import {
  ChatPlayerCard,
  creatorToPlayerPreview,
  type ChatPlayerPreview,
} from "@/components/chat/chat-player-card";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { SiteHeader } from "@/components/layout/site-header";
import { LeaderboardNavButton } from "@/components/LeaderboardModal";
import { Link, useRouter } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { isDirectlyPlayable } from "@/lib/games-data";
import { buildEmbedCode, sandboxForEmbedUrl } from "@/lib/iframe-sandbox";
import { isSafeEmbedUrl } from "@/lib/embed-url";
import { postShowGameMenu } from "@/lib/rainynightfrog-embed-sdk";
import { TAG_COLORS, type Game } from "@/lib/games";
import { useGameI18n } from "@/hooks/use-game-i18n";
import { useAuth } from "@/hooks/use-auth";
import { requestOpenPlayerDm } from "@/lib/open-player-dm";
import { useFormatCount } from "@/hooks/use-format-count";
import { useApiError } from "@/hooks/use-api-error";
import { useEscapeKey, useScrollLock } from "@/hooks/use-scroll-lock";
import { cn } from "@/lib/utils";
import { trackGaEvent } from "@/components/analytics/google-analytics";

const GameSupportSection = dynamic(
  () =>
    import("@/components/game/game-support-section").then(
      (module) => module.GameSupportSection
    ),
  { ssr: false }
);

const GameCheckoutPanel = dynamic(
  () =>
    import("@/components/game/game-checkout-panel").then(
      (module) => module.GameCheckoutPanel
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
  const tChat = useTranslations("chat");
  const td = useTranslations("dashboard");
  const tc = useTranslations("common");
  const tn = useTranslations("nav");
  const locale = useLocale();
  const { localizedDescription, localizedTag } = useGameI18n();
  const { formatCount } = useFormatCount();
  const { translateApiError } = useApiError();
  const { profile } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const gameId = useGameRouteId();

  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [forumPostCount, setForumPostCount] = useState(0);
  const [isDraftPreview, setIsDraftPreview] = useState(false);
  const [isPartnerPreview, setIsPartnerPreview] = useState(false);
  const [ownerCreatorId, setOwnerCreatorId] = useState<string | null>(null);
  const [creatorProfileOpen, setCreatorProfileOpen] = useState(false);
  const [creatorPreview, setCreatorPreview] = useState<ChatPlayerPreview | null>(
    null
  );

  const [liked, setLiked] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [favoriteSubmitting, setFavoriteSubmitting] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [showEmbed, setShowEmbed] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [supporterWallRefreshKey, setSupporterWallRefreshKey] = useState(0);
  const [paymentMethodsRefreshKey, setPaymentMethodsRefreshKey] = useState(0);
  const [canPlay, setCanPlay] = useState(true);
  const [requiresPurchase, setRequiresPurchase] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2500);
  }, []);

  const closeFullscreen = useCallback(() => setShowFullscreen(false), []);
  const closeEmbed = useCallback(() => setShowEmbed(false), []);
  const mobileAutoExpandDoneRef = useRef(false);

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

    if (!gameId) return;

    async function loadGame() {
      setLoading(true);
      setLoadError(null);

      try {
        const response = await fetch(`/api/games/${gameId}`, {
          credentials: "same-origin",
        });
        const data = (await response.json()) as {
          game?: Game;
          ownerCreatorId?: string | null;
          error?: string;
          isDraftPreview?: boolean;
          isPartnerPreview?: boolean;
          canPlay?: boolean;
          requiresPurchase?: boolean;
          hasPurchased?: boolean;
        };

        if (!response.ok || !data.game) {
          if (!cancelled) {
            setGame(null);
            setLoadError(translateApiError(data.error) ?? tc("notFound"));
          }
          return;
        }

        let loadedGame = data.game;
        const userCanPlay = data.canPlay !== false;

        if (!cancelled) {
          setGame(loadedGame);
          setOwnerCreatorId(data.ownerCreatorId ?? loadedGame.creatorId ?? null);
          setIsDraftPreview(Boolean(data.isDraftPreview));
          setIsPartnerPreview(Boolean(data.isPartnerPreview));
          setCanPlay(userCanPlay);
          setRequiresPurchase(Boolean(data.requiresPurchase));
          setHasPurchased(Boolean(data.hasPurchased));
          // 先結束整頁載入，舊版遊戲 migrate 改為背景處理
          setLoading(false);
        }

        if (userCanPlay && !isDirectlyPlayable(loadedGame.embedUrl)) {
          if (!cancelled) setMigrating(true);

          try {
            const migrateResponse = await fetch(`/api/games/${gameId}/migrate`, {
              method: "POST",
            });
            const migrateData = (await migrateResponse.json()) as {
              game?: Game;
              error?: string;
            };

            if (migrateResponse.ok && migrateData.game) {
              if (!cancelled) setGame(migrateData.game);
            } else if (!cancelled) {
              setLoadError(migrateData.error ?? tc("reuploadLegacy"));
            }
          } finally {
            if (!cancelled) setMigrating(false);
          }
        }
      } catch {
        if (!cancelled) {
          setGame(null);
          setLoadError(tc("readGameFailed"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
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
    if (!game?.id || !canPlay) return;
    if (!isDirectlyPlayable(game.embedUrl)) return;
    fetch(`/api/games/${game.id}/play?locale=${encodeURIComponent(locale)}`, {
      method: "POST",
      credentials: "same-origin",
    }).catch(() => undefined);
    trackGaEvent("game_play", {
      game_id: game.id,
      game_title: game.title,
    });
  }, [game?.id, game?.title, game?.embedUrl, canPlay, locale]);

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

  const playable = game ? canPlay && isDirectlyPlayable(game.embedUrl) : false;
  const trustedEmbedUrl =
    game && playable && isSafeEmbedUrl(game.embedUrl) ? game.embedUrl : null;

  const iframeSrc = useMemo(() => {
    if (!trustedEmbedUrl || !game) return null;
    const sep = trustedEmbedUrl.includes("?") ? "&" : "?";
    return `${trustedEmbedUrl}${sep}gid=${game.id}&locale=${encodeURIComponent(locale)}`;
  }, [trustedEmbedUrl, game, locale]);

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
  const isGameOwner = Boolean(
    profile?.id && ownerCreatorId && profile.id === ownerCreatorId
  );
  const showCheckout =
    game != null &&
    requiresPurchase &&
    !canPlay &&
    !isGameOwner &&
    (game.pricingType === "pwyw" ||
      (game.pricingType === "fixed" && (game.price ?? 0) > 0));
  const showPurchaseGate = showCheckout;
  const editGameHref = game ? `/dashboard/edit/${game.id}` : "/dashboard";

  /* 手機／觸控裝置：進頁自動展開，避免 VOID 閘道鎖死且觸控被頁面捲動吃掉 */
  useEffect(() => {
    if (mobileAutoExpandDoneRef.current) return;
    if (!iframeSrc || !playable || !showCreatorFullscreen || showPurchaseGate) {
      return;
    }
    const isCoarseOrNarrow = window.matchMedia(
      "(max-width: 768px), (pointer: coarse)"
    ).matches;
    if (!isCoarseOrNarrow) return;
    mobileAutoExpandDoneRef.current = true;
    setShowFullscreen(true);
  }, [iframeSrc, playable, showCreatorFullscreen, showPurchaseGate]);

  const refreshGameAfterPurchase = useCallback(async () => {
    try {
      const response = await fetch(`/api/games/${gameId}`, {
        credentials: "same-origin",
      });
      const data = (await response.json()) as {
        game?: Game;
        ownerCreatorId?: string | null;
        canPlay?: boolean;
        requiresPurchase?: boolean;
        hasPurchased?: boolean;
      };

      if (!data.game) return;

      setGame(data.game);
      setOwnerCreatorId(data.ownerCreatorId ?? data.game.creatorId ?? null);
      setCanPlay(data.canPlay !== false);
      setRequiresPurchase(Boolean(data.requiresPurchase));
      setHasPurchased(Boolean(data.hasPurchased));
    } catch {
      // ignore refresh errors; user can reload manually
    }
  }, [gameId]);

  useEffect(() => {
    const checkoutState = searchParams.get("checkout");
    if (checkoutState === "success") {
      showToast(t("checkoutSuccessLive"));
      router.replace(`/game/${gameId}`, { scroll: false });
      void refreshGameAfterPurchase();
    } else if (checkoutState === "cancelled") {
      showToast(t("checkoutCancelled"));
      router.replace(`/game/${gameId}`, { scroll: false });
    }
  }, [searchParams, showToast, t, router, gameId, refreshGameAfterPurchase]);

  const openCreatorProfile = useCallback(() => {
    if (!game?.creatorId) return;
    setCreatorPreview(
      creatorToPlayerPreview(
        game.creatorId,
        game.creator || tc("defaultCreator"),
        { isOwn: profile?.id === game.creatorId }
      )
    );
    setCreatorProfileOpen(true);
  }, [game?.creatorId, game?.creator, profile?.id, tc]);

  const handleShare = async () => {
    if (!game) return;
    const url = window.location.href;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: game.title,
          text: `${game.title} · RainyNightFrog`,
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

  // demo（/demos/*.html）、RNF 上傳包（…/index.html）、同源遊戲皆可返回主選單
  const showGameMenuButton = Boolean(
    iframeSrc &&
      playable &&
      (/\/demos\/[^/?#]+\.html/i.test(iframeSrc) ||
        /\/index\.html(?:[?#]|$)/i.test(iframeSrc) ||
        /\/games\/[^/?#]+\/index\.html/i.test(iframeSrc))
  );

  const handleBackToGameMenu = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) {
      showToast(tc("backToGameMenuFailed"));
      return;
    }
    iframe.focus();
    const sent = postShowGameMenu(iframe);
    if (!sent) {
      showToast(tc("backToGameMenuFailed"));
      return;
    }
    window.setTimeout(() => {
      postShowGameMenu(iframe);
    }, 120);
    showToast(tc("backToGameMenuDone"));
  }, [showToast, tc]);

  const handleScrollToTip = useCallback(() => {
    if (showFullscreen) {
      setShowFullscreen(false);
    }
    window.setTimeout(() => {
      document
        .getElementById("game-tip-support")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, showFullscreen ? 80 : 0);
  }, [showFullscreen]);

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
        <p className="text-sm text-zinc-400">{tc("loadingGame")}</p>
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
      {migrating && (
        <div className="sticky top-0 z-40 flex items-center justify-center gap-2 border-b border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-xs text-cyan-200">
          <Loader2 className="size-3.5 animate-spin" />
          {tc("preparingGame")}
        </div>
      )}
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
            className={cn(
              "min-w-0",
              /* 手機提高層級避免遮罩擋觸控；電腦維持原本 z 軸 */
              showFullscreen && iframeSrc && "relative z-[70] md:z-auto"
            )}
          >
            <div
              className={cn(
                showFullscreen && iframeSrc
                  ? "fixed inset-0 z-[71] flex flex-col overflow-hidden overscroll-contain touch-manipulation sm:inset-3 md:inset-4 md:z-[61] lg:inset-6"
                  : "overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60 shadow-2xl shadow-black/50 ring-1 ring-white/5",
                showFullscreen &&
                  iframeSrc &&
                  "border-0 bg-zinc-950 shadow-2xl shadow-black/60 sm:rounded-2xl sm:border sm:border-white/10"
              )}
              style={
                showFullscreen && iframeSrc
                  ? {
                      paddingTop: "env(safe-area-inset-top, 0px)",
                      paddingRight: "env(safe-area-inset-right, 0px)",
                      paddingBottom: "env(safe-area-inset-bottom, 0px)",
                      paddingLeft: "env(safe-area-inset-left, 0px)",
                    }
                  : undefined
              }
              onClick={(event) => {
                if (showFullscreen) event.stopPropagation();
              }}
              onWheel={(event) => {
                if (showFullscreen) event.stopPropagation();
              }}
              onTouchMove={(event) => {
                if (showFullscreen) event.stopPropagation();
              }}
            >
              {showFullscreen && iframeSrc && (
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2 sm:gap-3 sm:px-4 sm:py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {game.title}
                    </p>
                    <p className="hidden text-xs text-zinc-500 sm:block">
                      {tc("fullscreenHint")}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                    {showGameMenuButton && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBackToGameMenu}
                        className="gap-1.5 border-white/10 bg-white/5 px-2 text-zinc-300 hover:border-emerald-400/30 hover:text-white sm:px-3"
                      >
                        <Gamepad2 className="size-3.5" />
                        <span className="hidden sm:inline">
                          {tc("backToGameMenu")}
                        </span>
                      </Button>
                    )}
                    {game.tipsEnabled && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleScrollToTip}
                        className="gap-1.5 border-fuchsia-400/30 bg-fuchsia-500/10 px-2 text-fuchsia-100 hover:border-fuchsia-400/50 hover:bg-fuchsia-500/15 sm:px-3"
                      >
                        <Coins className="size-3.5" />
                        <span className="hidden sm:inline">
                          {t("tipSupportButton")}
                        </span>
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleShare}
                      className="gap-1.5 border-white/10 bg-white/5 px-2 text-zinc-300 hover:border-cyan-400/30 hover:text-white sm:px-3"
                    >
                      <Share2 className="size-3.5" />
                      <span className="hidden sm:inline">{tc("share")}</span>
                    </Button>
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
                </div>
              )}

              <div
                className={cn(
                  "relative w-full bg-black",
                  showFullscreen && iframeSrc
                    ? "min-h-0 flex-1"
                    : "mx-auto max-h-[min(70dvh,80vh)]"
                )}
                style={
                  showFullscreen
                    ? undefined
                    : iframeSrc || showPurchaseGate
                      ? {
                          aspectRatio: `${viewportWidth} / ${viewportHeight}`,
                          width: `min(100%, ${playerMaxWidth}px)`,
                        }
                      : undefined
                }
              >
                {showPurchaseGate ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-zinc-950/90 px-6 py-10 text-center">
                    <div
                      className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-20"
                      style={{ backgroundImage: `url(${game.image})` }}
                      aria-hidden
                    />
                    <div className="relative z-10 max-w-md space-y-3">
                      <h3 className="text-lg font-semibold text-white">
                        {t("purchaseRequiredTitle")}
                      </h3>
                      <p className="text-sm leading-relaxed text-zinc-400">
                        {t("purchaseRequiredDesc")}
                      </p>
                    </div>
                    <div className="relative z-10 w-full max-w-sm">
                      <GameCheckoutPanel
                        embedded
                        gameId={game.id}
                        gameTitle={game.title}
                        pricingType={
                          game.pricingType === "pwyw" ? "pwyw" : "fixed"
                        }
                        priceCents={game.price ?? 0}
                        minPriceCents={game.minPrice ?? 0}
                        currency={game.currency ?? "USD"}
                        isGameOwner={isGameOwner}
                        onCheckoutSuccess={() => void refreshGameAfterPurchase()}
                      />
                    </div>
                  </div>
                ) : iframeSrc ? (
                  <>
                    <iframe
                      ref={iframeRef}
                      src={iframeSrc}
                      title={game.title}
                      tabIndex={0}
                      className="absolute inset-0 size-full border-0 touch-none md:touch-auto"
                      sandbox={sandboxForEmbedUrl(iframeSrc)}
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
                          "absolute bottom-3 right-3 z-10 size-11 rounded-xl sm:size-9 sm:rounded-lg",
                          "border border-white/15 bg-zinc-950/85 text-zinc-200 backdrop-blur-sm",
                          "hover:border-cyan-400/40 hover:bg-zinc-900 hover:text-cyan-200",
                          "shadow-[0_0_20px_rgba(34,211,238,0.15)]",
                          "touch-manipulation"
                        )}
                        aria-label={tc("expandGame")}
                      >
                        <Maximize2 className="size-5 sm:size-4" />
                      </Button>
                    )}
                    <GameEmbedBridge
                      iframeRef={iframeRef}
                      gameId={gameId}
                      expanded={showFullscreen}
                      creatorId={game.creatorId}
                      onExpandRequest={() => setShowFullscreen(true)}
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
                <div className="flex flex-col gap-3 border-t border-white/5 px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-4">
                  <p className="text-xs text-zinc-500">
                    {showPurchaseGate
                      ? t("purchaseRequiredDesc")
                      : playable
                        ? t("startPlayHint")
                        : t("reuploadHint")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {isGameOwner && (
                      <Link
                        href={editGameHref}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "gap-1.5 border-amber-400/30 bg-amber-500/10 text-amber-100 hover:border-amber-400/50 hover:bg-amber-500/15"
                        )}
                      >
                        <Pencil className="size-3.5" />
                        {td("editGame")}
                      </Link>
                    )}
                    {showGameMenuButton && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBackToGameMenu}
                        disabled={!iframeSrc || !playable}
                        className="gap-1.5 border-white/10 bg-white/5 text-zinc-300 hover:border-emerald-400/30 hover:text-white disabled:opacity-40"
                      >
                        <Gamepad2 className="size-3.5" />
                        {tc("backToGameMenu")}
                      </Button>
                    )}
                    {game.tipsEnabled && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleScrollToTip}
                        className="gap-1.5 border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-100 hover:border-fuchsia-400/50 hover:bg-fuchsia-500/15"
                      >
                        <Coins className="size-3.5" />
                        {t("tipSupportButton")}
                      </Button>
                    )}
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
                      className="hidden gap-1.5 border-white/10 bg-white/5 text-zinc-300 hover:border-violet-400/30 hover:text-white disabled:opacity-40 sm:inline-flex"
                    >
                      <Code2 className="size-3.5" />
                      {tc("embed")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFullscreen(true)}
                      disabled={!iframeSrc || !showCreatorFullscreen}
                      className="gap-1.5 border-amber-400/30 bg-amber-500/10 text-amber-100 hover:border-amber-400/50 hover:bg-amber-500/15 disabled:opacity-40 touch-manipulation"
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
                className="mx-auto w-full max-h-[min(70dvh,80vh)]"
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

              <div className="mt-3 space-y-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-2 text-sm text-zinc-400">
                  <User className="size-4 shrink-0 text-violet-400" />
                  <span>
                    {tc("creator")}：
                    {game.creatorId ? (
                      <button
                        type="button"
                        onClick={openCreatorProfile}
                        className="ml-1 font-medium text-violet-300 transition-colors hover:text-violet-200 hover:underline"
                        aria-label={tChat("playerCardViewProfile")}
                      >
                        {game.creator || tc("defaultCreator")}
                      </button>
                    ) : (
                      <span className="ml-1 font-medium text-zinc-200">
                        {game.creator || tc("defaultCreator")}
                      </span>
                    )}
                  </span>
                </div>

                {game.creatorId && (
                  <FollowCreatorButton
                    creatorId={game.creatorId}
                    compact
                    centered
                    layout="stacked"
                    showCreatorPageLink
                    className="w-full"
                  />
                )}
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

        {game.tipsEnabled && (
          <div id="game-tip-support">
            <GameSupportSection
              gameId={game.id}
              gameTitle={game.title}
              tipsEnabled={game.tipsEnabled}
              suggestedTipAmount={game.suggestedTipAmount}
              isGameOwner={isGameOwner}
              refreshKey={supporterWallRefreshKey}
              paymentMethodsRefreshKey={paymentMethodsRefreshKey}
              onTipSuccess={() =>
                setSupporterWallRefreshKey((key) => key + 1)
              }
              onPaymentMethodsChange={() =>
                setPaymentMethodsRefreshKey((key) => key + 1)
              }
            />
          </div>
        )}

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
            className="fixed inset-0 z-[60] overscroll-none bg-black/90 backdrop-blur-md"
            onClick={closeFullscreen}
            onWheel={(event) => event.preventDefault()}
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
              className="fixed inset-0 z-[60] overscroll-none bg-black/70 backdrop-blur-sm"
              onClick={closeEmbed}
              onWheel={(event) => event.preventDefault()}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn(
                "fixed left-1/2 top-1/2 z-[61] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2",
                "max-h-[min(90dvh,90vh)] overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-zinc-900 p-5 shadow-2xl shadow-black/60"
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
              "fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 z-50 flex -translate-x-1/2 items-center gap-2",
              "max-w-[calc(100vw-2rem)] rounded-full border border-cyan-400/30 bg-zinc-900/95 px-5 py-2.5",
              "text-sm text-cyan-100 shadow-xl shadow-cyan-500/10 backdrop-blur-md"
            )}
          >
            <Check className="size-4 text-cyan-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <ChatPlayerCard
        player={creatorPreview}
        open={creatorProfileOpen}
        onOpenChange={setCreatorProfileOpen}
        canDirectMessage={Boolean(profile)}
        onDirectMessage={
          profile ? (target) => requestOpenPlayerDm(target) : undefined
        }
      />
    </div>
  );
}
