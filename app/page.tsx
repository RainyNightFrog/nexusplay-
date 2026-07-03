"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Gamepad2,
  Loader2,
  Search,
  Upload,
  Users,
  Sparkles,
  Zap,
  TrendingUp,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { CreatorDashboardLink, UserNav } from "@/components/auth/user-nav";
import { TAG_COLORS, type Game } from "@/lib/games";
import { cn } from "@/lib/utils";

const MotionLink = motion.create(Link);

function GameCard({ game, index }: { game: Game; index: number }) {
  return (
    <MotionLink
      href={`/game/${game.id}`}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.07, ease: "easeOut" }}
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      className="group relative block cursor-pointer"
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60",
          "shadow-lg shadow-black/40 backdrop-blur-sm",
          "transition-[border-color,box-shadow] duration-300",
          "group-hover:border-cyan-400/50 group-hover:shadow-cyan-500/10 group-hover:shadow-2xl"
        )}
      >
        <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/10 via-transparent to-violet-500/10" />
          <div className="absolute inset-px rounded-[15px] ring-1 ring-inset ring-white/10 group-hover:ring-cyan-400/40" />
        </div>

        <div className="relative aspect-[16/10] overflow-hidden">
          <Image
            src={game.image}
            alt={game.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
        </div>

        <div className="relative space-y-3 p-4 text-center">
          <h3 className="text-base font-semibold tracking-tight text-white transition-colors group-hover:text-cyan-50">
            {game.title}
          </h3>

          <div className="flex flex-wrap justify-center gap-1.5">
            {game.tags.map((tag) => (
              <span
                key={tag}
                className={cn(
                  "rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                  TAG_COLORS[tag] ?? "bg-zinc-700/50 text-zinc-300 ring-zinc-600/40"
                )}
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-400">
            <Users className="size-3.5 text-cyan-400/80" />
            <span>{game.players} 遊玩</span>
          </div>
        </div>
      </div>
    </MotionLink>
  );
}

export default function Home() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadGames() {
      try {
        const response = await fetch("/api/games");
        const data = (await response.json()) as { games?: Game[] };
        setGames(data.games ?? []);
      } catch {
        setGames([]);
      } finally {
        setLoading(false);
      }
    }

    loadGames();
  }, []);

  return (
    <div className="dark min-h-full bg-zinc-950 text-zinc-100">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 top-0 size-[480px] rounded-full bg-violet-600/15 blur-[120px]" />
        <div className="absolute -right-32 top-1/3 size-[520px] rounded-full bg-cyan-500/10 blur-[130px]" />
        <div className="absolute bottom-0 left-1/2 size-[600px] -translate-x-1/2 rounded-full bg-fuchsia-600/8 blur-[140px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-zinc-950/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <motion.a
            href="/"
            className="flex shrink-0 items-center gap-2.5"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="relative flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-violet-600 shadow-lg shadow-cyan-500/25">
              <Gamepad2 className="size-5 text-white" />
              <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 transition-opacity hover:opacity-100" />
            </div>
            <span className="hidden bg-gradient-to-r from-white via-cyan-100 to-violet-200 bg-clip-text text-lg font-bold tracking-tight text-transparent sm:block">
              NexusPlay
            </span>
          </motion.a>

          <div className="relative mx-auto hidden max-w-md flex-1 md:block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="search"
              placeholder="搜尋遊戲、標籤或創作者..."
              className={cn(
                "h-10 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 text-sm",
                "text-zinc-100 placeholder:text-zinc-500 backdrop-blur-md",
                "outline-none transition-all duration-200",
                "focus:border-cyan-400/40 focus:bg-white/8 focus:ring-2 focus:ring-cyan-500/20"
              )}
            />
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <CreatorDashboardLink />
            <UserNav />
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <section className="relative py-16 sm:py-24 lg:py-28">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="mx-auto max-w-3xl text-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-1.5 text-xs font-medium text-cyan-300 backdrop-blur-sm"
            >
              <Sparkles className="size-3.5" />
              全新遊戲平台 · 即刻開玩
            </motion.div>

            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              <span className="bg-gradient-to-br from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
                探索下一款
              </span>
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                傳奇遊戲
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">
              數千款網頁遊戲，零下載、零等待。創作者可輕鬆上傳作品，玩家盡情暢玩——
              這是你的電競宇宙入口。
            </p>

            <motion.div
              className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.5 }}
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.96 }}
                className="relative"
              >
                <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-cyan-400 via-violet-500 to-fuchsia-500 opacity-60 blur-lg transition-opacity duration-300 group-hover:opacity-100" />
                <Button
                  size="lg"
                  nativeButton={false}
                  render={<Link href="/dashboard/upload" />}
                  className={cn(
                    "group relative h-12 gap-2 overflow-hidden rounded-xl px-8 text-base font-semibold",
                    "border-0 bg-gradient-to-r from-cyan-500 via-violet-600 to-fuchsia-600 text-white",
                    "shadow-xl shadow-violet-500/25",
                    "before:absolute before:inset-0 before:translate-x-[-100%] before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent before:transition-transform before:duration-700 hover:before:translate-x-[100%]"
                  )}
                >
                  <Upload className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5" />
                  上傳你的遊戲
                  <Zap className="size-4 text-yellow-300 opacity-0 transition-all duration-300 group-hover:opacity-100" />
                </Button>
              </motion.div>

              <Button
                variant="outline"
                size="lg"
                className="h-12 rounded-xl border-white/10 bg-white/5 px-8 text-base text-zinc-300 backdrop-blur-sm hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                瀏覽熱門遊戲
              </Button>
            </motion.div>
          </motion.div>
        </section>

        {/* Game Grid */}
        <section className="pb-20">
          <div className="mb-8 text-center">
            <div className="mb-2 inline-flex items-center justify-center gap-2 text-sm font-medium text-cyan-400">
              <TrendingUp className="size-4" />
              本週熱門
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              精選遊戲
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              來自 Supabase 的社群作品
            </p>
            <Button
              variant="ghost"
              className="mt-4 text-zinc-400 hover:text-cyan-300"
            >
              查看全部 →
            </Button>
          </div>

          {loading ? (
            <div className="flex min-h-48 items-center justify-center">
              <Loader2 className="size-8 animate-spin text-cyan-400" />
            </div>
          ) : games.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {games.map((game, index) => (
                <GameCard key={game.id} game={game} index={index} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-zinc-900/40 py-16 text-center">
              <Gamepad2 className="mx-auto mb-4 size-10 text-zinc-600" />
              <p className="text-lg font-medium text-white">尚無遊戲</p>
              <p className="mt-2 text-sm text-zinc-500">
                成為第一位上傳作品的創作者吧！
              </p>
              <Link
                href="/dashboard/upload"
                className={cn(buttonVariants(), "mt-6 inline-flex")}
              >
                上傳新遊戲
              </Link>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="relative border-t border-white/5 py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-xs text-zinc-600 sm:px-6 lg:px-8">
          © 2026 NexusPlay · 網頁遊戲平台
        </div>
      </footer>
    </div>
  );
}
