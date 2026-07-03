"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Gamepad2,
  Loader2,
  MessagesSquare,
  Play,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { CommunityForum } from "@/components/game/community-forum";
import { UserNav } from "@/components/auth/user-nav";
import { isSupabaseImage, type Game } from "@/lib/games";
import { cn } from "@/lib/utils";

function ForumPageFallback() {
  return (
    <div className="dark flex min-h-full flex-col items-center justify-center bg-zinc-950 px-4 text-zinc-100">
      <Loader2 className="mb-4 size-10 animate-spin text-violet-400" />
      <p className="text-sm text-zinc-400">載入討論區…</p>
    </div>
  );
}

export default function GameForumPage() {
  return (
    <Suspense fallback={<ForumPageFallback />}>
      <GameForumContent />
    </Suspense>
  );
}

function GameForumContent() {
  const params = useParams();
  const gameId = params.id as string;

  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2500);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadGame() {
      setLoading(true);
      try {
        const response = await fetch(`/api/games/${gameId}`);
        const data = (await response.json()) as {
          game?: Game;
          error?: string;
        };

        if (!cancelled) {
          setGame(response.ok ? (data.game ?? null) : null);
        }
      } catch {
        if (!cancelled) setGame(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadGame();
    return () => {
      cancelled = true;
    };
  }, [gameId]);

  if (loading) {
    return <ForumPageFallback />;
  }

  if (!game) {
    return (
      <div className="dark flex min-h-full flex-col items-center justify-center bg-zinc-950 px-4 text-zinc-100">
        <MessagesSquare className="mb-4 size-12 text-zinc-600" />
        <h1 className="text-xl font-semibold text-white">找不到此遊戲的討論區</h1>
        <Link href="/community" className={cn(buttonVariants(), "mt-6")}>
          返回社群中心
        </Link>
      </div>
    );
  }

  return (
    <div className="dark min-h-full bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 top-0 size-[520px] rounded-full bg-violet-600/15 blur-[130px]" />
        <div className="absolute -right-32 top-1/4 size-[560px] rounded-full bg-fuchsia-500/8 blur-[140px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/5 bg-zinc-950/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4 sm:px-6">
          <Link
            href="/community"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "gap-1.5 text-zinc-400 hover:text-violet-300"
            )}
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">社群中心</span>
          </Link>

          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-md shadow-violet-500/20">
              <MessagesSquare className="size-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {game.title}
              </p>
              <p className="text-[11px] text-violet-300/80">社群討論區</p>
            </div>
          </div>

          <Link
            href={`/game/${game.id}`}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "hidden gap-1.5 border-white/10 bg-white/5 text-zinc-300 hover:border-cyan-400/30 sm:inline-flex"
            )}
          >
            <Play className="size-3.5" />
            返回遊戲
          </Link>

          <UserNav />
        </div>
      </header>

      <main className="relative mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "mb-6 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60",
            "shadow-lg shadow-black/40"
          )}
        >
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-zinc-800">
              <Image
                src={game.image}
                alt={game.title}
                fill
                sizes="64px"
                className="object-cover"
                unoptimized={!isSupabaseImage(game.image)}
              />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold text-white sm:text-xl">
                {game.title}
              </h1>
              <p className="mt-1 line-clamp-2 text-sm text-zinc-400">
                {game.description}
              </p>
            </div>
            <Link
              href={`/game/${game.id}`}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "shrink-0 gap-1.5 border-cyan-400/25 bg-cyan-500/10 text-cyan-200 hover:border-cyan-400/40 sm:hidden"
              )}
            >
              <Gamepad2 className="size-3.5" />
              玩遊戲
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className={cn(
            "overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50",
            "shadow-xl shadow-black/40 backdrop-blur-sm"
          )}
        >
          <CommunityForum
            gameId={game.id}
            gameTitle={game.title}
            onToast={showToast}
          />
        </motion.div>
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
