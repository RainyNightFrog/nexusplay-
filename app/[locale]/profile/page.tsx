"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  AtSign,
  Camera,
  Check,
  Globe,
  Loader2,
  Mail,
  Save,
  Settings,
  Shield,
  UserRound,
} from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { AchievementsModal } from "@/components/AchievementsModal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getInitials } from "@/lib/auth";
import { useAuth } from "@/hooks/use-auth";
import { useApiError } from "@/hooks/use-api-error";
import {
  AccountShell,
  accountCardClassName,
  accountFieldClassName,
  accountInputClassName,
  accountLabelClassName,
  accountSectionTitleClassName,
} from "@/components/settings/account-shell";
import { UserBadge } from "@/components/UserBadge";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const t = useTranslations("profile");
  const { translateApiError } = useApiError();
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { profile, loading, refreshProfile, isCreator } = useAuth();
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
  const [achievementsOpen, setAchievementsOpen] = useState(false);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  useEffect(() => {
    if (loading) return;

    if (!profile) {
      router.replace("/auth?redirect=/profile");
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
        throw new Error(data.error ?? t("avatarFailed"));
      }

      URL.revokeObjectURL(localPreview);
      setAvatarPreview(data.avatar_url);
      await refreshProfile();
      showToast(t("avatarUpdated"));
    } catch (uploadError) {
      URL.revokeObjectURL(localPreview);
      setAvatarPreview(profile?.avatar_url ?? null);
      const raw =
        uploadError instanceof Error ? uploadError.message : null;
      setError(translateApiError(raw) ?? raw ?? t("avatarFailed"));
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
        throw new Error(data.error ?? t("saveFailed"));
      }

      await refreshProfile();
      showToast(t("profileUpdated"));
    } catch (submitError) {
      const raw =
        submitError instanceof Error ? submitError.message : null;
      setError(translateApiError(raw) ?? raw ?? t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  if (loading || !profile) {
    return (
      <div className="dark flex min-h-full items-center justify-center">
        <Loader2 className="size-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  const initials = getInitials(displayName || profile.display_name);

  return (
    <AccountShell title={t("title")} description={t("description")}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className={accountCardClassName}>
          <div className="mb-8 flex flex-col items-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className={cn(
                "group relative size-28 overflow-hidden rounded-full",
                "border-2 border-white/10 transition-all duration-300",
                "hover:border-cyan-400/70 hover:shadow-lg hover:shadow-cyan-500/25",
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

            <p className="mt-3 text-xs text-zinc-500">{t("avatarHint")}</p>

            <div className="mt-4 flex flex-col items-center gap-2 text-center">
              <UserBadge
                username={displayName || profile.display_name}
                title={profile.equipped_title}
                usernameClassName="text-lg font-semibold text-zinc-100"
                titleClassName="text-xs"
              />
              <p className="text-xs text-zinc-500">
                {profile.equipped_title
                  ? t("equippedTitleHint")
                  : t("noEquippedTitle")}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAchievementsOpen(true)}
                className="border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10"
              >
                {t("changeTitle")}
              </Button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <section className="space-y-6">
              <h2 className={accountSectionTitleClassName}>
                <UserRound className="size-4 text-cyan-400" />
                {t("publicProfile")}
              </h2>

              <div className={accountFieldClassName}>
                <Label htmlFor="displayName" className={accountLabelClassName}>
                  {t("displayName")}
                </Label>
                <Input
                  id="displayName"
                  value={displayName}
                  maxLength={40}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className={accountInputClassName}
                  placeholder={t("displayNamePlaceholder")}
                  disabled={saving}
                />
              </div>

              <div className={accountFieldClassName}>
                <Label
                  htmlFor="website"
                  className={cn(accountLabelClassName, "flex items-center justify-center gap-2")}
                >
                  <Globe className="size-4 text-cyan-400" />
                  {t("website")}
                </Label>
                <Input
                  id="website"
                  type="url"
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                  className={accountInputClassName}
                  placeholder="https://your-site.com"
                  disabled={saving}
                />
              </div>

              <div className={accountFieldClassName}>
                <Label
                  htmlFor="twitter"
                  className={cn(accountLabelClassName, "flex items-center justify-center gap-2")}
                >
                  <AtSign className="size-4 text-sky-400" />
                  {t("twitter")}
                </Label>
                <Input
                  id="twitter"
                  value={twitter}
                  onChange={(event) => setTwitter(event.target.value)}
                  className={accountInputClassName}
                  placeholder="@username"
                  disabled={saving}
                />
              </div>
            </section>

            <div className="border-t border-white/8" />

            <section className="space-y-6">
              <h2 className={accountSectionTitleClassName}>
                <Shield className="size-4 text-violet-400" />
                {t("accountInfo")}
              </h2>

              <div className={accountFieldClassName}>
                <Label htmlFor="email" className={accountLabelClassName}>
                  {t("email")}
                </Label>
                <div
                  className={cn(
                    accountInputClassName,
                    "flex items-center justify-center gap-2 text-zinc-400"
                  )}
                >
                  <Mail className="size-4 shrink-0 text-zinc-500" />
                  <span id="email" className="truncate">
                    {email ?? "—"}
                  </span>
                </div>
                <p className="text-xs text-zinc-600">{t("emailHint")}</p>
              </div>

              <div
                className={cn(
                  "space-y-4 rounded-xl border border-white/10 bg-zinc-950/40 p-4 text-center"
                )}
              >
                <p className="text-xs text-zinc-500">
                  {t("currentRole")}
                  <span className="ml-1 font-medium text-violet-300">
                    {isCreator ? tNav("roleCreator") : tNav("rolePlayer")}
                  </span>
                </p>

                <label className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border border-white/8 bg-white/[0.02] p-4 transition-colors hover:border-cyan-400/20">
                  <Checkbox
                    checked={playingGames}
                    onCheckedChange={(checked) => setPlayingGames(checked === true)}
                    disabled={saving}
                    className="border-white/20 data-checked:border-cyan-500 data-checked:bg-cyan-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{t("playingGames")}</p>
                    <p className="text-xs text-zinc-500">{t("playingGamesDesc")}</p>
                  </div>
                </label>

                <label className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border border-white/8 bg-white/[0.02] p-4 transition-colors hover:border-violet-400/20">
                  <Checkbox
                    checked={developingGames}
                    onCheckedChange={(checked) =>
                      setDevelopingGames(checked === true)
                    }
                    disabled={saving}
                    className="border-white/20 data-checked:border-violet-500 data-checked:bg-violet-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{t("developingGames")}</p>
                    <p className="text-xs text-zinc-500">{t("developingGamesDesc")}</p>
                  </div>
                </label>
              </div>
            </section>

            {error && (
              <p className="rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
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
              {saving ? tCommon("saving") : t("saveProfile")}
            </Button>
          </form>
        </div>

        <p className="mt-6 flex items-center justify-center gap-2 text-xs text-zinc-600">
          <Settings className="size-3.5" />
          {t("settingsHint")}
          <Link href="/settings" className="text-violet-400 hover:text-violet-300">
            {tNav("settings")}
          </Link>
        </p>
      </motion.div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={cn(
              "fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2",
              "rounded-full border border-emerald-400/30 bg-zinc-900/95 px-5 py-2.5",
              "text-sm text-emerald-100 shadow-xl backdrop-blur-md"
            )}
          >
            <Check className="size-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <AchievementsModal
        open={achievementsOpen}
        onOpenChange={(open) => {
          setAchievementsOpen(open);
          if (!open) void refreshProfile();
        }}
      />
    </AccountShell>
  );
}
