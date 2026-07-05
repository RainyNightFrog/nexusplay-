"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Check,
  Gamepad2,
  Globe,
  Loader2,
  Monitor,
  Moon,
  Palette,
  RotateCcw,
  Sparkles,
  Sun,
  Zap,
} from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, type AppLocale } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useAppSettings } from "@/components/settings/app-settings-provider";
import type { AppTheme } from "@/lib/app-settings";
import {
  AccountSettingsPageHeader,
} from "@/components/settings/account-settings-layout";
import {
  accountCardClassName,
  accountFieldClassName,
  accountLabelClassName,
  accountSectionTitleClassName,
  settingsToggleRowClassName,
} from "@/components/settings/account-shell";
import { cn } from "@/lib/utils";
import { PushNotificationSettings } from "@/components/notifications/push-notification-settings";
import { PushCategorySettings } from "@/components/notifications/push-category-settings";
import { ForumDigestPreviewPanel } from "@/components/feeds/forum-digest-preview-panel";
import { ForumDigestHistoryPanel } from "@/components/feeds/forum-digest-history-panel";

function SettingsToggle({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label htmlFor={id} className={settingsToggleRowClassName}>
      <div className="min-w-0 flex-1 text-left">
        <p className="text-sm font-medium text-zinc-200">{label}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">{description}</p>
      </div>
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        disabled={disabled}
        className="shrink-0 border-white/20 data-checked:border-violet-500 data-checked:bg-violet-500"
      />
    </label>
  );
}

