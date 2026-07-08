"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Calendar, Loader2, MessageSquare, Send } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import type { GameComment, GameDevlogEntry } from "@/lib/game-page-content";
import { isSupabaseImage } from "@/lib/games";
import { useApiError } from "@/hooks/use-api-error";
import { UserBadge } from "@/components/UserBadge";
import { cn } from "@/lib/utils";

type GameDetailSectionsProps = {
  gameId: number;
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
  title: string;
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
      <h3 className="text-center text-lg font-semibold text-white">{title}</h3>
      {children}
    </div>
  );
}

export function GameDetailSections({
  gameId,
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
  const { translateApiError } = useApiError();

  const [comments, setComments] = useState<GameComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);

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

  const submitComment = useCallback(async () => {
    const trimmed = commentDraft.trim();
    if (!trimmed || commentSubmitting) return;

    setCommentSubmitting(true);
    setCommentError(null);

    try {
      const response = await fetch(`/api/games/${gameId}/comments`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
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

  return (
    <div className="mt-10 space-y-8 pb-10">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.15 }}
      >
        <SectionCard title={tc("aboutGame")}>
          <p className="mx-auto mt-4 max-w-3xl text-center text-sm leading-relaxed text-zinc-400">
            {description}
          </p>

          {detailsHtml && detailsHtml.replace(/<[^>]*>/g, "").trim() && (
            <div
              className={cn(
                "game-details-content prose prose-invert prose-sm mx-auto mt-6 max-w-3xl",
                "rounded-2xl border border-white/8 bg-zinc-950/50 p-6",
                "[&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-white",
                "[&_p]:text-zinc-400 [&_a]:text-cyan-400 [&_li]:text-zinc-400"
              )}
              dangerouslySetInnerHTML={{ __html: detailsHtml }}
            />
          )}

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                href={`/game/${gameId}/forum`}
                className="mt-1 inline-block text-sm text-violet-300 transition-colors hover:text-violet-200"
              >
                {tc("threads", { count: forumPostCount })}
              </Link>
            </div>
          </div>
        </SectionCard>
      </motion.section>

      {gallery.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2 }}
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

      {devlogs.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.25 }}
        >
          <SectionCard title={tg("devlog")}>
            <div className="mx-auto mt-6 max-w-3xl space-y-6">
              {devlogs.map((entry) => (
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
            </div>
          </SectionCard>
        </motion.section>
      )}

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.3 }}
      >
        <SectionCard title={tg("comments")}>
          <div className="mx-auto mt-6 max-w-3xl">
            <div className="rounded-xl border border-white/10 bg-zinc-950/50 p-4">
              <textarea
                value={commentDraft}
                onChange={(event) => setCommentDraft(event.target.value)}
                placeholder={tg("commentPlaceholder")}
                rows={3}
                maxLength={1000}
                className={cn(
                  "w-full resize-none rounded-lg border border-white/10 bg-white/5 px-4 py-3",
                  "text-sm text-zinc-100 placeholder:text-zinc-500 outline-none",
                  "focus:border-violet-400/40 focus:ring-2 focus:ring-violet-500/20"
                )}
              />
              {commentError && (
                <p className="mt-2 text-center text-xs text-rose-400">
                  {commentError}
                </p>
              )}
              <div className="mt-3 flex justify-center">
                <Button
                  type="button"
                  onClick={submitComment}
                  disabled={commentSubmitting || !commentDraft.trim()}
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
                      <UserBadge
                        username={comment.author_name}
                        title={comment.author_equipped_title}
                        animateTitle={false}
                        usernameClassName="text-sm text-zinc-200"
                        titleClassName="text-[10px]"
                      />
                      <span className="text-xs text-zinc-500">
                        {formatRelativeTime(comment.created_at, tc)}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-center text-sm text-zinc-400">
                      {comment.content}
                    </p>
                  </div>
                ))
              )}
            </div>

            <p className="mt-4 text-center text-xs text-zinc-600">
              <MessageSquare className="mr-1 inline size-3.5" />
              {tg("forumHint")}
            </p>
          </div>
        </SectionCard>
      </motion.section>
    </div>
  );
}
