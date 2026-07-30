"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Calendar, Loader2, MessageSquare, Send } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ForumContentView } from "@/components/game/forum-content-view";
import { ForumRichTextEditor } from "@/components/game/forum-rich-text-editor";
import { isForumContentEmpty } from "@/lib/forum-content";
import {
  MAX_COMMENT_LENGTH,
  type GameComment,
  type GameDevlogEntry,
} from "@/lib/game-page-content";
import { isSupabaseImage } from "@/lib/games";
import { buildGameHref } from "@/lib/game-path";
import { useApiError } from "@/hooks/use-api-error";
import { useAuth } from "@/hooks/use-auth";
import { UserBadge } from "@/components/UserBadge";
import {
  ChatPlayerCard,
  forumAuthorToPlayerPreview,
  virtualPlayerToPlayerPreview,
  type ChatPlayerPreview,
} from "@/components/chat/chat-player-card";
import { isSeedGameCommentUserId } from "@/lib/forum-seed-builder";
import { getVirtualPlayerById } from "@/lib/virtual-players";
import { resolveVirtualPlayerAvatarUrl } from "@/lib/virtual-player-avatar";
import {
  getVirtualPlayerEquippedTitle,
  getVirtualPlayerSupporterFlags,
} from "@/lib/virtual-player-supporter";
import { requestOpenPlayerDm } from "@/lib/open-player-dm";
import { sanitizeRichHtmlForRender } from "@/lib/sanitize-rich-html";
import { cn } from "@/lib/utils";

type ApiDevlog = {
  id: string;
  title: string;
  contentHtml: string;
  publishedAt: string;
};

type GameDetailSectionsProps = {
  gameId: number;
  gameSlug?: string | null;
  description: string;
  detailsHtml?: string;
  creator: string;
  playersLabel: string;
  forumPostCount: number;
  galleryUrls: string[];
  devlogs: GameDevlogEntry[];
};

function formatRelativeTime(
  iso: string,
  t: ReturnType<typeof useTranslations<"common">>
) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return t("timeJustNow");
  if (minutes < 60) return t("timeMinutes", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("timeHours", { count: hours });
  const days = Math.floor(hours / 24);
  return t("timeDays", { count: days });
}

function SectionCard({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-zinc-900/60 p-6 sm:p-8",
        "shadow-lg shadow-black/40 backdrop-blur-sm",
        className
      )}
    >
      {title ? (
        <h3 className="text-center text-lg font-semibold text-white">{title}</h3>
      ) : null}
      {children}
    </div>
  );
}