export default function SettingsPage() {
  const t = useTranslations("settings");
  const tLang = useTranslations("language");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const { profile, loading } = useAuth();
  const { settings, ready, updateSettings, resetSettings } = useAppSettings();
  const [toast, setToast] = useState<string | null>(null);
  const [forumNotifySaving, setForumNotifySaving] = useState(false);
  const [forumReplyInApp, setForumReplyInApp] = useState(true);
  const [forumInAppSaving, setForumInAppSaving] = useState(false);
  const [followNewGameNotify, setFollowNewGameNotify] = useState(true);
  const [followNewGameInApp, setFollowNewGameInApp] = useState(true);
  const [followGameNotifySaving, setFollowGameNotifySaving] = useState(false);
  const [followGameInAppSaving, setFollowGameInAppSaving] = useState(false);
  const [pushNotifyEnabled, setPushNotifyEnabled] = useState(false);
  const [pushNotifyForum, setPushNotifyForum] = useState(true);
  const [pushNotifyFollow, setPushNotifyFollow] = useState(true);
  const [pushCategorySaving, setPushCategorySaving] = useState(false);
  const [forumDigestSaving, setForumDigestSaving] = useState(false);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!profile) {
      router.replace("/auth?redirect=/settings");
    }
  }, [loading, profile, router]);

  useEffect(() => {
    if (!profile) return;
    fetch("/api/auth/notification-prefs")
      .then((response) => response.json())
      .then((data: {
        forumReplyNotifyEmail?: boolean;
        forumReplyNotifyInApp?: boolean;
        followNewGameEmail?: boolean;
        followNewGameInApp?: boolean;
        pushNotifyEnabled?: boolean;
      pushNotifyForum?: boolean;
      pushNotifyFollow?: boolean;
      forumEmailDigest?: boolean;
    }) => {
        if (typeof data.forumReplyNotifyEmail === "boolean") {
          updateSettings({ forumReplyNotify: data.forumReplyNotifyEmail });
        }
        if (typeof data.forumReplyNotifyInApp === "boolean") {
          setForumReplyInApp(data.forumReplyNotifyInApp);
        }
        if (typeof data.followNewGameEmail === "boolean") {
          setFollowNewGameNotify(data.followNewGameEmail);
        }
        if (typeof data.followNewGameInApp === "boolean") {
          setFollowNewGameInApp(data.followNewGameInApp);
        }
        if (typeof data.pushNotifyEnabled === "boolean") {
          setPushNotifyEnabled(data.pushNotifyEnabled);
        }
        if (typeof data.pushNotifyForum === "boolean") {
          setPushNotifyForum(data.pushNotifyForum);
        }
        if (typeof data.pushNotifyFollow === "boolean") {
          setPushNotifyFollow(data.pushNotifyFollow);
        }
        if (typeof data.forumEmailDigest === "boolean") {
          updateSettings({ forumEmailDigest: data.forumEmailDigest });
        }
      })
      .catch(() => undefined);
  }, [profile?.id, updateSettings]);

  async function handleForumReplyNotifyChange(checked: boolean) {
    updateSettings({ forumReplyNotify: checked });
    setForumNotifySaving(true);
    try {
      await fetch("/api/auth/notification-prefs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forumReplyNotifyEmail: checked }),
      });
    } finally {
      setForumNotifySaving(false);
    }
  }

  async function handleForumReplyInAppChange(checked: boolean) {
    setForumReplyInApp(checked);
    setForumInAppSaving(true);
    try {
      await fetch("/api/auth/notification-prefs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forumReplyNotifyInApp: checked }),
      });
    } finally {
      setForumInAppSaving(false);
    }
  }

  async function handleFollowNewGameNotifyChange(checked: boolean) {
    setFollowNewGameNotify(checked);
    setFollowGameNotifySaving(true);
    try {
      await fetch("/api/auth/notification-prefs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followNewGameEmail: checked }),
      });
    } finally {
      setFollowGameNotifySaving(false);
    }
  }

  async function handleFollowNewGameInAppChange(checked: boolean) {
    setFollowNewGameInApp(checked);
    setFollowGameInAppSaving(true);
    try {
      await fetch("/api/auth/notification-prefs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followNewGameInApp: checked }),
      });
    } finally {
      setFollowGameInAppSaving(false);
    }
  }

  async function patchPushCategory(
    patch: { pushNotifyForum?: boolean; pushNotifyFollow?: boolean },
    rollback: () => void
  ) {
    setPushCategorySaving(true);
    try {
      const response = await fetch("/api/auth/notification-prefs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!response.ok) rollback();
    } catch {
      rollback();
    } finally {
      setPushCategorySaving(false);
    }
  }

  async function handlePushNotifyForumChange(checked: boolean) {
    const previous = pushNotifyForum;
    setPushNotifyForum(checked);
    await patchPushCategory({ pushNotifyForum: checked }, () =>
      setPushNotifyForum(previous)
    );
  }

  async function handleForumDigestChange(checked: boolean) {
    updateSettings({ forumEmailDigest: checked });
    setForumDigestSaving(true);
    try {
      await fetch("/api/auth/notification-prefs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forumEmailDigest: checked }),
      });
    } finally {
      setForumDigestSaving(false);
    }
  }

  async function handlePushNotifyFollowChange(checked: boolean) {
    const previous = pushNotifyFollow;
    setPushNotifyFollow(checked);
    await patchPushCategory({ pushNotifyFollow: checked }, () =>
      setPushNotifyFollow(previous)
    );
  }

  function handleReset() {
    resetSettings();
    showToast(t("resetDone"));
  }

  function handleLocaleChange(nextLocale: AppLocale) {
    if (nextLocale === locale) return;
    void fetch("/api/auth/locale", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: nextLocale }),
    });
    router.replace(pathname, { locale: nextLocale });
  }

  if (loading || !profile || !ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <>
      <AccountSettingsPageHeader title={t("title")} description={t("description")} />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-6"
      >
        <div className={accountCardClassName}>
          <section className="space-y-5">
            <h2 className={accountSectionTitleClassName}>
              <Palette className="size-4 text-violet-400" />
              {t("appearance")}
            </h2>

            <div className={accountFieldClassName}>
              <Label className={accountLabelClassName}>{t("theme")}</Label>
              <Select
                value={settings.theme}
                onValueChange={(value) => {
                  if (value) updateSettings({ theme: value as AppTheme });
                }}
              >
                <SelectTrigger className="mx-auto w-full max-w-xs border-white/10 bg-white/5 text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-zinc-900 text-zinc-100">
                  <SelectItem value="dark">
                    <span className="flex items-center gap-2">
                      <Moon className="size-3.5" /> {t("themeDark")}
                    </span>
                  </SelectItem>
                  <SelectItem value="light">
                    <span className="flex items-center gap-2">
                      <Sun className="size-3.5" /> {t("themeLight")}
                    </span>
                  </SelectItem>
                  <SelectItem value="system">
                    <span className="flex items-center gap-2">
                      <Monitor className="size-3.5" /> {t("themeSystem")}
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <SettingsToggle
              id="compactLayout"
              label={t("compactLayout")}
              description={t("compactLayoutDesc")}
              checked={settings.compactLayout}
              onCheckedChange={(checked) => updateSettings({ compactLayout: checked })}
            />
          </section>
        </div>

        <div className={accountCardClassName}>
          <section className="space-y-5">
            <h2 className={accountSectionTitleClassName}>
              <Globe className="size-4 text-cyan-400" />
              {t("languageSection")}
            </h2>

            <div className={accountFieldClassName}>
              <Label className={accountLabelClassName}>{t("interfaceLanguage")}</Label>
              <Select
                value={locale}
                onValueChange={(value) =>
                  value && handleLocaleChange(value as AppLocale)
                }
              >
                <SelectTrigger className="mx-auto w-full max-w-xs border-white/10 bg-white/5 text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="nexus-lang-scroll max-h-[min(18rem,var(--available-height))] border-white/10 bg-zinc-900 text-zinc-100">
                  {locales.map((code) => (
                    <SelectItem key={code} value={code}>
                      {tLang(code)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-zinc-600">{t("languageNote")}</p>
            </div>
          </section>
        </div>

        <div className={accountCardClassName}>
          <section className="space-y-4">
            <h2 className={accountSectionTitleClassName}>
              <Bell className="size-4 text-amber-400" />
              {t("notifications")}
            </h2>

            <SettingsToggle
              id="forumReplyNotify"
              label={t("forumReplyEmail")}
              description={t("forumReplyEmailDesc")}
              checked={settings.forumReplyNotify}
              disabled={forumNotifySaving}
              onCheckedChange={(checked) => void handleForumReplyNotifyChange(checked)}
            />

            <SettingsToggle
              id="forumReplyInApp"
              label={t("forumReplyInApp")}
              description={t("forumReplyInAppDesc")}
              checked={forumReplyInApp}
              disabled={forumInAppSaving}
              onCheckedChange={(checked) => void handleForumReplyInAppChange(checked)}
            />

            <SettingsToggle
              id="forumEmailDigest"
              label={t("forumDigest")}
              description={t("forumDigestDesc")}
              checked={settings.forumEmailDigest}
              disabled={forumDigestSaving}
              onCheckedChange={(checked) => void handleForumDigestChange(checked)}
            />

            <ForumDigestPreviewPanel enabled={settings.forumEmailDigest} />
            <ForumDigestHistoryPanel enabled={settings.forumEmailDigest} />

            <SettingsToggle
              id="followNewGameNotify"
              label={t("followNewGameEmail")}
              description={t("followNewGameEmailDesc")}
              checked={followNewGameNotify}
              disabled={followGameNotifySaving}
              onCheckedChange={(checked) =>
                void handleFollowNewGameNotifyChange(checked)
              }
            />

            <SettingsToggle
              id="followNewGameInApp"
              label={t("followNewGameInApp")}
              description={t("followNewGameInAppDesc")}
              checked={followNewGameInApp}
              disabled={followGameInAppSaving}
              onCheckedChange={(checked) =>
                void handleFollowNewGameInAppChange(checked)
              }
            />

            <PushNotificationSettings
              enabled={pushNotifyEnabled}
              onEnabledChange={setPushNotifyEnabled}
            />

            {pushNotifyEnabled ? (
              <PushCategorySettings
                pushNotifyForum={pushNotifyForum}
                pushNotifyFollow={pushNotifyFollow}
                onForumChange={(checked) => void handlePushNotifyForumChange(checked)}
                onFollowChange={(checked) => void handlePushNotifyFollowChange(checked)}
                disabled={pushCategorySaving}
              />
            ) : null}
          </section>
        </div>

        <div className={accountCardClassName}>
          <section className="space-y-4">
            <h2 className={accountSectionTitleClassName}>
              <Gamepad2 className="size-4 text-emerald-400" />
              {t("gameExperience")}
            </h2>

            <SettingsToggle
              id="gameAutoplay"
              label={t("gameAutoplay")}
              description={t("gameAutoplayDesc")}
              checked={settings.gameAutoplay}
              onCheckedChange={(checked) => updateSettings({ gameAutoplay: checked })}
            />

            <SettingsToggle
              id="showMatureContent"
              label={t("matureContent")}
              description={t("matureContentDesc")}
              checked={settings.showMatureContent}
              onCheckedChange={(checked) =>
                updateSettings({ showMatureContent: checked })
              }
            />
          </section>
        </div>

        <div className={accountCardClassName}>
          <section className="space-y-4">
            <h2 className={accountSectionTitleClassName}>
              <Zap className="size-4 text-sky-400" />
              {t("accessibility")}
            </h2>

            <SettingsToggle
              id="reduceMotion"
              label={t("reduceMotion")}
              description={t("reduceMotionDesc")}
              checked={settings.reduceMotion}
              onCheckedChange={(checked) => updateSettings({ reduceMotion: checked })}
            />
          </section>
        </div>

        <div className={cn(accountCardClassName, "border-dashed")}>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="text-center sm:text-left">
              <p className="flex items-center justify-center gap-2 text-sm font-medium text-white sm:justify-start">
                <Sparkles className="size-4 text-violet-400" />
                {t("resetTitle")}
              </p>
              <p className="mt-1 text-xs text-zinc-500">{t("resetDesc")}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              className="gap-2 border-white/10 bg-white/5 text-zinc-200 hover:border-rose-400/30 hover:text-rose-200"
            >
              <RotateCcw className="size-4" />
              {t("resetBtn")}
            </Button>
          </div>
        </div>
      </motion.div>

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
