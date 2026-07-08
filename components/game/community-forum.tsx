"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  ArrowLeft,
  Filter,
  Gamepad2,
  Loader2,
  MessageCircle,
  MessageSquarePlus,
  MessagesSquare,
  Search,
  Send,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectDisplayValue,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useApiError } from "@/hooks/use-api-error";
import {
  FORUM_CATEGORIES,
  FORUM_LIMITS,
  getForumCategoryMeta,
  type ForumCategory,
  type ForumComment,
  type ForumPostWithGame,
} from "@/lib/forum";
import { localeDateMap, type AppLocale } from "@/i18n/routing";
import { UserBadge } from "@/components/UserBadge";
import {
  ChatPlayerCard,
  forumAuthorToPlayerPreview,
  virtualPlayerToPlayerPreview,
  type ChatPlayerPreview,
} from "@/components/chat/chat-player-card";
import { isSeedForumUserId } from "@/lib/forum-seed-builder";
import { getVirtualPlayerById } from "@/lib/virtual-players";
import { cn } from "@/lib/utils";

type GameOption = { id: number; title: string };

type CommunityForumProps = {
  gameId?: number;
  games?: GameOption[];
  hubMode?: boolean;
  gameTitle?: string;
  onToast: (message: string) => void;
  onPostsChange?: (count: number) => void;
  onPostsLoaded?: (posts: ForumPostWithGame[]) => void;
};

type CategoryFilter = "all" | ForumCategory;
type GameFilter = "all" | number;

function CategoryBadge({ category }: { category: string }) {
  const t = useTranslations("forum");
  const meta = getForumCategoryMeta(category);
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-md border px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        meta.badgeClass
      )}
    >
      {meta.emoji} {t(`categories.${meta.value}`)}
    </Badge>
  );
}

function AuthorChip({
  name,
  userId,
  equippedTitle,
  onClick,
}: {
  name: string;
  userId: string;
  equippedTitle?: import("@/lib/titles").EquippedTitle | null;
  onClick?: () => void;
}) {
  const shortId = userId.replace(/-/g, "").slice(0, 6).toUpperCase();

  const content = (
    <>
      <span
        className={cn(
          "flex size-7 items-center justify-center rounded-full",
          "bg-gradient-to-br from-violet-500/25 to-cyan-500/20",
          "text-[10px] font-bold text-violet-200 ring-1 ring-white/10"
        )}
      >
        {name.slice(0, 1).toUpperCase()}
      </span>
      <div className="min-w-0 text-center">
        <UserBadge
          username={name}
          title={equippedTitle}
          layout="stacked"
          animateTitle={false}
          usernameClassName="text-zinc-300"
          titleClassName="text-[9px]"
        />
        <p className="font-mono text-[10px] text-zinc-500">#{shortId}</p>
      </div>
    </>
  );

  if (!onClick) {
    return (
      <div className="flex flex-col items-center gap-2 text-xs text-zinc-400">
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
      className="flex flex-col items-center gap-2 text-xs text-zinc-400 transition-opacity hover:opacity-85"
    >
      {content}
    </button>
  );
}

function PostSkeleton() {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-20 rounded-md bg-zinc-800/70" />
        <Skeleton className="h-4 w-24 bg-zinc-800/70" />
      </div>
      <Skeleton className="mt-3 h-5 w-3/4 bg-zinc-800/70" />
      <Skeleton className="mt-2 h-4 w-1/2 bg-zinc-800/70" />
    </div>
  );
}

