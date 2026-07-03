"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Clock3,
  Gamepad2,
  Heart,
  Loader2,
  Share2,
  Sparkles,
  TrendingUp,
  Upload,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TrendChart = dynamic(
  () =>
    import("@/components/dashboard/trend-chart").then((mod) => mod.TrendChart),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[320px] min-h-[320px] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-cyan-400" />
      </div>
    ),
  }
);

const OVERVIEW_STATS = [
  {
    label: "Total Plays",
    title: "總遊玩次數",
    value: "128,492",
    change: "+18.2%",
    icon: Gamepad2,
    accent: "from-cyan-500/20 to-cyan-500/5 text-cyan-300 ring-cyan-400/20",
    iconBg: "bg-cyan-500/15 text-cyan-400",
  },
  {
    label: "Total Likes",
    title: "總按讚數",
    value: "8,731",
    change: "+12.4%",
    icon: Heart,
    accent: "from-rose-500/20 to-rose-500/5 text-rose-300 ring-rose-400/20",
    iconBg: "bg-rose-500/15 text-rose-400",
  },
  {
    label: "Avg. Play Time",
    title: "平均遊玩時長",
    value: "4m 32s",
    change: "+6.8%",
    icon: Clock3,
    accent: "from-violet-500/20 to-violet-500/5 text-violet-300 ring-violet-400/20",
    iconBg: "bg-violet-500/15 text-violet-400",
  },
  {
    label: "Shares",
    title: "分享與嵌入次數",
    value: "2,184",
    change: "+24.1%",
    icon: Share2,
    accent: "from-fuchsia-500/20 to-fuchsia-500/5 text-fuchsia-300 ring-fuchsia-400/20",
    iconBg: "bg-fuchsia-500/15 text-fuchsia-400",
  },
] as const;

const MOCK_GAMES = [
  {
    id: 1,
    title: "VOID GACHA",
    cover:
      "https://icydkixwynxizrgfzelq.supabase.co/storage/v1/object/public/game-covers/d37f574e-1360-4c41-800c-6aa6fadf98cb-774ed615-911f-46c1-ac3d-1015fac6ef7754745745.jfif",
    uploadedAt: "2026-03-28",
    status: "published" as const,
    plays: "86,420",
  },
  {
    id: 2,
    title: "Neon Drift Racer",
    cover:
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80",
    uploadedAt: "2026-03-15",
    status: "published" as const,
    plays: "28,104",
  },
  {
    id: 3,
    title: "Pixel Dungeon X",
    cover:
      "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=800&q=80",
    uploadedAt: "2026-04-01",
    status: "review" as const,
    plays: "—",
  },
  {
    id: 4,
    title: "Sky Tower Defense",
    cover:
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&q=80",
    uploadedAt: "2026-04-03",
    status: "draft" as const,
    plays: "—",
  },
];

const STATUS_META = {
  published: {
    label: "已發佈",
    className: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/25",
  },
  review: {
    label: "審核中",
    className: "bg-amber-500/15 text-amber-300 ring-amber-400/25",
  },
  draft: {
    label: "草稿",
    className: "bg-zinc-500/15 text-zinc-300 ring-zinc-400/20",
  },
} as const;