export function GameDetailSections({
  gameId,
  gameSlug,
  description,
  detailsHtml,
  creator,
  playersLabel,
  forumPostCount,
  galleryUrls,
  devlogs,
}: GameDetailSectionsProps) {
  const locale = useLocale();
  const tc = useTranslations("common");
  const tg = useTranslations("game");
  const tf = useTranslations("forum");
  const { translateApiError } = useApiError();
  const { profile } = useAuth();

  const [comments, setComments] = useState<GameComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [profileHint, setProfileHint] = useState<string | null>(null);
  const [playerPreview, setPlayerPreview] = useState<ChatPlayerPreview | null>(
    null
  );
  const [playerCardOpen, setPlayerCardOpen] = useState(false);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [tableDevlogs, setTableDevlogs] = useState<ApiDevlog[]>([]);
  const [devlogsLoading, setDevlogsLoading] = useState(true);

  const openCommentAuthor = useCallback(
    (comment: GameComment) => {
      setProfileHint(null);
      const virtualPlayerId = comment.author_virtual_player_id ?? null;

      if (virtualPlayerId) {
        const player = getVirtualPlayerById(virtualPlayerId);
        if (player) {
          const flags = getVirtualPlayerSupporterFlags(virtualPlayerId);
          setPlayerPreview(
            virtualPlayerToPlayerPreview({
              id: player.id,
              displayName: comment.author_name,
              avatarUrl: resolveVirtualPlayerAvatarUrl(player.id),
              equippedTitle:
                comment.author_equipped_title ??
                getVirtualPlayerEquippedTitle(virtualPlayerId),
              isSupporter: flags?.isSupporter === true,
              supporterBadge: flags?.badge ?? null,
              supporterLifetime: flags?.lifetime === true,
            })
          );
          setPlayerCardOpen(true);
          return;
        }
      }

      if (isSeedGameCommentUserId(comment.user_id)) {
        setProfileHint(tf("seedPlayerProfile"));
        return;
      }

      setPlayerPreview(
        forumAuthorToPlayerPreview(
          comment.author_name,
          comment.user_id,
          comment.author_equipped_title,
          { isOwn: profile?.id === comment.user_id }
        )
      );
      setPlayerCardOpen(true);
    },
    [profile?.id, tf]
  );

  const gallery = useMemo(
    () => galleryUrls.filter(Boolean),
    [galleryUrls]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadComments() {
      setCommentsLoading(true);
      try {
        const response = await fetch(
          `/api/games/${gameId}/comments?locale=${encodeURIComponent(locale)}`
        );
        const data = (await response.json()) as {
          comments?: GameComment[];
          error?: string;
        };
        if (!cancelled) {
          setComments(data.comments ?? []);
        }
      } catch {
        if (!cancelled) setComments([]);
      } finally {
        if (!cancelled) setCommentsLoading(false);
      }
    }

    loadComments();
    return () => {
      cancelled = true;
    };
  }, [gameId, locale]);

  useEffect(() => {
    let cancelled = false;

    async function loadDevlogs() {
      setDevlogsLoading(true);
      try {
        const response = await fetch(`/api/games/${gameId}/devlogs`);
        const data = (await response.json()) as {
          devlogs?: ApiDevlog[];
        };
        if (!cancelled) {
          setTableDevlogs(data.devlogs ?? []);
        }
      } catch {
        if (!cancelled) setTableDevlogs([]);
      } finally {
        if (!cancelled) setDevlogsLoading(false);
      }
    }

    loadDevlogs();
    return () => {
      cancelled = true;
    };
  }, [gameId]);

  const submitComment = useCallback(async () => {
    if (isForumContentEmpty(commentDraft) || commentSubmitting) return;
    if (commentDraft.length > MAX_COMMENT_LENGTH) return;

    setCommentSubmitting(true);
    setCommentError(null);

    try {
      const response = await fetch(`/api/games/${gameId}/comments`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentDraft }),
      });
      const data = (await response.json()) as {
        comment?: GameComment;
        error?: string;
      };

      if (!response.ok || !data.comment) {
        setCommentError(translateApiError(data.error) ?? tg("commentFailed"));
        return;
      }

      setComments((prev) => [data.comment!, ...prev]);
      setCommentDraft("");
    } catch {
      setCommentError(tg("commentFailed"));
    } finally {
      setCommentSubmitting(false);
    }
  }, [commentDraft, commentSubmitting, gameId, tg, translateApiError]);

  const mergedLegacyDevlogs = useMemo(() => {
    const tableIds = new Set(tableDevlogs.map((item) => item.id));
    return (devlogs ?? []).filter((entry) => !tableIds.has(entry.id));
  }, [devlogs, tableDevlogs]);

  const hasAnyDevlog =
    tableDevlogs.length > 0 || mergedLegacyDevlogs.length > 0;

  return (
    <div className="mt-10 space-y-8 pb-10">
      {gallery.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.15 }}
        >
          <SectionCard title={tg("screenshots")}>
            <div className="mx-auto mt-6 max-w-4xl">
              <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-zinc-950">
                <Image
                  src={gallery[activeGalleryIndex] ?? gallery[0]!}
                  alt={tg("screenshotAlt", { index: activeGalleryIndex + 1 })}
                  fill
                  className="object-contain"
                  unoptimized={!isSupabaseImage(gallery[activeGalleryIndex] ?? "")}
                />
              </div>
              {gallery.length > 1 && (
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {gallery.map((url, index) => (
                    <button
                      key={`${url}-${index}`}
                      type="button"
                      onClick={() => setActiveGalleryIndex(index)}
                      className={cn(
                        "relative size-16 overflow-hidden rounded-lg border transition-all sm:size-20",
                        activeGalleryIndex === index
                          ? "border-cyan-400/60 ring-2 ring-cyan-400/30"
                          : "border-white/10 opacity-70 hover:opacity-100"
                      )}
                    >
                      <Image
                        src={url}
                        alt={tg("screenshotAlt", { index: index + 1 })}
                        fill
                        className="object-cover"
                        unoptimized={!isSupabaseImage(url)}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </SectionCard>
        </motion.section>
      )}

      {/* 關於這款遊戲 */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.2 }}
      >
        <SectionCard title={tc("aboutGame")}>
          <div className="mt-6 space-y-6">
            <p className="mx-auto max-w-3xl text-center text-sm leading-relaxed text-zinc-400">
              {description}
            </p>

            {detailsHtml && detailsHtml.replace(/<[^>]*>/g, "").trim() && (
              <div
                className={cn(
                  "game-details-content prose prose-invert prose-sm mx-auto max-w-3xl",
                  "rounded-2xl border border-white/8 bg-zinc-950/50 p-6",
                  "[&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-white",
                  "[&_p]:text-zinc-400 [&_a]:text-cyan-400 [&_li]:text-zinc-400"
                )}
                dangerouslySetInnerHTML={{
                  __html: sanitizeRichHtmlForRender(detailsHtml),
                }}
              />
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-white/8 bg-zinc-950/40 p-4 text-center">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  {tc("creator")}
                </p>
                <p className="mt-1 text-sm text-zinc-200">{creator}</p>
              </div>
              <div className="rounded-xl border border-white/8 bg-zinc-950/40 p-4 text-center">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  {tc("playCount")}
                </p>
                <p className="mt-1 text-sm text-zinc-200">{playersLabel}</p>
              </div>
              <div className="rounded-xl border border-white/8 bg-zinc-950/40 p-4 text-center sm:col-span-2 lg:col-span-1">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  {tg("communityForum")}
                </p>
                <Link
                  href={buildGameHref({ id: gameId, slug: gameSlug }, "/forum")}
                  className="mt-1 inline-block text-sm text-violet-300 transition-colors hover:text-violet-200"
                >
                  {tc("threads", { count: forumPostCount })}
                </Link>
              </div>
            </div>
          </div>
        </SectionCard>
      </motion.section>

      {/* 開發日誌 */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.25 }}
      >
        <SectionCard title={tg("devlogTab")}>
          <div className="mx-auto mt-6 max-w-3xl space-y-6">
            {devlogsLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="size-6 animate-spin text-zinc-500" />
              </div>
            ) : !hasAnyDevlog ? (
              <p className="text-center text-sm text-zinc-500">
                {tg("noDevlogs")}
              </p>
            ) : (
              <>
                {tableDevlogs.map((entry) => (
                  <article
                    key={entry.id}
                    className="rounded-xl border border-cyan-400/15 bg-zinc-950/40 p-5"
                  >
                    <div className="flex flex-wrap items-center justify-center gap-2 text-center">
                      <h4 className="text-base font-semibold text-zinc-100">
                        {entry.title}
                      </h4>
                      <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                        <Calendar className="size-3.5" />
                        {formatRelativeTime(entry.publishedAt, tc)}
                      </span>
                    </div>
                    <div
                      className={cn(
                        "prose prose-invert prose-sm mx-auto mt-3 max-w-none",
                        "[&_p]:text-zinc-400 [&_a]:text-cyan-400 [&_li]:text-zinc-400"
                      )}
                      dangerouslySetInnerHTML={{
                        __html: sanitizeRichHtmlForRender(entry.contentHtml),
                      }}
                    />
                  </article>
                ))}

                {mergedLegacyDevlogs.map((entry) => (
                  <article
                    key={entry.id}
                    className="rounded-xl border border-white/8 bg-zinc-950/40 p-5"
                  >
                    <div className="flex flex-wrap items-center justify-center gap-2 text-center">
                      <h4 className="text-base font-semibold text-zinc-100">
                        {entry.title}
                      </h4>
                      <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                        <Calendar className="size-3.5" />
                        {formatRelativeTime(entry.createdAt, tc)}
                      </span>
                    </div>
                    {entry.content && (
                      <p className="mt-3 whitespace-pre-wrap text-center text-sm leading-relaxed text-zinc-400">
                        {entry.content}
                      </p>
                    )}
                    {entry.imageUrls.length > 0 && (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {entry.imageUrls.map((url, index) => (
                          <div
                            key={`${entry.id}-img-${index}`}
                            className="relative aspect-video overflow-hidden rounded-lg border border-white/10"
                          >
                            <Image
                              src={url}
                              alt={entry.title}
                              fill
                              className="object-cover"
                              unoptimized={!isSupabaseImage(url)}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </>
            )}
          </div>
        </SectionCard>
      </motion.section>

      {/* 評論 */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.3 }}
      >
        <SectionCard title={tg("comments")}>
          <div className="mx-auto mt-6 max-w-2xl text-center">
            <div className="rounded-2xl border border-white/10 bg-zinc-950/50 p-4 sm:p-5">
              {profile ? (
                <div className="mx-auto max-w-xl space-y-3">
                  <ForumRichTextEditor
                    id="game-comment-composer"
                    value={commentDraft}
                    onChange={setCommentDraft}
                    disabled={commentSubmitting}
                    placeholder={tg("commentPlaceholder")}
                    maxLength={MAX_COMMENT_LENGTH}
                    minHeightClass="min-h-[110px]"
                    enableImages={false}
                    enableLists={false}
                  />
                  {commentError && (
                    <p className="text-center text-xs text-rose-400">
                      {commentError}
                    </p>
                  )}
                  <div className="flex justify-center">
                    <Button
                      type="button"
                      onClick={() => void submitComment()}
                      disabled={
                        commentSubmitting ||
                        isForumContentEmpty(commentDraft) ||
                        commentDraft.length > MAX_COMMENT_LENGTH
                      }
                      className="gap-2 bg-violet-600 hover:bg-violet-500"
                    >
                      {commentSubmitting ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}
                      {tg("postComment")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 py-4">
                  <p className="text-sm text-zinc-400">{tf("loginToDiscuss")}</p>
                  <Button
                    nativeButton={false}
                    render={<Link href="/auth" />}
                    variant="outline"
                    className="border-white/10 bg-white/5 text-zinc-200 hover:border-violet-400/30"
                  >
                    {tf("goLogin")}
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-6 space-y-4">
              {commentsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="size-6 animate-spin text-zinc-500" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-center text-sm text-zinc-500">
                  {tg("noComments")}
                </p>
              ) : (
                comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="rounded-xl border border-white/8 bg-zinc-950/30 px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center justify-center gap-2 text-center">
                      <button
                        type="button"
                        onClick={() => openCommentAuthor(comment)}
                        className="group rounded-lg px-1.5 py-1 transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
                        aria-label={comment.author_name}
                      >
                        <UserBadge
                          username={comment.author_name}
                          title={comment.author_equipped_title}
                          isSupporter={comment.author_is_supporter}
                          supporterBadge={comment.author_supporter_badge}
                          animateTitle={false}
                          usernameClassName="text-sm text-zinc-200 underline-offset-2 group-hover:underline group-hover:text-cyan-200"
                          titleClassName="text-[10px]"
                        />
                      </button>
                      <span className="text-xs text-zinc-500">
                        {formatRelativeTime(comment.created_at, tc)}
                      </span>
                    </div>
                    <ForumContentView
                      content={comment.content}
                      className="mt-2 text-center text-zinc-300 [&_p]:text-center [&_li]:text-left"
                    />
                  </div>
                ))
              )}
            </div>

            {profileHint ? (
              <p className="mt-3 text-center text-xs text-amber-300/90">
                {profileHint}
              </p>
            ) : null}

            <p className="mt-4 text-center text-xs text-zinc-600">
              <MessageSquare className="mr-1 inline size-3.5" />
              {tg("forumHint")}
            </p>
          </div>
        </SectionCard>
      </motion.section>

      <ChatPlayerCard
        player={playerPreview}
        open={playerCardOpen}
        onOpenChange={(open) => {
          setPlayerCardOpen(open);
          if (!open) setPlayerPreview(null);
        }}
        canDirectMessage={Boolean(profile)}
        onDirectMessage={
          profile ? (target) => requestOpenPlayerDm(target) : undefined
        }
      />
    </div>
  );
}
