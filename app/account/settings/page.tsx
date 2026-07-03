"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Gamepad2,
  Loader2,
  Mail,
  Save,
  Shield,
  UserRound,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { getInitials } from "@/lib/auth";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const inputClassName = cn(
  "h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-zinc-100",
  "placeholder:text-zinc-500 outline-none transition-all",
  "focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-500/20"
);

export default function AccountSettingsPage() {
  const router = useRouter();
  const { profile, loading, refreshProfile, isCreator } = useAuth();
  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;

    if (!profile) {
      router.replace("/auth?redirect=/account/settings");
      return;
    }

    setDisplayName(profile.display_name);

    fetch("/api/auth/profile")
      .then((response) => response.json())
      .then((data: { email?: string | null }) => {
        setEmail(data.email ?? null);
      })
      .catch(() => setEmail(null));
  }, [loading, profile, router]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: displayName.trim() }),
      });

      const data = (await response.json()) as {
        error?: string;
        profile?: { display_name: string };
      };

      if (!response.ok) {
        throw new Error(data.error ?? "儲存失敗，請稍後再試");
      }

      await refreshProfile();
      setSuccess("帳號設定已更新");
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "儲存失敗，請稍後再試"
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading || !profile) {
    return (
      <div className="dark flex min-h-full items-center justify-center bg-zinc-950">
        <Loader2 className="size-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  const initials = getInitials(profile.display_name);

  return (
    <div className="dark min-h-full bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 top-0 size-[480px] rounded-full bg-violet-600/15 blur-[120px]" />
        <div className="absolute -right-32 top-1/3 size-[520px] rounded-full bg-cyan-500/10 blur-[130px]" />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/5 bg-zinc-950/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-4 px-4 sm:px-6">
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "gap-1.5 text-zinc-400 hover:text-cyan-300"
            )}
          >
            <ArrowLeft className="size-4" />
            返回首頁
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-violet-600">
              <Gamepad2 className="size-4 text-white" />
            </div>
            <span className="hidden text-sm font-semibold text-white sm:block">
              NexusPlay
            </span>
          </Link>
        </div>
      </header>

      <main className="relative mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full border border-cyan-400/30 bg-gradient-to-br from-cyan-500/30 to-violet-600/40 text-lg font-bold text-white">
              {initials}
            </div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">帳號設定</h1>
            <p className="mt-2 text-sm text-zinc-500">
              管理你的顯示名稱與帳號資訊
            </p>
          </div>

          <Card className="border-white/10 bg-zinc-900/60 shadow-xl shadow-black/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <UserRound className="size-5 text-cyan-400" />
                個人資料
              </CardTitle>
              <CardDescription className="text-zinc-500">
                這些資訊會顯示在你的個人選單與創作者身份中
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-zinc-300">
                    顯示名稱
                  </Label>
                  <input
                    id="displayName"
                    type="text"
                    value={displayName}
                    maxLength={40}
                    onChange={(event) => setDisplayName(event.target.value)}
                    className={inputClassName}
                    placeholder="輸入你的顯示名稱"
                    disabled={saving}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-300">電子郵件</Label>
                  <div
                    className={cn(
                      inputClassName,
                      "flex items-center gap-2 text-zinc-400"
                    )}
                  >
                    <Mail className="size-4 shrink-0 text-zinc-500" />
                    <span className="truncate">{email ?? "—"}</span>
                  </div>
                  <p className="text-xs text-zinc-600">電子郵件目前無法在此修改</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-300">帳號身分</Label>
                  <div
                    className={cn(
                      inputClassName,
                      "flex items-center gap-2 text-zinc-300"
                    )}
                  >
                    <Shield className="size-4 shrink-0 text-violet-400" />
                    {isCreator ? "創作者" : "玩家"}
                  </div>
                </div>

                {error && (
                  <p className="rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                    {error}
                  </p>
                )}

                {success && (
                  <p className="flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                    <CheckCircle2 className="size-4" />
                    {success}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={saving || !displayName.trim()}
                  className="w-full gap-2 bg-gradient-to-r from-cyan-500 to-violet-600 text-white hover:from-cyan-400 hover:to-violet-500"
                >
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  {saving ? "儲存中…" : "儲存變更"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
