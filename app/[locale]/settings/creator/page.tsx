"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Coins, Loader2, Mail, Save, Bell } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { PlatformFeeLockBadge } from "@/components/dashboard/platform-fee-lock-badge";
import { AccountSettingsPageHeader } from "@/components/settings/account-settings-layout";
import {
  accountCardClassName,
  accountFieldClassName,
  accountInputClassName,
  accountLabelClassName,
  accountSectionClassName,
  accountSectionCompactClassName,
  accountSectionIntroClassName,
  accountSectionTitleClassName,
  settingsToggleRowClassName,
} from "@/components/settings/account-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useApiError } from "@/hooks/use-api-error";
import {
  FEE_CHANGE_NOTICE_DAYS,
  PLANNED_FUTURE_PLATFORM_FEE_PERCENT,
  PLANNED_PLATFORM_FEE_PERCENT,
} from "@/lib/tip-fee-policy";
import { cn } from "@/lib/utils";

type PlatformFeeGame = {
  id: number;
  title: string;
  tips_enabled: boolean;
  platform_fee_percent: number | null;
};

export default function CreatorSettingsPage() {
  const t = useTranslations("accountSettings");
  const { translateApiError } = useApiError();
  const router = useRouter();
  const { profile, loading, refreshProfile, isCreator } = useAuth();

  const [supportEmail, setSupportEmail] = useState("");
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [feeGames, setFeeGames] = useState<PlatformFeeGame[]>([]);
  const [feeGamesLoading, setFeeGamesLoading] = useState(true);
  const [tipNotifyEmail, setTipNotifyEmail] = useState(true);
  const [tipNotifyInApp, setTipNotifyInApp] = useState(true);
  const [pushNotifyTip, setPushNotifyTip] = useState(true);
  const [tipNotifySaving, setTipNotifySaving] = useState(false);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!profile) {
      router.replace("/auth?redirect=/settings/creator");
      return;
    }
    if (!isCreator) {
      router.replace("/settings");
      return;
    }

    setSupportEmail(profile.support_email ?? "");

    fetch("/api/auth/profile")
      .then((response) => response.json())
      .then((data: { email?: string | null }) => {
        setAccountEmail(data.email ?? null);
      })
      .catch(() => setAccountEmail(null));

    setFeeGamesLoading(true);
    fetch("/api/creator/platform-fees", { credentials: "same-origin" })
      .then((response) => response.json())
      .then((data: { games?: PlatformFeeGame[] }) => {
        setFeeGames(data.games ?? []);
      })
      .catch(() => setFeeGames([]))
      .finally(() => setFeeGamesLoading(false));

    fetch("/api/auth/notification-prefs")
      .then((response) => response.json())
      .then((data: {
        tipNotifyEmail?: boolean;
        tipNotifyInApp?: boolean;
        pushNotifyTip?: boolean;
      }) => {
        if (typeof data.tipNotifyEmail === "boolean") {
          setTipNotifyEmail(data.tipNotifyEmail);
        }
        if (typeof data.tipNotifyInApp === "boolean") {
          setTipNotifyInApp(data.tipNotifyInApp);
        }
        if (typeof data.pushNotifyTip === "boolean") {
          setPushNotifyTip(data.pushNotifyTip);
        }
      })
      .catch(() => undefined);
  }, [loading, profile, isCreator, router]);

  async function handleTipNotifyChange(checked: boolean) {
    setTipNotifyEmail(checked);
    setTipNotifySaving(true);
    try {
      const response = await fetch("/api/auth/notification-prefs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipNotifyEmail: checked }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? t("tipNotifySaveFailed"));
    } catch (saveError) {
      setTipNotifyEmail(!checked);
      showToast(
        saveError instanceof Error
          ? translateApiError(saveError.message) ?? t("tipNotifySaveFailed")
          : t("tipNotifySaveFailed")
      );
    } finally {
      setTipNotifySaving(false);
    }
  }

  async function handleTipNotifyInAppChange(checked: boolean) {
    setTipNotifyInApp(checked);
    setTipNotifySaving(true);
    try {
      const response = await fetch("/api/auth/notification-prefs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipNotifyInApp: checked }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? t("tipNotifySaveFailed"));
    } catch (saveError) {
      setTipNotifyInApp(!checked);
      showToast(
        saveError instanceof Error
          ? translateApiError(saveError.message) ?? t("tipNotifySaveFailed")
          : t("tipNotifySaveFailed")
      );
    } finally {
      setTipNotifySaving(false);
    }
  }

  async function handlePushNotifyTipChange(checked: boolean) {
    setPushNotifyTip(checked);
    setTipNotifySaving(true);
    try {
      const response = await fetch("/api/auth/notification-prefs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pushNotifyTip: checked }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? t("tipNotifySaveFailed"));
    } catch (saveError) {
      setPushNotifyTip(!checked);
      showToast(
        saveError instanceof Error
          ? translateApiError(saveError.message) ?? t("tipNotifySaveFailed")
          : t("tipNotifySaveFailed")
      );
    } finally {
      setTipNotifySaving(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ support_email: supportEmail }),
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

  if (loading || !profile || !isCreator) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <>
      <AccountSettingsPageHeader
        title={t("creatorTitle")}
        description={t("creatorDesc")}
      />

      <div className="space-y-6">
        <div className={accountCardClassName}>
          <section className={accountSectionClassName}>
            <h2 className={accountSectionTitleClassName}>
              <Mail className="size-4 text-cyan-400" />
              {t("supportEmailSection")}
            </h2>
            <p className={accountSectionIntroClassName}>
              {t("supportEmailDesc")}
            </p>

            <div className={accountFieldClassName}>
              <Label htmlFor="support-email" className={accountLabelClassName}>
                {t("supportEmailLabel")}
              </Label>
              <Input
                id="support-email"
                type="email"
                inputMode="email"
                placeholder={t("supportEmailPlaceholder")}
                value={supportEmail}
                onChange={(event) => setSupportEmail(event.target.value)}
                className={accountInputClassName}
              />
            </div>

            {accountEmail && (
              <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3 text-center">
                <p className="text-xs text-zinc-500">{t("useExistingEmail")}</p>
                <button
                  type="button"
                  onClick={() => setSupportEmail(accountEmail)}
                  className="mt-1 text-sm text-cyan-400 hover:text-cyan-300"
                >
                  {accountEmail}
                </button>
              </div>
            )}

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
              {t("saveSupportEmailBtn")}
            </Button>
          </section>
        </div>

        <div className={accountCardClassName}>
          <section className={accountSectionCompactClassName}>
            <h2 className={accountSectionTitleClassName}>
              <Bell className="size-4 text-amber-400" />
              {t("tipNotifySection")}
            </h2>
            <p className={accountSectionIntroClassName}>
              {t("tipNotifyDesc")}
            </p>
            <label htmlFor="tip-notify-email" className={settingsToggleRowClassName}>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-200">
                  {t("tipNotifyLabel")}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
                  {t("tipNotifyHint")}
                </p>
              </div>
              <Checkbox
                id="tip-notify-email"
                checked={tipNotifyEmail}
                disabled={tipNotifySaving}
                onCheckedChange={(value) =>
                  void handleTipNotifyChange(value === true)
                }
                className="shrink-0 border-white/20 data-checked:border-violet-500 data-checked:bg-violet-500"
              />
            </label>
            <label htmlFor="tip-notify-in-app" className={settingsToggleRowClassName}>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-200">
                  {t("tipNotifyInAppLabel")}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
                  {t("tipNotifyInAppHint")}
                </p>
              </div>
              <Checkbox
                id="tip-notify-in-app"
                checked={tipNotifyInApp}
                disabled={tipNotifySaving}
                onCheckedChange={(value) =>
                  void handleTipNotifyInAppChange(value === true)
                }
                className="shrink-0 border-white/20 data-checked:border-violet-500 data-checked:bg-violet-500"
              />
            </label>
            <label htmlFor="tip-notify-push" className={settingsToggleRowClassName}>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-200">
                  {t("tipNotifyPushLabel")}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
                  {t("tipNotifyPushHint")}
                </p>
              </div>
              <Checkbox
                id="tip-notify-push"
                checked={pushNotifyTip}
                disabled={tipNotifySaving}
                onCheckedChange={(value) =>
                  void handlePushNotifyTipChange(value === true)
                }
                className="shrink-0 border-white/20 data-checked:border-violet-500 data-checked:bg-violet-500"
              />
            </label>
          </section>
        </div>

        <div className={accountCardClassName}>
          <section className="space-y-3 text-center">
            <h2 className={accountSectionTitleClassName}>
              <Coins className="size-4 text-emerald-400" />
              {t("platformFeeSection")}
            </h2>
            <p className="text-sm text-zinc-300">
              {t("platformFeeCurrent", { percent: PLANNED_PLATFORM_FEE_PERCENT })}
            </p>
            <p className={accountSectionIntroClassName}>
              {t("platformFeePolicy", {
                futurePercent: PLANNED_FUTURE_PLATFORM_FEE_PERCENT,
                days: FEE_CHANGE_NOTICE_DAYS,
              })}
            </p>
            <p className="text-xs text-zinc-600">
              {t("platformFeePerGameNote")}{" "}
              <Link href="/legal#payments" className="text-violet-400 hover:underline">
                {t("platformFeeLegalLink")}
              </Link>
            </p>

            <div className="space-y-3 border-t border-white/8 pt-4 text-center">
              <p className="text-xs font-medium text-zinc-400">
                {t("platformFeeLockedGamesTitle")}
              </p>
              {feeGamesLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="size-5 animate-spin text-emerald-400" />
                </div>
              ) : feeGames.filter((game) => game.tips_enabled).length === 0 ? (
                <p className="text-xs text-zinc-500">
                  {t("platformFeeLockedGamesEmpty")}
                </p>
              ) : (
                feeGames
                  .filter((game) => game.tips_enabled)
                  .map((game) => (
                    <div key={game.id} className="space-y-2">
                      <Link
                        href={`/dashboard/edit/${game.id}`}
                        className="block truncate text-sm text-zinc-200 hover:text-white"
                      >
                        {game.title}
                      </Link>
                      <PlatformFeeLockBadge
                        lockedPercent={game.platform_fee_percent}
                        tipsEnabled={game.tips_enabled}
                        className="text-left"
                      />
                    </div>
                  ))
              )}
            </div>
          </section>
        </div>
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