export function CommunityForum({
  gameId,
  games,
  hubMode = false,
  gameTitle,
  onToast,
  onPostsChange,
  onPostsLoaded,
}: CommunityForumProps) {
  const { profile, loading: authLoading } = useAuth();
  const t = useTranslations("forum");
  const tc = useTranslations("common");
  const { translateApiError } = useApiError();
  const locale = useLocale();
  const isHub = hubMode;

  const formatDate = useCallback(
    (iso: string) => {
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) return iso;
      return date.toLocaleString(
        localeDateMap[locale as AppLocale] ?? locale,
        {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      );
    },
    [locale]
  );

  const handleAuthorClick = useCallback(
    (
      name: string,
      userId: string,
      equippedTitle?: import("@/lib/titles").EquippedTitle | null,
      virtualPlayerId?: string | null
    ) => {
      if (!profile) return;

      if (virtualPlayerId) {
        const player = getVirtualPlayerById(virtualPlayerId);
        if (player) {
          setPlayerPreview(
            virtualPlayerToPlayerPreview({
              id: player.id,
              displayName: name,
              avatarUrl: null,
              equippedTitle,
            })
          );
          setPlayerCardOpen(true);
          return;
        }
      }

      if (isSeedForumUserId(userId)) {
        onToast(t("seedPlayerProfile"));
        return;
      }

      setPlayerPreview(
        forumAuthorToPlayerPreview(name, userId, equippedTitle, {
          isOwn: profile.id === userId,
        })
      );
      setPlayerCardOpen(true);
    },
    [onToast, profile, t]
  );

  const [posts, setPosts] = useState<ForumPostWithGame[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [gameFilter, setGameFilter] = useState<GameFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPost, setSelectedPost] = useState<ForumPostWithGame | null>(
    null
  );
  const [playerPreview, setPlayerPreview] = useState<ChatPlayerPreview | null>(null);
  const [playerCardOpen, setPlayerCardOpen] = useState(false);
  const threadViewRef = useRef<HTMLDivElement>(null);
  const threadScrollTimersRef = useRef<number[]>([]);
  const [threadBodyReady, setThreadBodyReady] = useState(false);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  const [creating, setCreating] = useState(false);
  const [composeGameId, setComposeGameId] = useState<number | null>(
    games?.[0]?.id ?? gameId ?? null
  );
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<ForumCategory>("general");
  const [newContent, setNewContent] = useState("");

  const [replyContent, setReplyContent] = useState("");
  const [replying, setReplying] = useState(false);

  const filteredPosts = useMemo(() => {
    let result = posts;
    if (gameFilter !== "all") {
      result = result.filter((post) => post.game_id === gameFilter);
    }
    if (categoryFilter !== "all") {
      result = result.filter((post) => post.category === categoryFilter);
    }

    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) return result;

    return result.filter((post) => {
      const haystack = [
        post.title,
        post.content,
        post.author_name,
        post.game_title ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }, [posts, categoryFilter, gameFilter, searchQuery]);

  const gameCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const post of posts) {
      counts[post.game_id] = (counts[post.game_id] ?? 0) + 1;
    }
    return counts;
  }, [posts]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: posts.length };
    for (const post of posts) {
      counts[post.category] = (counts[post.category] ?? 0) + 1;
    }
    return counts;
  }, [posts]);

  const loadPosts = useCallback(async () => {
    setPostsLoading(true);
    setPostsError(null);
    try {
      const url = isHub
        ? `/api/community/forum/posts?locale=${encodeURIComponent(locale)}`
        : `/api/games/${gameId}/forum/posts?locale=${encodeURIComponent(locale)}`;
      const response = await fetch(url);
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        throw new Error("invalid response");
      }

      const data = (await response.json()) as {
        posts?: ForumPostWithGame[];
        error?: string;
      };

      const nextPosts = data.posts ?? [];

      if (!response.ok) {
        setPosts(nextPosts);
        setPostsError(translateApiError(data.error) ?? t("readFailed"));
        onPostsChange?.(nextPosts.length);
        if (nextPosts.length === 0) {
          onToast(translateApiError(data.error) ?? t("readFailed"));
        }
        return;
      }

      setPosts(nextPosts);
      onPostsChange?.(nextPosts.length);
      onPostsLoaded?.(nextPosts);
    } catch {
      setPosts([]);
      setPostsError(t("connectionFailed"));
      onPostsChange?.(0);
      onToast(t("readFailed"));
    } finally {
      setPostsLoading(false);
    }
  }, [gameId, isHub, locale, onPostsChange, onPostsLoaded, onToast, t, translateApiError]);

  const loadComments = useCallback(
    async (postId: number, postGameId: number) => {
      setCommentsLoading(true);
      try {
        const response = await fetch(
          `/api/games/${postGameId}/forum/posts/${postId}/comments?locale=${encodeURIComponent(locale)}`
        );
        const data = (await response.json()) as {
          comments?: ForumComment[];
          error?: string;
        };
        setComments(data.comments ?? []);
      } catch {
        setComments([]);
        onToast(t("readCommentsFailed"));
      } finally {
        setCommentsLoading(false);
      }
    },
    [locale, onToast, t]
  );

  useEffect(() => {
    if (isHub && games?.length && composeGameId === null) {
      setComposeGameId(games[0]!.id);
    }
  }, [isHub, games, composeGameId]);

  const THREAD_HEADER_OFFSET = 80;

  const clearThreadScrollTimers = useCallback(() => {
    for (const timer of threadScrollTimersRef.current) {
      window.clearTimeout(timer);
    }
    threadScrollTimersRef.current = [];
  }, []);

  const pinThreadToViewportTop = useCallback(() => {
    const element = threadViewRef.current;
    if (!element) return false;

    const top =
      element.getBoundingClientRect().top +
      window.scrollY -
      THREAD_HEADER_OFFSET;
    const nextTop = Math.max(0, top);

    window.scrollTo({ top: nextTop, left: 0, behavior: "auto" });
    document.documentElement.scrollTop = nextTop;
    document.body.scrollTop = nextTop;
    return true;
  }, []);

  const scheduleThreadPin = useCallback(() => {
    clearThreadScrollTimers();
    pinThreadToViewportTop();
    threadScrollTimersRef.current = [0, 48, 120, 280, 480].map((delay) =>
      window.setTimeout(pinThreadToViewportTop, delay)
    );
    return clearThreadScrollTimers;
  }, [clearThreadScrollTimers, pinThreadToViewportTop]);

  const enterThreadView = useCallback(
    (post: ForumPostWithGame) => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      clearThreadScrollTimers();
      setThreadBodyReady(false);
      flushSync(() => {
        setSelectedPost(post);
      });
      scheduleThreadPin();
      threadScrollTimersRef.current.push(
        window.setTimeout(() => {
          setThreadBodyReady(true);
        }, 160)
      );
    },
    [clearThreadScrollTimers, scheduleThreadPin]
  );

  const exitThreadView = useCallback(() => {
    clearThreadScrollTimers();
    setThreadBodyReady(false);
    setSelectedPost(null);
  }, [clearThreadScrollTimers]);

  useEffect(() => {
    return () => clearThreadScrollTimers();
  }, [clearThreadScrollTimers]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    if (selectedPost) {
      loadComments(selectedPost.id, selectedPost.game_id);
    } else {
      setComments([]);
    }
  }, [selectedPost, loadComments]);

  useLayoutEffect(() => {
    if (!selectedPost) return;
    const previousOverflowAnchor = document.documentElement.style.overflowAnchor;
    document.documentElement.style.overflowAnchor = "none";
    return () => {
      document.documentElement.style.overflowAnchor = previousOverflowAnchor;
    };
  }, [selectedPost?.id]);

  useLayoutEffect(() => {
    if (!selectedPost || !threadBodyReady) return;
    return scheduleThreadPin();
  }, [selectedPost?.id, threadBodyReady, scheduleThreadPin]);

  useLayoutEffect(() => {
    if (!selectedPost || !threadBodyReady || commentsLoading) return;
    return scheduleThreadPin();
  }, [selectedPost?.id, threadBodyReady, commentsLoading, scheduleThreadPin]);

  const handleCreatePost = async () => {
    if (!profile) {
      onToast(t("loginRequiredPost"));
      return;
    }

    const targetGameId = isHub ? composeGameId : gameId;
    if (!targetGameId) {
      onToast(t("selectGamePost"));
      return;
    }

    const title = newTitle.trim();
    const content = newContent.trim();

    if (!title) {
      onToast(t("titleRequired"));
      return;
    }
    if (!content) {
      onToast(t("contentRequired"));
      return;
    }

    setCreating(true);
    try {
      const response = await fetch(`/api/games/${targetGameId}/forum/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          category: newCategory,
          content,
        }),
      });
      const data = (await response.json()) as {
        post?: ForumPostWithGame;
        error?: string;
      };

      if (!response.ok || !data.post) {
        onToast(translateApiError(data.error) ?? t("postFailed"));
        return;
      }

      const gameLabel =
        games?.find((g) => g.id === targetGameId)?.title ?? gameTitle;
      const createdPost: ForumPostWithGame = {
        ...data.post,
        comment_count: 0,
        game_title: gameLabel,
      };
      setPosts((prev) => {
        const next = [createdPost, ...prev];
        onPostsChange?.(next.length);
        return next;
      });
      setNewTitle("");
      setNewCategory("general");
      setNewContent("");
      enterThreadView(createdPost);
      onToast(t("postSuccess"));
    } catch {
      onToast(t("postFailed"));
    } finally {
      setCreating(false);
    }
  };

  const handleSubmitReply = async () => {
    if (!selectedPost) return;

    if (!profile) {
      onToast(t("loginRequiredReply"));
      return;
    }

    const content = replyContent.trim();
    if (!content) {
      onToast(t("replyRequired"));
      return;
    }

    setReplying(true);
    try {
      const response = await fetch(
        `/api/games/${selectedPost.game_id}/forum/posts/${selectedPost.id}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        }
      );
      const data = (await response.json()) as {
        comment?: ForumComment;
        postId?: number;
        error?: string;
      };

      if (!response.ok || !data.comment) {
        onToast(translateApiError(data.error) ?? t("replyFailed"));
        return;
      }

      const resolvedPostId = data.postId ?? selectedPost.id;
      const materialized = resolvedPostId !== selectedPost.id;

      if (materialized) {
        const materializedPost: ForumPostWithGame = {
          ...selectedPost,
          id: resolvedPostId,
        };
        setSelectedPost(materializedPost);
        setPosts((prev) => {
          const withoutSeed = prev.filter((post) => post.id !== selectedPost.id);
          const existing = withoutSeed.find((post) => post.id === resolvedPostId);
          if (existing) {
            return withoutSeed.map((post) =>
              post.id === resolvedPostId
                ? {
                    ...post,
                    comment_count: (post.comment_count ?? 0) + 1,
                  }
                : post
            );
          }
          return [
            {
              ...materializedPost,
              comment_count: (selectedPost.comment_count ?? 0) + 1,
            },
            ...withoutSeed,
          ];
        });
        await loadComments(resolvedPostId, selectedPost.game_id);
      } else {
        setComments((prev) => [...prev, data.comment!]);
        setPosts((prev) =>
          prev.map((post) =>
            post.id === selectedPost.id
              ? { ...post, comment_count: (post.comment_count ?? 0) + 1 }
              : post
          )
        );
        setSelectedPost((prev) =>
          prev
            ? { ...prev, comment_count: (prev.comment_count ?? 0) + 1 }
            : prev
        );
      }

      setReplyContent("");
      onToast(t("replySuccess"));
    } catch {
      onToast(t("replyFailed"));
    } finally {
      setReplying(false);
    }
  };

  const handleSubmitOnShortcut = (
    event: React.KeyboardEvent,
    action: () => void
  ) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      action();
    }
  };

  return (
    <div className="p-5 text-center sm:p-8">
      {!selectedPost && (
      <div className="mb-6 flex flex-col items-center gap-4 border-b border-white/8 pb-6">
        <div>
          <h3 className="flex items-center justify-center gap-2 text-xl font-bold text-white">
            <MessagesSquare className="size-5 text-violet-400" />
            {isHub ? t("latest") : t("title")}
          </h3>
          <p className="mt-1 text-sm text-zinc-500">
            {isHub
              ? t("hubDesc")
              : gameTitle
                ? t("gameDesc", { title: gameTitle })
                : t("gameDescDefault")}
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            {t("threadStats", { count: posts.length })}
            {profile
              ? t("postAs", { name: profile.display_name })
              : t("loginToPost")}
            {" · "}
            <Link
              href="/community/rules"
              className="text-violet-400/80 transition-colors hover:text-violet-300"
            >
              {t("rulesLink")}
            </Link>
          </p>
        </div>
      </div>
      )}

      {selectedPost ? (
        <div
          ref={threadViewRef}
          key={`thread-${selectedPost.id}`}
          className="scroll-mt-20 space-y-5"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={exitThreadView}
            className="mx-auto gap-1.5 text-zinc-400 hover:text-violet-300"
          >
              <ArrowLeft className="size-4" />
              {t("backToList")}
            </Button>

            <article
              className={cn(
                "overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/70",
                "border-l-4 shadow-xl shadow-black/30",
                getForumCategoryMeta(selectedPost.category).accentClass
              )}
            >
              <div className="p-5 text-center sm:p-6">
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <CategoryBadge category={selectedPost.category} />
                  {isHub && selectedPost.game_title && (
                    <Link
                      href={`/game/${selectedPost.game_id}/forum`}
                      className="inline-flex items-center gap-1 rounded-md border border-violet-400/25 bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-300 transition-colors hover:bg-violet-500/20"
                    >
                      <Gamepad2 className="size-3" />
                      {selectedPost.game_title}
                    </Link>
                  )}
                  <span className="text-xs text-zinc-500">
                    {formatDate(selectedPost.created_at)}
                  </span>
                </div>
                <h4 className="mt-3 text-2xl font-bold tracking-tight text-white">
                  {selectedPost.title}
                </h4>
                <div className="mt-4 flex justify-center">
                  <AuthorChip
                    name={selectedPost.author_name}
                    userId={selectedPost.user_id}
                    equippedTitle={selectedPost.author_equipped_title}
                    onClick={
                      profile
                        ? () =>
                            handleAuthorClick(
                              selectedPost.author_name,
                              selectedPost.user_id,
                              selectedPost.author_equipped_title,
                              selectedPost.author_virtual_player_id
                            )
                        : undefined
                    }
                  />
                </div>
                <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
                  {selectedPost.content}
                </p>
              </div>
            </article>

            {threadBodyReady ? (
            <section className="space-y-4 [overflow-anchor:none]">
              <h5 className="flex items-center justify-center gap-2 text-sm font-semibold text-zinc-300">
                <span className="size-1.5 rounded-full bg-violet-400" />
                {t("comments", { count: comments.length })}
              </h5>

              {commentsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <PostSkeleton key={index} />
                  ))}
                </div>
              ) : comments.length > 0 ? (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="rounded-xl border border-white/8 bg-zinc-900/50 p-4 text-center"
                    >
                      <div className="flex flex-col items-center gap-3">
                        <AuthorChip
                          name={comment.author_name}
                          userId={comment.user_id}
                          equippedTitle={comment.author_equipped_title}
                          onClick={
                            profile
                              ? () =>
                                  handleAuthorClick(
                                    comment.author_name,
                                    comment.user_id,
                                    comment.author_equipped_title,
                                    comment.author_virtual_player_id
                                  )
                              : undefined
                          }
                        />
                        <span className="text-xs text-zinc-500">
                          {formatDate(comment.created_at)}
                        </span>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-400">
                        {comment.content}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-white/10 py-10 text-center text-sm text-zinc-500">
                  {t("noComments")}
                </div>
              )}

              <div
                className={cn(
                  "rounded-2xl border border-white/10 bg-zinc-950/60 p-4",
                  "ring-1 ring-inset ring-white/5 [overflow-anchor:none]"
                )}
              >
                {profile ? (
                  <div className="space-y-3">
                    <Textarea
                      value={replyContent}
                      onChange={(event) => setReplyContent(event.target.value)}
                      onKeyDown={(event) =>
                        handleSubmitOnShortcut(event, handleSubmitReply)
                      }
                      placeholder={t("replyPlaceholder")}
                      maxLength={FORUM_LIMITS.comment}
                      rows={3}
                      className="min-h-24 resize-none border-white/10 bg-white/5 text-zinc-100 placeholder:text-zinc-500 focus-visible:border-violet-400/40 focus-visible:ring-violet-500/20"
                    />
                    <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                      <span className="text-xs text-zinc-600">
                        {replyContent.length}/{FORUM_LIMITS.comment}
                      </span>
                      <Button
                        onClick={handleSubmitReply}
                        disabled={replying || !replyContent.trim()}
                        className="gap-2 bg-gradient-to-r from-violet-600 to-cyan-600 text-white hover:from-violet-500 hover:to-cyan-500"
                      >
                        {replying ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Send className="size-4" />
                        )}
                        {t("submitReply")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-4 text-center">
                    <p className="text-sm text-zinc-400">{t("loginToDiscuss")}</p>
                    <Button
                      nativeButton={false}
                      render={<Link href="/auth" />}
                      variant="outline"
                      className="border-white/10 bg-white/5 text-zinc-200 hover:border-violet-400/30"
                    >
                      {t("goLogin")}
                    </Button>
                  </div>
                )}
              </div>
            </section>
            ) : (
              <div className="flex justify-center py-8">
                <Loader2 className="size-6 animate-spin text-violet-400" />
              </div>
            )}
        </div>
      ) : (
        <div key="post-list" className="space-y-4">
            {!authLoading && profile && (
              <section
                className={cn(
                  "rounded-2xl border border-white/10 bg-zinc-950/60 p-4 sm:p-5",
                  "ring-1 ring-inset ring-violet-500/10"
                )}
              >
                <h4 className="mb-4 flex items-center justify-center gap-2 text-sm font-semibold text-white">
                  <MessageSquarePlus className="size-4 text-violet-400" />
                  {t("createPost")}
                </h4>
                <div className="space-y-4">
                  <div
                    className={cn(
                      "grid gap-4",
                      isHub
                        ? "sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]"
                        : "sm:grid-cols-[1fr_auto]"
                    )}
                  >
                    {isHub && games && games.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-zinc-300">{t("gameField")}</Label>
                        <Select
                          value={composeGameId?.toString() ?? ""}
                          onValueChange={(value) => {
                            if (value) {
                              setComposeGameId(Number.parseInt(value, 10));
                            }
                          }}
                        >
                          <SelectTrigger className="w-full border-white/10 bg-white/5 text-zinc-100">
                            <SelectDisplayValue>
                              {games.find((game) => game.id === composeGameId)?.title ??
                                t("selectGame")}
                            </SelectDisplayValue>
                          </SelectTrigger>
                          <SelectContent className="border-white/10 bg-zinc-900 text-zinc-100 ring-white/10">
                            {games.map((game) => (
                              <SelectItem
                                key={game.id}
                                value={game.id.toString()}
                                className="focus:bg-violet-500/10 focus:text-violet-100"
                              >
                                {game.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label
                        htmlFor="forum-title-inline"
                        className="block w-full text-center text-zinc-300"
                      >
                        {t("postTitle")}
                      </Label>
                      <Input
                        id="forum-title-inline"
                        value={newTitle}
                        onChange={(event) => setNewTitle(event.target.value)}
                        placeholder={t("titlePlaceholder")}
                        maxLength={FORUM_LIMITS.title}
                        className="border-white/10 bg-white/5 text-zinc-100 placeholder:text-zinc-500 focus-visible:border-violet-400/40 focus-visible:ring-violet-500/20"
                      />
                    </div>
                    <div className="space-y-2 sm:w-44">
                      <Label className="block w-full text-center text-zinc-300">
                        {t("category")}
                      </Label>
                      <Select
                        value={newCategory}
                        onValueChange={(value) =>
                          setNewCategory(value as ForumCategory)
                        }
                      >
                        <SelectTrigger className="w-full border-white/10 bg-white/5 text-zinc-100">
                          <SelectDisplayValue>
                            {(() => {
                              const meta = getForumCategoryMeta(newCategory);
                              return `${meta.emoji} ${t(`categories.${meta.value}`)}`;
                            })()}
                          </SelectDisplayValue>
                        </SelectTrigger>
                        <SelectContent className="border-white/10 bg-zinc-900 text-zinc-100 ring-white/10">
                          {FORUM_CATEGORIES.map((item) => (
                            <SelectItem
                              key={item.value}
                              value={item.value}
                              className="focus:bg-violet-500/10 focus:text-violet-100"
                            >
                              {item.emoji} {t(`categories.${item.value}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="forum-content-inline"
                      className="block w-full text-center text-zinc-300"
                    >
                      {t("content")}
                    </Label>
                    <Textarea
                      id="forum-content-inline"
                      value={newContent}
                      onChange={(event) => setNewContent(event.target.value)}
                      onKeyDown={(event) =>
                        handleSubmitOnShortcut(event, handleCreatePost)
                      }
                      placeholder={t("contentPlaceholder")}
                      maxLength={FORUM_LIMITS.content}
                      rows={4}
                      className="min-h-28 resize-none border-white/10 bg-white/5 text-zinc-100 placeholder:text-zinc-500 focus-visible:border-violet-400/40 focus-visible:ring-violet-500/20"
                    />
                  </div>
                  <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                    <span className="text-xs text-zinc-600">
                      {newContent.length}/{FORUM_LIMITS.content}
                    </span>
                    <Button
                      onClick={handleCreatePost}
                      disabled={
                        creating ||
                        !newTitle.trim() ||
                        !newContent.trim() ||
                        (isHub && !composeGameId)
                      }
                      className="gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500"
                    >
                      {creating ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <MessageSquarePlus className="size-4" />
                      )}
                      {t("submitPost")}
                    </Button>
                  </div>
                </div>
              </section>
            )}

            {!authLoading && !profile && (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 bg-zinc-900/30 py-8 text-center sm:px-6">
                <div>
                  <p className="font-medium text-white">{t("loginPromptTitle")}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {t("loginPromptDesc")}
                  </p>
                </div>
                <Button
                  nativeButton={false}
                  render={<Link href="/auth" />}
                  className="gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"
                >
                  {t("goLogin")}
                </Button>
              </div>
            )}

            <div className="relative mx-auto max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
              <Input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t("searchPlaceholder")}
                className="border-white/10 bg-white/5 pl-10 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>

            {isHub && games && games.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="mr-1 flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                  <Gamepad2 className="size-3.5" />
                  {t("filterGame")}
                </span>
                <button
                  type="button"
                  onClick={() => setGameFilter("all")}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-all",
                    gameFilter === "all"
                      ? "bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/40"
                      : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
                  )}
                >
                  {tc("all")} ({posts.length})
                </button>
                {games.map((game) => (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() => setGameFilter(game.id)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium transition-all",
                      gameFilter === game.id
                        ? "bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/40"
                        : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
                    )}
                  >
                    {game.title}
                    {(gameCounts[game.id] ?? 0) > 0 &&
                      ` (${gameCounts[game.id]})`}
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="mr-1 flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                <Filter className="size-3.5" />
                {t("filter")}
              </span>
              <button
                type="button"
                onClick={() => setCategoryFilter("all")}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-all",
                  categoryFilter === "all"
                    ? "bg-violet-500/20 text-violet-200 ring-1 ring-violet-400/40"
                    : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
                )}
              >
                {tc("all")} ({categoryCounts.all ?? 0})
              </button>
              {FORUM_CATEGORIES.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setCategoryFilter(item.value)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-all",
                    categoryFilter === item.value
                      ? cn(item.badgeClass, "ring-1")
                      : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
                  )}
                >
                  {item.emoji} {t(`categories.${item.value}`)}
                  {(categoryCounts[item.value] ?? 0) > 0 &&
                    ` (${categoryCounts[item.value]})`}
                </button>
              ))}
            </div>

            {postsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <PostSkeleton key={index} />
                ))}
              </div>
            ) : filteredPosts.length > 0 ? (
              <div className="space-y-3">
                {filteredPosts.map((post) => (
                  <div
                    key={post.id}
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      event.preventDefault();
                      enterThreadView(post);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        enterThreadView(post);
                      }
                    }}
                    className={cn(
                      "group w-full cursor-pointer overflow-hidden rounded-xl border border-white/10",
                      "border-l-4 bg-zinc-900/50 p-4 text-center transition-all duration-200",
                      "hover:border-violet-400/30 hover:bg-zinc-900/80 hover:shadow-lg hover:shadow-violet-500/5",
                      getForumCategoryMeta(post.category).accentClass
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <CategoryBadge category={post.category} />
                      {isHub && post.game_title && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-zinc-400">
                          <Gamepad2 className="size-3" />
                          {post.game_title}
                        </span>
                      )}
                      <span className="text-xs text-zinc-500">
                        {formatDate(post.created_at)}
                      </span>
                      {(post.comment_count ?? 0) > 0 && (
                        <span className="flex items-center gap-1 text-xs text-zinc-500">
                          <MessageCircle className="size-3.5" />
                          {t("commentCount", { count: post.comment_count ?? 0 })}
                        </span>
                      )}
                    </div>
                    <h4 className="mt-2 text-base font-semibold text-white transition-colors group-hover:text-violet-50">
                      {post.title}
                    </h4>
                    <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-zinc-500">
                      {post.content}
                    </p>
                    <div className="mt-3 flex justify-center">
                      <AuthorChip
                        name={post.author_name}
                        userId={post.user_id}
                        equippedTitle={post.author_equipped_title}
                        onClick={
                          profile
                            ? () =>
                                handleAuthorClick(
                                  post.author_name,
                                  post.user_id,
                                  post.author_equipped_title,
                                  post.author_virtual_player_id
                                )
                            : undefined
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-zinc-900/30 py-16 text-center">
                <MessagesSquare className="mx-auto mb-3 size-10 text-zinc-600" />
                <p className="font-medium text-white">
                  {postsError
                    ? t("loadFailed")
                    : searchQuery.trim()
                      ? t("searchNoResults")
                      : categoryFilter !== "all"
                        ? t("noThreadsCategory")
                        : t("noThreads")}
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  {postsError ??
                    (searchQuery.trim() ? t("searchNoResultsHint") : t("beFirst"))}
                </p>
                {!profile && (
                  <Button
                    nativeButton={false}
                    render={<Link href="/auth" />}
                    className="mt-5 gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"
                  >
                    {t("goLogin")}
                  </Button>
                )}
              </div>
            )}
        </div>
      )}

      <ChatPlayerCard
        player={playerPreview}
        open={playerCardOpen}
        onOpenChange={setPlayerCardOpen}
      />
    </div>
  );
}
