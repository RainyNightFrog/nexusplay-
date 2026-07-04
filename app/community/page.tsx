"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Gamepad2,
  Loader2,
  MessagesSquare,
  ScrollText,
  Users,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { CreatorDashboardLink, UserNav } from "@/components/auth/user-nav";
import { CommunityForum } from "@/components/game/community-forum";
import { FEATURED_GAMES } from "@/lib/platform-catalog";
import { isSupabaseImage, type Game } from "@/lib/games";
import type { ForumPostWithGame } from "@/lib/forum";
import { cn } from "@/lib/utils";

export default function CommunityPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [forumCounts, setForumCounts] = useState<Record<number, number>>({});
  const [totalPosts, setTotalPosts] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2500);
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const response = await fetch("/api/games?sort=views");
        const data = (await response.json()) as { games?: Game[] };
        setGames(data.games ?? []);
      } catch {
        setGames([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const handlePostsLoaded = useCallback((posts: ForumPostWithGame[]) => {
    const counts: Record<number, number> = {};
    for (const post of posts) {
      counts[post.game_id] = (counts[post.game_id] ?? 0) + 1;
    }
    setForumCounts(counts);
    setTotalPosts(posts.length);
  }, []);

  const gameOptions = games.map((game) => ({
    id: game.id,
    title: game.title,
  }));

  return (
    <div className="dark relative min-h-full text-zinc-100">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-zinc-950/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-4 sm:px-6">
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "gap-1.5 text-zinc-400 hover:text-cyan-300"
            )}
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">首頁</span>
          </Link>

          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-md shadow-violet-500/20">
              <MessagesSquare className="size-4 text-white" />
            </div>
            <span className="bg-gradient-to-r from-white via-violet-100 to-fuchsia-200 bg-clip-text text-base font-bold tracking-tight text-transparent">
              社群中心
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <CreatorDashboardLink />
            <UserNav />
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-4 py-1.5 text-xs font-medium text-violet-300">
            <Users className="size-3.5" />
            Community Forum
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            社群討論區
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
            在這裡瀏覽全站討論、發表文章與留言，或前往各遊戲專屬討論區。
          </p>
          <Link
            href="/community/rules"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-violet-400/90 transition-colors hover:text-violet-300"
          >
            <ScrollText className="size-3.5" />
            閱讀社群規則
          </Link>
          {!loading && games.length > 0 && (
            <p className="mt-2 text-xs text-zinc-500">
              {games.length} 款遊戲 · {totalPosts} 則討論
            </p>
          )}
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="size-10 animate-spin text-violet-400" />
          </div>
        ) : games.length > 0 ? (
          <>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className={cn(
                "mb-10 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50",
                "shadow-xl shadow-black/40 backdrop-blur-sm"
              )}
            >
              <CommunityForum
                hubMode
                games={gameOptions}
                onToast={showToast}
                onPostsChange={setTotalPosts}
                onPostsLoaded={handlePostsLoaded}
              />
            </motion.div>

            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                <Gamepad2 className="size-5 text-cyan-400" />
                依遊戲瀏覽
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {games.map((game, index) => (
                  <motion.div
                    key={game.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      href={`/game/${game.id}/forum`}
                      className={cn(
                        "group flex gap-4 rounded-2xl border border-white/10 bg-zinc-900/60 p-4",
                        "transition-all duration-200 hover:border-violet-400/30 hover:bg-zinc-900/80",
                        "hover:shadow-lg hover:shadow-violet-500/10"
                      )}
                    >
                      <div className="relative size-20 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-zinc-800">
                        <Image
                          src={game.image}
                          alt={game.title}
                          fill
                          sizes="80px"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          unoptimized={!isSupabaseImage(game.image)}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-semibold text-white group-hover:text-violet-50">
                          {game.title}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-500">
                          {game.description}
                        </p>
                        <div className="mt-3 flex items-center gap-3 text-xs">
                          <span className="flex items-center gap-1 text-violet-300">
                            <MessagesSquare className="size-3.5" />
                            {forumCounts[game.id] ?? 0} 則討論
                          </span>
                          <span className="flex items-center gap-1 text-zinc-500">
                            <Gamepad2 className="size-3.5" />
                            {game.players} 遊玩
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </section>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center">
            <MessagesSquare className="mx-auto mb-3 size-10 text-zinc-600" />
            <p className="text-zinc-400">尚無遊戲討論區</p>
            <Link href="/" className={cn(buttonVariants(), "mt-4 inline-flex")}>
              瀏覽遊戲
            </Link>
          </div>
        )}

        {FEATURED_GAMES.length > 0 && !loading && games.length > 0 && (
          <p className="mt-8 text-center text-xs text-zinc-600">
            熱門討論：
            {FEATURED_GAMES.map((g, i) => {
              const matched = games.find((x) => x.title === g.title);
              if (!matched) return null;
              return (
                <span key={g.slug}>
                  {i > 0 && " · "}
                  <Link
                    href={`/game/${matched.id}/forum`}
                    className="text-violet-400/80 hover:text-violet-300"
                  >
                    {g.title}
                  </Link>
                </span>
              );
            })}
          </p>
        )}
      </main>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={cn(
              "fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2",
              "rounded-full border border-violet-400/30 bg-zinc-900/95 px-5 py-2.5",
              "text-sm text-violet-100 shadow-xl shadow-violet-500/10 backdrop-blur-md"
            )}
          >
            <Check className="size-4 text-violet-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
