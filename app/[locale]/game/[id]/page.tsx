"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
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
  MessagesSquare,
  Share2,
  ThumbsUp,
  Upload,
  User,
  Users,
  X,
} from "lucide-react";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Link, useRouter } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { isDirectlyPlayable } from "@/lib/games-data";
import { buildEmbedCode, IFRAME_SANDBOX } from "@/lib/iframe-sandbox";
import { isSafeEmbedUrl } from "@/lib/sanitize";
import { TAG_COLORS, type Game } from "@/lib/games";
import { useGameI18n } from "@/hooks/use-game-i18n";
import { useFormatCount } from "@/hooks/use-format-count";
import { useApiError } from "@/hooks/use-api-error";
import { cn } from "@/lib/utils";

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
  const { localizedDescription, localizedTag } = useGameI18n();
  const { formatCount } = useFormatCount();
  const { translateApiError } = useApiError();
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

  const [liked, setLiked] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2500);
  }, []);

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
    fetch(`/api/games/${game.id}/play`, { method: "POST" }).catch(() => undefined);
  }, [game?.id]);

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

  const embedCode = useMemo(
    () => (trustedEmbedUrl ? buildEmbedCode(trustedEmbedUrl) : ""),
    [trustedEmbedUrl]
  );

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
      <header className="sticky top-0 z-40 border-b border-white/5 bg-zinc-950/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
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

          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-violet-600 shadow-md shadow-cyan-500/20">
              <Gamepad2 className="size-4 text-white" />
            </div>
            <span className="hidden bg-gradient-to-r from-white via-cyan-100 to-violet-200 bg-clip-text text-base font-bold tracking-tight text-transparent sm:block">
              NexusPlay
            </span>
          </Link>

          <h1 className="ml-2 truncate text-sm font-medium text-zinc-300 sm:text-base">
            {game.title}
          </h1>

          <div className="ml-auto flex items-center gap-2">
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
        </div>
      </header>

      {isDraftPreview && (
        <div className="border-b border-amber-400/20 bg-amber-500/10 px-4 py-2.5 text-center text-sm text-amber-200">
          {t("draftPreviewBanner")}
        </div>
      )}

      <main className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:gap-8 xl:grid-cols-[1fr_400px]">
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="min-w-0"
          >
            <div
              className={cn(
                "overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60",
                "shadow-2xl shadow-black/50 ring-1 ring-white/5"
              )}
            >
              <div className="relative aspect-video w-full bg-black">
                {trustedEmbedUrl ? (
                  <>
                    <iframe
                      src={trustedEmbedUrl}
                      title={game.title}
                      className="absolute inset-0 size-full"
                      sandbox={IFRAME_SANDBOX}
                      allowFullScreen
                      referrerPolicy="no-referrer"
                    />
                    {playable && (
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/40 to-transparent px-4 pb-4 pt-10">
                        <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/15 px-4 py-1.5 text-sm font-medium text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.25)]">
                          <Gamepad2 className="size-4" />
                          {t("startPlay")}
                        </span>
                      </div>
                    )}
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
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 px-4 py-3">
                <p className="text-xs text-zinc-500">
                  {playable ? t("startPlayHint") : t("reuploadHint")}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(window.location.href, tc("linkCopied"))
                    }
                    className="gap-1.5 border-white/10 bg-white/5 text-zinc-300 hover:border-cyan-400/30 hover:text-white"
                  >
                    <Share2 className="size-3.5" />
                    {tc("share")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowEmbed(true)}
                    disabled={!trustedEmbedUrl}
                    className="gap-1.5 border-white/10 bg-white/5 text-zinc-300 hover:border-violet-400/30 hover:text-white disabled:opacity-40"
                  >
                    <Code2 className="size-3.5" />
                    {tc("embed")}
                  </Button>
                </div>
              </div>
            </div>
          </motion.section>

          <motion.aside
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="space-y-5"
          >
            <div
              className={cn(
                "rounded-2xl border border-white/10 bg-zinc-900/60 p-5",
                "shadow-lg shadow-black/40 backdrop-blur-sm"
              )}
            >
              <h2 className="text-2xl font-bold tracking-tight text-white">
                {game.title}
              </h2>

              <div className="mt-3 flex items-center gap-2 text-sm text-zinc-400">
                <User className="size-4 text-violet-400" />
                <span>
                  {tc("creator")}：
                  <span className="ml-1 font-medium text-zinc-200">
                    {game.creator || tc("defaultCreator")}
                  </span>
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2 text-sm text-zinc-400">
                <Users className="size-4 text-cyan-400" />
                <span>
                  {formatCount(game.players)} {tc("plays")}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap gap-4 text-sm text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Heart className="size-4 text-rose-400" />
                  {formatCount(game.likes)} {tc("likes")}
                </span>
                <span className="flex items-center gap-1.5">
                  <Share2 className="size-4 text-fuchsia-400" />
                  {formatCount(game.shares)} {tc("shareGame")}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
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
                  "mt-5 w-full gap-2 border-violet-400/25 bg-violet-500/10 text-violet-200 hover:border-violet-400/40 hover:bg-violet-500/15"
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
                onClick={() => setFavorited((prev) => !prev)}
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
              </Button>
            </div>
          </motion.aside>
        </div>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.15 }}
          className="mt-10 pb-10"
        >
          <div
            className={cn(
              "rounded-2xl border border-white/10 bg-zinc-900/60 p-6 sm:p-8",
              "shadow-lg shadow-black/40 backdrop-blur-sm"
            )}
          >
            <h3 className="text-lg font-semibold text-white">
              {tc("aboutGame")}
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-zinc-400">
              {game ? localizedDescription(game.title, game.description) : ""}
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-white/8 bg-zinc-950/40 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  {tc("creator")}
                </p>
                <p className="mt-1 flex items-center gap-2 text-sm text-zinc-200">
                  <User className="size-4 text-violet-400" />
                  {game?.creator || tc("defaultCreator")}
                </p>
              </div>
              <div className="rounded-xl border border-white/8 bg-zinc-950/40 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  {tc("playCount")}
                </p>
                <p className="mt-1 flex items-center gap-2 text-sm text-zinc-200">
                  <Users className="size-4 text-cyan-400" />
                  {tc("playsCount", { count: formatCount(game?.players ?? 0) })}
                </p>
              </div>
              <div className="rounded-xl border border-white/8 bg-zinc-950/40 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  {t("communityForum")}
                </p>
                <Link
                  href={`/game/${game.id}/forum`}
                  className="mt-1 flex items-center gap-2 text-sm text-violet-300 transition-colors hover:text-violet-200"
                >
                  <MessagesSquare className="size-4" />
                  {tc("threads", { count: forumPostCount })}
                </Link>
              </div>
            </div>
          </div>
        </motion.section>
      </main>

      <AnimatePresence>
        {showEmbed && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
              onClick={() => setShowEmbed(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn(
                "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2",
                "rounded-2xl border border-white/10 bg-zinc-900 p-5 shadow-2xl shadow-black/60"
              )}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code2 className="size-5 text-violet-400" />
                  <h3 className="font-semibold text-white">{tc("embedTitle")}</h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setShowEmbed(false)}
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
