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
  UserRound,
  Zap,
} from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
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
  AccountShell,
  accountCardClassName,
  accountFieldClassName,
  accountLabelClassName,
  accountSectionTitleClassName,
  settingsToggleRowClassName,
} from "@/components/settings/account-shell";
import { cn } from "@/lib/utils";

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
  const tNav = useTranslations("nav");
  const tLang = useTranslations("language");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const { profile, loading } = useAuth();
  const { settings, ready, updateSettings, resetSettings } = useAppSettings();
  const [toast, setToast] = useState<string | null>(null);

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

  function handleReset() {
    resetSettings();
    showToast(t("resetDone"));
  }

  function handleLocaleChange(nextLocale: AppLocale) {
    if (nextLocale === locale) return;
    router.replace(pathname, { locale: nextLocale });
  }

  if (loading || !profile || !ready) {
    return (
      <div className="dark flex min-h-full items-center justify-center">
        <Loader2 className="size-8 animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <AccountShell title={t("title")} description={t("description")}>
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
              <Select value={locale} onValueChange={(value) => value && handleLocaleChange(value as AppLocale)}>
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
              label={t("forumReply")}
              description={t("forumReplyDesc")}
              checked={settings.forumReplyNotify}
              onCheckedChange={(checked) =>
                updateSettings({ forumReplyNotify: checked })
              }
            />

            <SettingsToggle
              id="forumEmailDigest"
              label={t("forumDigest")}
              description={t("forumDigestDesc")}
              checked={settings.forumEmailDigest}
              onCheckedChange={(checked) =>
                updateSettings({ forumEmailDigest: checked })
              }
            />
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

        <p className="flex items-center justify-center gap-2 text-xs text-zinc-600">
          <UserRound className="size-3.5" />
          {t("profileHint")}
          <Link href="/profile" className="text-cyan-400 hover:text-cyan-300">
            {tNav("profile")}
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
              "rounded-full border border-violet-400/30 bg-zinc-900/95 px-5 py-2.5",
              "text-sm text-violet-100 shadow-xl backdrop-blur-md"
            )}
          >
            <Check className="size-4 text-violet-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </AccountShell>
  );
}
