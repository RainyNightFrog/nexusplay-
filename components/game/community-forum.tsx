"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  MessageSquarePlus,
  MessagesSquare,
  Send,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import {
  FORUM_CATEGORIES,
  FORUM_LIMITS,
  formatForumDate,
  getForumCategoryMeta,
  type ForumCategory,
  type ForumComment,
  type ForumPost,
} from "@/lib/forum";
import { cn } from "@/lib/utils";

type CommunityForumProps = {
  gameId: number;
  onToast: (message: string) => void;
};

function CategoryBadge({ category }: { category: string }) {
  const meta = getForumCategoryMeta(category);
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-md border px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        meta.badgeClass
      )}
    >
      {meta.emoji} {meta.label}
    </Badge>
  );
}

function PostSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-20 rounded-md bg-zinc-800/70" />
        <Skeleton className="h-4 w-24 bg-zinc-800/70" />
      </div>
      <Skeleton className="mt-3 h-5 w-3/4 bg-zinc-800/70" />
      <Skeleton className="mt-2 h-4 w-1/2 bg-zinc-800/70" />
    </div>
  );
}

export function CommunityForum({ gameId, onToast }: CommunityForumProps) {
  const { profile, loading: authLoading } = useAuth();

  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<ForumCategory>("general");
  const [newContent, setNewContent] = useState("");

  const [replyContent, setReplyContent] = useState("");
  const [replying, setReplying] = useState(false);

  const loadPosts = useCallback(async () => {
    setPostsLoading(true);
    try {
      const response = await fetch(`/api/games/${gameId}/forum/posts`);
      const data = (await response.json()) as {
        posts?: ForumPost[];
        error?: string;
      };
      setPosts(data.posts ?? []);
    } catch {
      setPosts([]);
      onToast("讀取討論區失敗");
    } finally {
      setPostsLoading(false);
    }
  }, [gameId, onToast]);

  const loadComments = useCallback(
    async (postId: number) => {
      setCommentsLoading(true);
      try {
        const response = await fetch(
          `/api/games/${gameId}/forum/posts/${postId}/comments`
        );
        const data = (await response.json()) as {
          comments?: ForumComment[];
          error?: string;
        };
        setComments(data.comments ?? []);
      } catch {
        setComments([]);
        onToast("讀取回覆失敗");
      } finally {
        setCommentsLoading(false);
      }
    },
    [gameId, onToast]
  );

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    if (selectedPost) {
      loadComments(selectedPost.id);
    } else {
      setComments([]);
    }
  }, [selectedPost, loadComments]);

  const handleOpenCreate = () => {
    if (!profile) {
      onToast("請先登入才能參與討論");
      return;
    }
    setCreateOpen(true);
  };

  const handleCreatePost = async () => {
    if (!profile) {
      onToast("請先登入才能參與討論");
      return;
    }

    const title = newTitle.trim();
    const content = newContent.trim();

    if (!title) {
      onToast("請輸入貼文標題");
      return;
    }
    if (!content) {
      onToast("請輸入貼文內容");
      return;
    }

    setCreating(true);
    try {
      const response = await fetch(`/api/games/${gameId}/forum/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          category: newCategory,
          content,
        }),
      });
      const data = (await response.json()) as {
        post?: ForumPost;
        error?: string;
      };

      if (!response.ok || !data.post) {
        onToast(data.error ?? "發布討論失敗");
        return;
      }

      setPosts((prev) => [data.post!, ...prev]);
      setNewTitle("");
      setNewCategory("general");
      setNewContent("");
      setCreateOpen(false);
      onToast("討論串已發布");
    } catch {
      onToast("發布討論失敗");
    } finally {
      setCreating(false);
    }
  };

  const handleSubmitReply = async () => {
    if (!selectedPost) return;

    if (!profile) {
      onToast("請先登入才能參與討論");
      return;
    }

    const content = replyContent.trim();
    if (!content) {
      onToast("請輸入回覆內容");
      return;
    }

    setReplying(true);
    try {
      const response = await fetch(
        `/api/games/${gameId}/forum/posts/${selectedPost.id}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        }
      );
      const data = (await response.json()) as {
        comment?: ForumComment;
        error?: string;
      };

      if (!response.ok || !data.comment) {
        onToast(data.error ?? "發表回覆失敗");
        return;
      }

      setComments((prev) => [...prev, data.comment!]);
      setReplyContent("");
      onToast("回覆已發表");
    } catch {
      onToast("發表回覆失敗");
    } finally {
      setReplying(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
            <MessagesSquare className="size-5 text-cyan-400" />
            社群討論區
          </h3>
          <p className="mt-1 text-sm text-zinc-500">
            分享心得、回報 Bug、與其他玩家交流
          </p>
        </div>

        {!selectedPost && (
          <Button
            onClick={handleOpenCreate}
            disabled={authLoading}
            className="gap-2 bg-gradient-to-r from-cyan-500 to-violet-600 text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-violet-500"
          >
            <MessageSquarePlus className="size-4" />
            發起新討論
          </Button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {selectedPost ? (
          <motion.div
            key={`thread-${selectedPost.id}`}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
            className="space-y-5"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedPost(null)}
              className="gap-1.5 text-zinc-400 hover:text-cyan-300"
            >
              <ArrowLeft className="size-4" />
              返回討論列表
            </Button>

            <article
              className={cn(
                "rounded-2xl border border-white/10 bg-zinc-900/60 p-5",
                "shadow-lg shadow-black/30"
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <CategoryBadge category={selectedPost.category} />
                <span className="text-xs text-zinc-500">
                  {formatForumDate(selectedPost.created_at)}
                </span>
              </div>
              <h4 className="mt-3 text-xl font-bold text-white">
                {selectedPost.title}
              </h4>
              <div className="mt-2 flex items-center gap-2 text-sm text-zinc-400">
                <UserRound className="size-4 text-violet-400" />
                <span>{selectedPost.author_name}</span>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
                {selectedPost.content}
              </p>
            </article>

            <section className="space-y-4">
              <h5 className="text-sm font-medium text-zinc-400">
                回覆 ({comments.length})
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
                    <motion.div
                      key={comment.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-white/8 bg-zinc-900/40 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-medium text-zinc-200">
                          {comment.author_name}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {formatForumDate(comment.created_at)}
                        </span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-400">
                        {comment.content}
                      </p>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-white/10 py-8 text-center text-sm text-zinc-500">
                  尚無回覆，成為第一位回應的玩家吧！
                </div>
              )}

              <div
                className={cn(
                  "rounded-2xl border border-white/10 bg-zinc-900/50 p-4",
                  "shadow-inner shadow-black/20"
                )}
              >
                {profile ? (
                  <div className="space-y-3">
                    <Textarea
                      value={replyContent}
                      onChange={(event) => setReplyContent(event.target.value)}
                      placeholder="寫下你的回覆…"
                      maxLength={FORUM_LIMITS.comment}
                      rows={3}
                      className="min-h-24 resize-none border-white/10 bg-white/5 text-zinc-100 placeholder:text-zinc-500 focus-visible:border-cyan-400/40 focus-visible:ring-cyan-500/20"
                    />
                    <div className="flex justify-end">
                      <Button
                        onClick={handleSubmitReply}
                        disabled={replying || !replyContent.trim()}
                        className="gap-2 bg-gradient-to-r from-cyan-500 to-violet-600 text-white hover:from-cyan-400 hover:to-violet-500"
                      >
                        {replying ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Send className="size-4" />
                        )}
                        發表回覆
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-4 text-center">
                    <p className="text-sm text-zinc-400">登入後即可參與討論</p>
                    <Button
                      nativeButton={false}
                      render={<Link href="/auth" />}
                      variant="outline"
                      className="border-white/10 bg-white/5 text-zinc-200 hover:border-cyan-400/30"
                    >
                      前往登入
                    </Button>
                  </div>
                )}
              </div>
            </section>
          </motion.div>
        ) : (
          <motion.div
            key="post-list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {postsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <PostSkeleton key={index} />
                ))}
              </div>
            ) : posts.length > 0 ? (
              <div className="space-y-3">
                {posts.map((post, index) => (
                  <motion.button
                    key={post.id}
                    type="button"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    onClick={() => setSelectedPost(post)}
                    className={cn(
                      "group w-full rounded-2xl border border-white/10 bg-zinc-900/50 p-4 text-left",
                      "transition-all duration-200 hover:border-cyan-400/30 hover:bg-zinc-900/80",
                      "hover:shadow-lg hover:shadow-cyan-500/5"
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <CategoryBadge category={post.category} />
                      <span className="text-xs text-zinc-500">
                        {formatForumDate(post.created_at)}
                      </span>
                    </div>
                    <h4 className="mt-2 text-base font-semibold text-white transition-colors group-hover:text-cyan-50">
                      {post.title}
                    </h4>
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-500">
                      {post.content}
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-zinc-400">
                      <UserRound className="size-3.5 text-violet-400/80" />
                      <span>{post.author_name}</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-zinc-900/30 py-14 text-center">
                <MessagesSquare className="mx-auto mb-3 size-10 text-zinc-600" />
                <p className="font-medium text-white">尚無討論串</p>
                <p className="mt-1 text-sm text-zinc-500">
                  成為第一位發起討論的玩家！
                </p>
                <Button
                  onClick={handleOpenCreate}
                  className="mt-5 gap-2 bg-gradient-to-r from-cyan-500 to-violet-600 text-white"
                >
                  <MessageSquarePlus className="size-4" />
                  發起新討論
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent
          showCloseButton
          className="border-white/10 bg-zinc-900 text-zinc-100 ring-white/10 sm:max-w-lg"
        >
          <DialogHeader>
            <DialogTitle className="text-white">發起新討論</DialogTitle>
            <DialogDescription className="text-zinc-400">
              選擇分類並描述你的問題或想法，與社群一起交流。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="forum-title" className="text-zinc-300">
                標題
              </Label>
              <Input
                id="forum-title"
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
                placeholder="例如：第三關怎麼過？"
                maxLength={FORUM_LIMITS.title}
                className="border-white/10 bg-white/5 text-zinc-100 placeholder:text-zinc-500 focus-visible:border-cyan-400/40 focus-visible:ring-cyan-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300">分類</Label>
              <Select
                value={newCategory}
                onValueChange={(value) => setNewCategory(value as ForumCategory)}
              >
                <SelectTrigger className="w-full border-white/10 bg-white/5 text-zinc-100">
                  <SelectValue placeholder="選擇分類" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-zinc-900 text-zinc-100 ring-white/10">
                  {FORUM_CATEGORIES.map((item) => (
                    <SelectItem
                      key={item.value}
                      value={item.value}
                      className="focus:bg-cyan-500/10 focus:text-cyan-100"
                    >
                      {item.emoji} {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="forum-content" className="text-zinc-300">
                詳細內容
              </Label>
              <Textarea
                id="forum-content"
                value={newContent}
                onChange={(event) => setNewContent(event.target.value)}
                placeholder="描述你的問題、建議或攻略心得…"
                maxLength={FORUM_LIMITS.content}
                rows={5}
                className="min-h-32 resize-none border-white/10 bg-white/5 text-zinc-100 placeholder:text-zinc-500 focus-visible:border-cyan-400/40 focus-visible:ring-cyan-500/20"
              />
            </div>
          </div>

          <DialogFooter className="border-white/10 bg-zinc-900/80 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              className="border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
            >
              取消
            </Button>
            <Button
              onClick={handleCreatePost}
              disabled={creating}
              className="gap-2 bg-gradient-to-r from-cyan-500 to-violet-600 text-white hover:from-cyan-400 hover:to-violet-500"
            >
              {creating && <Loader2 className="size-4 animate-spin" />}
              發布討論
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
