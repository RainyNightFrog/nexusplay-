"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  MessageSquare,
  RefreshCw,
  Trash2,
  Unlock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  AdminForumCommentRecord,
  AdminForumPostRecord,
} from "@/lib/admin-forum-moderation-service";
import { cn } from "@/lib/utils";

function formatDate(value: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

type PostAction = "hide" | "unhide" | "lock" | "unlock" | "delete";
type CommentAction = "hide" | "unhide" | "delete";

export function AdminForumModerationPanel() {
  const t = useTranslations("admin");
  const locale = useLocale();

  const [tab, setTab] = useState("posts");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<AdminForumPostRecord[]>([]);
  const [comments, setComments] = useState<AdminForumCommentRecord[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadForum = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [postsRes, commentsRes] = await Promise.all([
        fetch("/api/admin/forum/posts"),
        fetch("/api/admin/forum/comments"),
      ]);
      const postsData = (await postsRes.json()) as {
        posts?: AdminForumPostRecord[];
        error?: string;
      };
      const commentsData = (await commentsRes.json()) as {
        comments?: AdminForumCommentRecord[];
        error?: string;
      };
      if (!postsRes.ok) throw new Error(postsData.error ?? t("forumLoadFailed"));
      if (!commentsRes.ok)
        throw new Error(commentsData.error ?? t("forumLoadFailed"));
      setPosts(postsData.posts ?? []);
      setComments(commentsData.comments ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : t("forumLoadFailed")
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadForum();
  }, [loadForum]);

  async function moderatePost(postId: number, action: PostAction) {
    if (action === "delete" && !window.confirm(t("forumDeletePostConfirm"))) {
      return;
    }

    const key = `post-${postId}-${action}`;
    setActionLoading(key);
    setError(null);
    try {
      const response = await fetch(`/api/admin/forum/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? t("forumActionFailed"));
      await loadForum();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : t("forumActionFailed")
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function moderateComment(commentId: number, action: CommentAction) {
    if (action === "delete" && !window.confirm(t("forumDeleteCommentConfirm"))) {
      return;
    }

    const key = `comment-${commentId}-${action}`;
    setActionLoading(key);
    setError(null);
    try {
      const response = await fetch(`/api/admin/forum/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? t("forumActionFailed"));
      await loadForum();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : t("forumActionFailed")
      );
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">{t("tabForum")}</h2>
          <p className="mt-1 text-sm text-zinc-500">{t("forumDesc")}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void loadForum()}
          disabled={loading}
          className="gap-2 border-white/10"
        >
          <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          {t("refresh")}
        </Button>
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="border border-white/10 bg-zinc-900/60">
          <TabsTrigger value="posts">{t("forumTabPosts")}</TabsTrigger>
          <TabsTrigger value="comments">{t("forumTabComments")}</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-4">
          <Card className="border-white/8 bg-zinc-900/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-white">
                <MessageSquare className="size-4 text-violet-400" />
                {t("forumPostsTitle")}
              </CardTitle>
              <CardDescription>{t("forumPostsDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="size-6 animate-spin text-violet-400" />
                </div>
              ) : posts.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-500">
                  {t("forumPostsEmpty")}
                </p>
              ) : (
                posts.map((post) => (
                  <div
                    key={post.id}
                    className="rounded-xl border border-white/8 bg-black/20 px-4 py-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white">
                          {post.title}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {post.authorName} · {post.gameTitle} ·{" "}
                          {formatDate(post.createdAt, locale)}
                        </p>
                        <p className="mt-2 line-clamp-2 text-sm text-zinc-400">
                          {post.content}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {post.isHidden && (
                          <Badge className="border border-amber-400/30 bg-amber-500/10 text-amber-200">
                            {t("forumHidden")}
                          </Badge>
                        )}
                        {post.isLocked && (
                          <Badge className="border border-rose-400/30 bg-rose-500/10 text-rose-200">
                            {t("forumLocked")}
                          </Badge>
                        )}
                        <Badge className="border border-white/10 bg-white/5 text-zinc-300">
                          {post.commentCount} {t("forumComments")}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!!actionLoading}
                        onClick={() =>
                          void moderatePost(
                            post.id,
                            post.isHidden ? "unhide" : "hide"
                          )
                        }
                        className="gap-1 border-white/10 text-xs"
                      >
                        {actionLoading ===
                        `post-${post.id}-${post.isHidden ? "unhide" : "hide"}` ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : post.isHidden ? (
                          <Eye className="size-3" />
                        ) : (
                          <EyeOff className="size-3" />
                        )}
                        {post.isHidden ? t("forumUnhide") : t("forumHide")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!!actionLoading}
                        onClick={() =>
                          void moderatePost(
                            post.id,
                            post.isLocked ? "unlock" : "lock"
                          )
                        }
                        className="gap-1 border-white/10 text-xs"
                      >
                        {actionLoading ===
                        `post-${post.id}-${post.isLocked ? "unlock" : "lock"}` ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : post.isLocked ? (
                          <Unlock className="size-3" />
                        ) : (
                          <Lock className="size-3" />
                        )}
                        {post.isLocked ? t("forumUnlock") : t("forumLock")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!!actionLoading}
                        onClick={() => void moderatePost(post.id, "delete")}
                        className="gap-1 border-rose-400/20 text-xs text-rose-200"
                      >
                        {actionLoading === `post-${post.id}-delete` ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Trash2 className="size-3" />
                        )}
                        {t("forumDelete")}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments" className="mt-4">
          <Card className="border-white/8 bg-zinc-900/60">
            <CardHeader>
              <CardTitle className="text-base text-white">
                {t("forumCommentsTitle")}
              </CardTitle>
              <CardDescription>{t("forumCommentsDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="size-6 animate-spin text-violet-400" />
                </div>
              ) : comments.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-500">
                  {t("forumCommentsEmpty")}
                </p>
              ) : (
                comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="rounded-xl border border-white/8 bg-black/20 px-4 py-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-zinc-500">
                          {comment.authorName} · {comment.postTitle} ·{" "}
                          {formatDate(comment.createdAt, locale)}
                        </p>
                        <p className="mt-1 text-sm text-zinc-300">
                          {comment.content}
                        </p>
                      </div>
                      {comment.isHidden && (
                        <Badge className="border border-amber-400/30 bg-amber-500/10 text-amber-200">
                          {t("forumHidden")}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!!actionLoading}
                        onClick={() =>
                          void moderateComment(
                            comment.id,
                            comment.isHidden ? "unhide" : "hide"
                          )
                        }
                        className="gap-1 border-white/10 text-xs"
                      >
                        {actionLoading ===
                        `comment-${comment.id}-${comment.isHidden ? "unhide" : "hide"}` ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : comment.isHidden ? (
                          <Eye className="size-3" />
                        ) : (
                          <EyeOff className="size-3" />
                        )}
                        {comment.isHidden ? t("forumUnhide") : t("forumHide")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!!actionLoading}
                        onClick={() => void moderateComment(comment.id, "delete")}
                        className="gap-1 border-rose-400/20 text-xs text-rose-200"
                      >
                        {actionLoading === `comment-${comment.id}-delete` ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Trash2 className="size-3" />
                        )}
                        {t("forumDelete")}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
