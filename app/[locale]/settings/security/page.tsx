"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { Check, KeyRound, Loader2, Mail } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { AccountSettingsPageHeader } from "@/components/settings/account-settings-layout";
import {
  accountCardClassName,
  accountFieldClassName,
  accountInputClassName,
  accountLabelClassName,
  accountSectionTitleClassName,
} from "@/components/settings/account-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useApiError } from "@/hooks/use-api-error";
import { TwoFactorPanel } from "@/components/settings/two-factor-panel";
import { cn } from "@/lib/utils";

export default function SecuritySettingsPage() {
  const t = useTranslations("accountSettings");
  const { translateApiError } = useApiError();
  const router = useRouter();
  const { profile, loading } = useAuth();

  const [hasPassword, setHasPassword] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!profile) {
      router.replace("/auth?redirect=/settings/security");
      return;
    }

    fetch("/api/auth/profile")
      .then((response) => response.json())
      .then((data: { hasPassword?: boolean }) => {
        setHasPassword(data.hasPassword !== false);
      })
      .catch(() => setHasPassword(true));
  }, [loading, profile, router]);

  async function handleChangePassword(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? t("passwordChangeFailed"));
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToast(t("passwordChanged"));
    } catch (changeError) {
      setError(
        changeError instanceof Error
          ? translateApiError(changeError.message)
          : t("passwordChangeFailed")
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleResetEmail() {
    setError(null);
    setResetting(true);
    try {
      const response = await fetch("/api/auth/password", { method: "PUT" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? t("resetEmailFailed"));
      }
      showToast(t("resetEmailSent"));
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? translateApiError(resetError.message)
          : t("resetEmailFailed")
      );
    } finally {
      setResetting(false);
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
        title={t("securityTitle")}
        description={t("securityDesc")}
      />

      <div className={accountCardClassName}>
        <section className="space-y-5 text-left">
          <h2 className={accountSectionTitleClassName}>
            <KeyRound className="size-4 text-amber-400" />
            {t("passwordSection")}
          </h2>

          {!hasPassword ? (
            <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-4 text-sm text-zinc-300">
              <p>{t("oauthPasswordHint")}</p>
              <Button
                type="button"
                variant="outline"
                onClick={handleResetEmail}
                disabled={resetting}
                className="mt-4 gap-2 border-white/10 bg-white/5"
              >
                {resetting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Mail className="size-4" />
                )}
                {t("sendResetEmail")}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className={accountFieldClassName}>
                <Label htmlFor="current-password" className={accountLabelClassName}>
                  {t("currentPassword")}
                </Label>
                <Input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className={cn(accountInputClassName, "text-left")}
                  required
                />
              </div>

              <div className={accountFieldClassName}>
                <Label htmlFor="new-password" className={accountLabelClassName}>
                  {t("newPassword")}
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className={cn(accountInputClassName, "text-left")}
                  minLength={8}
                  required
                />
              </div>

              <div className={accountFieldClassName}>
                <Label htmlFor="confirm-password" className={accountLabelClassName}>
                  {t("confirmPassword")}
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className={cn(accountInputClassName, "text-left")}
                  minLength={8}
                  required
                />
              </div>

              {error && (
                <p className="text-center text-sm text-rose-400">{error}</p>
              )}

              <Button
                type="submit"
                disabled={saving}
                className="w-full gap-2 bg-violet-600 hover:bg-violet-500"
              >
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <KeyRound className="size-4" />
                )}
                {t("changePasswordBtn")}
              </Button>
            </form>
          )}

          {hasPassword && (
            <div className="border-t border-white/5 pt-4">
              <p className="text-xs text-zinc-500">{t("forgotPasswordHint")}</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetEmail}
                disabled={resetting}
                className="mt-2 gap-2 text-zinc-400 hover:text-cyan-300"
              >
                {resetting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Mail className="size-4" />
                )}
                {t("sendResetEmail")}
              </Button>
            </div>
          )}
        </section>
      </div>

      <div className={cn(accountCardClassName, "mt-6")}>
        <TwoFactorPanel />
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
