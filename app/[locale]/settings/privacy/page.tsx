"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Eye, Loader2, Save, Trophy } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { AccountSettingsPageHeader } from "@/components/settings/account-settings-layout";
import {
  accountCardClassName,
  accountSectionCompactClassName,
  accountSectionTitleClassName,
  settingsToggleRowClassName,
} from "@/components/settings/account-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/use-auth";
import { useApiError } from "@/hooks/use-api-error";
import { cn } from "@/lib/utils";

export default function PrivacySettingsPage() {
  const t = useTranslations("accountSettings");
  const { translateApiError } = useApiError();
  const router = useRouter();
  const { profile, loading, refreshProfile } = useAuth();

  const [profilePublic, setProfilePublic] = useState(true);
  const [showInLeaderboard, setShowInLeaderboard] = useState(true);
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
      router.replace("/auth?redirect=/settings/privacy");
      return;
    }
    setProfilePublic(profile.profile_public);
    setShowInLeaderboard(profile.show_in_leaderboard);
  }, [loading, profile, router]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile_public: profilePublic,
          show_in_leaderboard: showInLeaderboard,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? t("saveFailed"));
      }

      await refreshProfile();
      showToast(t("saved"));
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? translateApiError(saveError.message)
          : t("saveFailed")
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading || !profile) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <>
      <AccountSettingsPageHeader
        title={t("privacyTitle")}
        description={t("privacyDesc")}
      />

      <div className={accountCardClassName}>
        <section className={accountSectionCompactClassName}>
          <h2 className={accountSectionTitleClassName}>
            <Eye className="size-4 text-cyan-400" />
            {t("privacySection")}
          </h2>

          <label htmlFor="profile-public" className={settingsToggleRowClassName}>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-zinc-200">
                {t("profilePublicLabel")}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
                {t("profilePublicDesc")}
              </p>
            </div>
            <Checkbox
              id="profile-public"
              checked={profilePublic}
              onCheckedChange={(value) => setProfilePublic(value === true)}
              className="shrink-0 border-white/20 data-checked:border-cyan-500 data-checked:bg-cyan-500"
            />
          </label>

          <label htmlFor="show-leaderboard" className={settingsToggleRowClassName}>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-sm font-medium text-zinc-200">
                <Trophy className="size-4 text-amber-400" />
                {t("leaderboardVisibleLabel")}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
                {t("leaderboardVisibleDesc")}
              </p>
            </div>
            <Checkbox
              id="show-leaderboard"
              checked={showInLeaderboard}
              onCheckedChange={(value) => setShowInLeaderboard(value === true)}
              className="shrink-0 border-white/20 data-checked:border-amber-500 data-checked:bg-amber-500"
            />
          </label>

          {error && <p className="text-center text-sm text-rose-400">{error}</p>}

          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full gap-2 bg-violet-600 hover:bg-violet-500"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {t("saveBtn")}
          </Button>
        </section>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={cn(
              "fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2",
              "rounded-full border border-violet-400/30 bg-zinc-900/95 px-5 py-2.5",
              "text-sm text-violet-100 shadow-xl backdrop-blur-md"
            )}
          >
            <Check className="size-4 text-violet-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
