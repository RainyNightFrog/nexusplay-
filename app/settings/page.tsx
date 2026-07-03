"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Camera,
  Check,
  Gamepad2,
  Globe,
  Loader2,
  Mail,
  Save,
  AtSign,
  UserRound,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getInitials } from "@/lib/auth";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const inputClassName = cn(
  "h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-center text-sm text-zinc-100",
  "placeholder:text-zinc-500 outline-none transition-all",
  "focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-500/20"
);

const labelClassName = "block text-center text-zinc-300";

const fieldClassName = "space-y-2 text-center";

export default function SettingsPage() {
  const router = useRouter();
  const { profile, loading, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [website, setWebsite] = useState("");
  const [twitter, setTwitter] = useState("");
  const [playingGames, setPlayingGames] = useState(true);
  const [developingGames, setDevelopingGames] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  useEffect(() => {
    if (loading) return;

    if (!profile) {
      router.replace("/auth?redirect=/settings");
      return;
    }

    setDisplayName(profile.display_name);
    setWebsite(profile.website ?? "");
    setTwitter(profile.twitter ?? "");
    setPlayingGames(profile.playing_games);
    setDevelopingGames(profile.developing_games);
    setAvatarPreview(profile.avatar_url);

    fetch("/api/auth/profile")
      .then((response) => response.json())
      .then((data: { email?: string | null }) => {
        setEmail(data.email ?? null);
      })
      .catch(() => setEmail(null));
  }, [loading, profile, router]);

  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  async function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const localPreview = URL.createObjectURL(file);
    setAvatarPreview((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return localPreview;
    });

    setAvatarUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await fetch("/api/auth/avatar", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as {
        avatar_url?: string;
        error?: string;
      };

      if (!response.ok || !data.avatar_url) {
        throw new Error(data.error ?? "頭像上傳失敗");
      }

      URL.revokeObjectURL(localPreview);
      setAvatarPreview(data.avatar_url);
      await refreshProfile();
      showToast("頭像已更新");
    } catch (uploadError) {
      URL.revokeObjectURL(localPreview);
      setAvatarPreview(profile?.avatar_url ?? null);
      setError(
        uploadError instanceof Error ? uploadError.message : "頭像上傳失敗"
      );
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName.trim(),
          website: website.trim(),
          twitter: twitter.trim(),
          playing_games: playingGames,
          developing_games: developingGames,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "儲存失敗，請稍後再試");
      }

      await refreshProfile();
      showToast("個人資料已成功儲存");
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

  const initials = getInitials(displayName || profile.display_name);

  return (
    <div className="dark min-h-full bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 top-0 size-[480px] rounded-full bg-violet-600/15 blur-[120px]" />
        <div className="absolute -right-32 top-1/3 size-[520px] rounded-full bg-cyan-500/10 blur-[130px]" />
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
        <div className="relative mx-auto flex h-16 max-w-3xl items-center justify-center px-4 sm:px-6">
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "absolute left-4 gap-1.5 text-zinc-400 hover:text-cyan-300 sm:left-6"
            )}
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">返回首頁</span>
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-violet-600">
              <Gamepad2 className="size-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-white">NexusPlay</span>
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
            <h1 className="text-2xl font-bold text-white sm:text-3xl">個人資料設定</h1>
            <p className="mt-2 text-sm text-zinc-500">
              管理你的公開形象，讓討論區與全站都能看見最新的你
            </p>
          </div>

          <div
            className={cn(
              "rounded-2xl border border-white/10 bg-zinc-900/60 p-6 text-center sm:p-8",
              "shadow-xl shadow-black/40 backdrop-blur-sm"
            )}
          >
            {/* Avatar */}
            <div className="mb-8 flex flex-col items-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className={cn(
                  "group relative size-28 overflow-hidden rounded-full",
                  "border-2 border-white/10 transition-all duration-300",
                  "hover:border-cyan-400/70 hover:shadow-lg hover:shadow-cyan-500/25",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40",
                  avatarUploading && "pointer-events-none opacity-70"
                )}
              >
                {avatarPreview ? (
                  <Image
                    src={avatarPreview}
                    alt={displayName}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    unoptimized={avatarPreview.startsWith("blob:")}
                  />
                ) : (
                  <div className="flex size-full items-center justify-center bg-gradient-to-br from-cyan-500/30 to-violet-600/40 text-2xl font-bold text-white">
                    {initials}
                  </div>
                )}

                <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/50 opacity-0 transition-opacity group-hover:opacity-100">
                  {avatarUploading ? (
                    <Loader2 className="size-6 animate-spin text-cyan-300" />
                  ) : (
                    <Camera className="size-6 text-cyan-300" />
                  )}
                </div>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />

              <p className="mt-3 text-center text-xs text-zinc-500">
                點擊頭像上傳 · 支援 PNG / JPG / WebP · 最大 2 MB
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 text-center">
              <div className={fieldClassName}>
                <Label htmlFor="username" className={labelClassName}>
                  使用者名稱
                </Label>
                <div
                  className={cn(
                    inputClassName,
                    "flex items-center justify-center gap-2 text-zinc-400"
                  )}
                >
                  <Mail className="size-4 shrink-0 text-zinc-500" />
                  <span id="username" className="truncate">
                    {email ?? "—"}
                  </span>
                </div>
                <p className="text-center text-xs text-zinc-600">
                  註冊時的電子郵件，無法在此修改
                </p>
              </div>

              <div className={fieldClassName}>
                <Label htmlFor="displayName" className={labelClassName}>
                  顯示名稱
                </Label>
                <Input
                  id="displayName"
                  value={displayName}
                  maxLength={40}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className={inputClassName}
                  placeholder="在討論區與全站顯示的暱稱"
                  disabled={saving}
                />
              </div>

              <div className={fieldClassName}>
                <Label
                  htmlFor="website"
                  className={cn(labelClassName, "flex items-center justify-center gap-2")}
                >
                  <Globe className="size-4 text-cyan-400" />
                  個人網站
                </Label>
                <Input
                  id="website"
                  type="url"
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                  className={inputClassName}
                  placeholder="https://your-site.com"
                  disabled={saving}
                />
              </div>

              <div className={fieldClassName}>
                <Label
                  htmlFor="twitter"
                  className={cn(labelClassName, "flex items-center justify-center gap-2")}
                >
                  <AtSign className="size-4 text-sky-400" />
                  Twitter / X 帳號
                </Label>
                <Input
                  id="twitter"
                  value={twitter}
                  onChange={(event) => setTwitter(event.target.value)}
                  className={inputClassName}
                  placeholder="@username"
                  disabled={saving}
                />
              </div>

              <div
                className={cn(
                  "space-y-4 rounded-xl border border-white/10 bg-zinc-950/40 p-4 text-center"
                )}
              >
                <div>
                  <p className="text-sm font-medium text-white">帳戶類型</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    勾選「開發並上傳遊戲」即可開通創作者後台
                  </p>
                </div>

                <label className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border border-white/8 bg-white/[0.02] p-4 transition-colors hover:border-cyan-400/20">
                  <Checkbox
                    checked={playingGames}
                    onCheckedChange={(checked) => setPlayingGames(checked === true)}
                    disabled={saving}
                    className="border-white/20 data-checked:border-cyan-500 data-checked:bg-cyan-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-zinc-200">玩遊戲</p>
                    <p className="text-xs text-zinc-500">Playing games</p>
                  </div>
                </label>

                <label className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border border-white/8 bg-white/[0.02] p-4 transition-colors hover:border-violet-400/20">
                  <Checkbox
                    checked={developingGames}
                    onCheckedChange={(checked) => setDevelopingGames(checked === true)}
                    disabled={saving}
                    className="border-white/20 data-checked:border-violet-500 data-checked:bg-violet-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-zinc-200">
                      開發並上傳遊戲
                    </p>
                    <p className="text-xs text-zinc-500">
                      Developing and uploading games
                    </p>
                  </div>
                </label>
              </div>

              {error && (
                <p className="rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-center text-sm text-rose-300">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                disabled={saving || !displayName.trim() || avatarUploading}
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
          </div>

          <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-zinc-600">
            <UserRound className="size-3.5" />
            儲存後，導航欄頭像與討論區顯示名稱將即時更新
          </p>
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
              "rounded-full border border-emerald-400/30 bg-zinc-900/95 px-5 py-2.5",
              "text-sm text-emerald-100 shadow-xl shadow-emerald-500/10 backdrop-blur-md"
            )}
          >
            <Check className="size-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