export default function CreatorDashboardPage() {
  return (
    <div className="dark min-h-full bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 top-0 size-[520px] rounded-full bg-violet-600/15 blur-[130px]" />
        <div className="absolute -right-32 top-1/4 size-[560px] rounded-full bg-cyan-500/10 blur-[140px]" />
        <div className="absolute bottom-0 left-1/2 size-[640px] -translate-x-1/2 rounded-full bg-fuchsia-600/8 blur-[150px]" />
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
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "gap-1.5 text-zinc-400 hover:text-cyan-300"
            )}
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">返回首頁</span>
          </Link>

          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-violet-600 shadow-md shadow-cyan-500/20">
              <BarChart3 className="size-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">創作者儀表板</p>
              <p className="hidden text-xs text-zinc-500 sm:block">
                Creator Analytics
              </p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/dashboard/upload"
              className={cn(
                buttonVariants({ size: "sm" }),
                "gap-1.5 border-0 bg-gradient-to-r from-cyan-500 to-violet-600 text-white shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-violet-500"
              )}
            >
              <Upload className="size-4" />
              <span className="hidden sm:inline">上傳新遊戲</span>
              <span className="sm:hidden">上傳</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-1.5 text-xs font-medium text-cyan-300">
            <Sparkles className="size-3.5" />
            數據總覽 · Mock Preview
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            歡迎回來，創作者
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
            追蹤你的遊戲表現、分析玩家趨勢，並管理所有已上傳作品。以下為示範數據，正式上線後將自動同步真實統計。
          </p>
        </motion.div>

        <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {OVERVIEW_STATS.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
              >
                <Card
                  className={cn(
                    "overflow-hidden border-white/10 bg-zinc-900/60 py-0 shadow-lg shadow-black/30 backdrop-blur-sm",
                    "bg-gradient-to-br ring-1 ring-inset",
                    stat.accent
                  )}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                          {stat.label}
                        </p>
                        <p className="mt-1 text-sm text-zinc-300">{stat.title}</p>
                      </div>
                      <div
                        className={cn(
                          "flex size-10 items-center justify-center rounded-xl",
                          stat.iconBg
                        )}
                      >
                        <Icon className="size-5" />
                      </div>
                    </div>
                    <div className="mt-5 flex items-end justify-between gap-3">
                      <p className="text-3xl font-bold tracking-tight text-white">
                        {stat.value}
                      </p>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
                        <TrendingUp className="size-3.5" />
                        {stat.change}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </section>

        <section className="mb-8 grid gap-6 xl:grid-cols-[1.6fr_0.8fr]">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="overflow-hidden border-white/10 bg-zinc-900/60 py-0 shadow-xl shadow-black/40 backdrop-blur-sm">
              <CardHeader className="border-b border-white/5 px-6 pt-6 pb-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl text-white">
                      <Activity className="size-5 text-cyan-400" />
                      每日瀏覽人數與遊玩次數
                    </CardTitle>
                    <CardDescription className="mt-1 text-zinc-400">
                      過去 14 天的流量與轉換趨勢
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs">
                    <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-cyan-300">
                      <span className="size-2 rounded-full bg-cyan-400" />
                      瀏覽人數
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-violet-300">
                      <span className="size-2 rounded-full bg-violet-400" />
                      遊玩次數
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-2 pb-4 pt-2 sm:px-6 sm:pb-6">
                <TrendChart />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.28 }}
          >
            <Card className="h-full border-white/10 bg-zinc-900/60 py-0 shadow-xl shadow-black/40 backdrop-blur-sm">
              <CardHeader className="border-b border-white/5 px-6 pt-6 pb-4">
                <CardTitle className="text-lg text-white">本週亮點</CardTitle>
                <CardDescription className="text-zinc-400">
                  快速掌握關鍵成長指標
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                {[
                  {
                    label: "最高單日遊玩",
                    value: "1,380",
                    hint: "4/3 · VOID GACHA 帶動",
                  },
                  {
                    label: "新玩家佔比",
                    value: "63%",
                    hint: "較上週 +9%",
                  },
                  {
                    label: "平均完玩率",
                    value: "41%",
                    hint: "停留超過 3 分鐘",
                  },
                  {
                    label: "嵌入播放",
                    value: "412",
                    hint: "外部網站引用",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3"
                  >
                    <p className="text-xs text-zinc-500">{item.label}</p>
                    <p className="mt-1 text-2xl font-bold text-white">{item.value}</p>
                    <p className="mt-1 text-xs text-zinc-400">{item.hint}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </section>

        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.34 }}
        >
          <Card className="overflow-hidden border-white/10 bg-zinc-900/60 py-0 shadow-xl shadow-black/40 backdrop-blur-sm">
            <CardHeader className="border-b border-white/5 px-6 pt-6 pb-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl text-white">遊戲管理清單</CardTitle>
                  <CardDescription className="mt-1 text-zinc-400">
                    查看你上傳的所有作品與目前狀態
                  </CardDescription>
                </div>
                <Button
                  nativeButton={false}
                  render={<Link href="/dashboard/upload" />}
                  className="gap-2 border-0 bg-gradient-to-r from-cyan-500 to-violet-600 text-white hover:from-cyan-400 hover:to-violet-500"
                >
                  <Upload className="size-4" />
                  上傳新遊戲
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-white/5">
                {MOCK_GAMES.map((game) => {
                  const status = STATUS_META[game.status];
                  return (
                    <div
                      key={game.id}
                      className="flex flex-col gap-4 px-4 py-4 transition-colors hover:bg-white/[0.02] sm:flex-row sm:items-center sm:px-6"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-4">
                        <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-zinc-800">
                          <Image
                            src={game.cover}
                            alt={game.title}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-base font-semibold text-white">
                              {game.title}
                            </h3>
                            <span
                              className={cn(
                                "rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
                                status.className
                              )}
                            >
                              {status.label}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-zinc-500">
                            上傳日期 · {game.uploadedAt}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-6 sm:justify-end">
                        <div className="text-right">
                          <p className="text-xs text-zinc-500">累計遊玩</p>
                          <p className="mt-1 font-semibold text-cyan-300">
                            {game.plays}
                          </p>
                        </div>
                        {game.status === "published" && (
                          <Link
                            href={`/game/${game.id}`}
                            className={cn(
                              buttonVariants({ variant: "outline", size: "sm" }),
                              "border-white/10 bg-white/5 text-zinc-300 hover:border-cyan-400/30 hover:text-white"
                            )}
                          >
                            查看
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.section>
      </main>
    </div>
  );
}
