"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  Gamepad2,
  Loader2,
  Lock,
  Mail,
  Sparkles,
  UserRound,
  WandSparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type AuthMode = "login" | "register";

const authInputClassName = cn(
  "h-11 rounded-xl border-white/10 bg-white/5 text-zinc-100 placeholder:text-zinc-500",
  "focus-visible:border-cyan-400/40 focus-visible:ring-cyan-500/20"
);

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectTo = searchParams.get("redirect") ?? "/";
  const hint = searchParams.get("hint");
  const callbackError = searchParams.get("error");

  const [mode, setMode] = useState<AuthMode>("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("player");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    callbackError ? "登入驗證失敗，請再試一次" : null
  );

  const hintMessage = useMemo(() => {
    if (hint === "creator") {
      return "創作者後台僅限「創作者」身分帳號。請登入創作者帳號，或註冊時選擇創作者身分。";
    }
    return null;
  }, [hint]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();

    try {
      if (mode === "register") {
        if (!displayName.trim()) {
          throw new Error("請輸入顯示名稱");
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              display_name: displayName.trim(),
              role,
            },
            emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
          },
        });

        if (signUpError) throw signUpError;

        if (data.session) {
          router.push(redirectTo);
          router.refresh();
          return;
        }

        setMessage("註冊成功！若已啟用 Email 驗證，請到信箱點擊連結後再登入。");
        setMode("login");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) throw signInError;

      router.push(redirectTo);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "操作失敗，請稍後再試"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dark relative min-h-full overflow-hidden bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-24 top-0 size-[520px] rounded-full bg-violet-600/20 blur-[130px]" />
        <div className="absolute -right-24 top-1/4 size-[560px] rounded-full bg-cyan-500/15 blur-[140px]" />
        <div className="absolute bottom-0 left-1/2 size-[640px] -translate-x-1/2 rounded-full bg-fuchsia-600/10 blur-[150px]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      <div className="relative mx-auto flex min-h-full max-w-6xl flex-col px-4 py-10 sm:px-6 lg:px-8">
        <Link href="/" className="mb-10 inline-flex w-fit items-center gap-2.5">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-violet-600 shadow-lg shadow-cyan-500/25">
            <Gamepad2 className="size-5 text-white" />
          </div>
          <span className="bg-gradient-to-r from-white via-cyan-100 to-violet-200 bg-clip-text text-xl font-bold tracking-tight text-transparent">
            NexusPlay
          </span>
        </Link>

        <div className="grid flex-1 items-center gap-10 lg:grid-cols-[1.1fr_420px]">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="hidden lg:block"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-1.5 text-xs font-medium text-cyan-300">
              <Sparkles className="size-3.5" />
              加入 NexusPlay 宇宙
            </div>
            <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
              <span className="bg-gradient-to-br from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
                登入、遊玩、
              </span>
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                或成為創作者
              </span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-zinc-400">
              玩家可收藏與暢玩社群作品；創作者帳號可進入後台上傳 zip
              遊戲，一鍵發佈到首頁。
            </p>

            <div className="mt-8 grid max-w-md gap-3">
              {[
                "安全 Supabase Auth 登入",
                "創作者專屬上傳後台",
                "電競風深色介面體驗",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300"
                >
                  <WandSparkles className="size-4 shrink-0 text-violet-400" />
                  {item}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative mx-auto w-full max-w-md"
          >
            <div className="absolute -inset-1 rounded-[28px] bg-gradient-to-r from-cyan-400 via-violet-500 to-fuchsia-500 opacity-40 blur-xl" />

            <Card className="relative overflow-hidden rounded-[24px] border-white/10 bg-zinc-900/80 py-0 shadow-2xl shadow-black/50 backdrop-blur-xl">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />

              <CardHeader className="gap-4 px-6 pt-6 pb-0">
                <div className="flex rounded-xl border border-white/10 bg-white/5 p-1">
                  {(["login", "register"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => {
                        setMode(tab);
                        setError(null);
                        setMessage(null);
                      }}
                      className={cn(
                        "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                        mode === tab
                          ? "bg-gradient-to-r from-cyan-500 to-violet-600 text-white shadow-md shadow-violet-500/20"
                          : "text-zinc-400 hover:text-zinc-200"
                      )}
                    >
                      {tab === "login" ? "登入" : "註冊"}
                    </button>
                  ))}
                </div>

                <div>
                  <CardTitle className="text-2xl text-white">
                    {mode === "login" ? "歡迎回來" : "建立新帳號"}
                  </CardTitle>
                  <CardDescription className="mt-1 text-zinc-400">
                    {mode === "login"
                      ? "輸入 Email 與密碼開始遊玩"
                      : "選擇玩家或創作者身分加入平台"}
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="px-6 pb-6 pt-5">
                {(hintMessage || message || error) && (
                  <div className="mb-4 space-y-2">
                    {hintMessage && (
                      <div className="flex gap-2 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-200">
                        <AlertCircle className="mt-0.5 size-4 shrink-0" />
                        {hintMessage}
                      </div>
                    )}
                    {message && (
                      <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2.5 text-sm text-cyan-100">
                        {message}
                      </div>
                    )}
                    {error && (
                      <div className="flex gap-2 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-200">
                        <AlertCircle className="mt-0.5 size-4 shrink-0" />
                        {error}
                      </div>
                    )}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <AnimatePresence mode="wait">
                    {mode === "register" && (
                      <motion.div
                        key="register-fields"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4 overflow-hidden"
                      >
                        <div className="space-y-2">
                          <Label htmlFor="displayName" className="text-zinc-300">
                            顯示名稱
                          </Label>
                          <div className="relative">
                            <UserRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-500" />
                            <Input
                              id="displayName"
                              value={displayName}
                              onChange={(event) =>
                                setDisplayName(event.target.value)
                              }
                              placeholder="你的暱稱"
                              className={cn(authInputClassName, "pl-10")}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-zinc-300">帳號身分</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {(
                              [
                                { value: "player", label: "玩家" },
                                { value: "creator", label: "創作者" },
                              ] as const
                            ).map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => setRole(option.value)}
                                className={cn(
                                  "rounded-xl border px-3 py-2.5 text-sm font-medium transition-all",
                                  role === option.value
                                    ? "border-violet-400/40 bg-violet-500/15 text-violet-200"
                                    : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                                )}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-zinc-300">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-500" />
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@example.com"
                        required
                        className={cn(authInputClassName, "pl-10")}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-zinc-300">
                      密碼
                    </Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-500" />
                      <Input
                        id="password"
                        type="password"
                        autoComplete={
                          mode === "login" ? "current-password" : "new-password"
                        }
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="至少 6 個字元"
                        minLength={6}
                        required
                        className={cn(authInputClassName, "pl-10")}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className={cn(
                      "mt-2 h-11 w-full rounded-xl border-0 text-base font-semibold",
                      "bg-gradient-to-r from-cyan-500 via-violet-600 to-fuchsia-600 text-white",
                      "shadow-lg shadow-violet-500/25 hover:from-cyan-400 hover:to-violet-500"
                    )}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        處理中…
                      </>
                    ) : mode === "login" ? (
                      "登入"
                    ) : (
                      "建立帳號"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
