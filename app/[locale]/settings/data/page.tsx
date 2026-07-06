"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  Download,
  Loader2,
  Trash2,
} from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { AccountSettingsPageHeader } from "@/components/settings/account-settings-layout";
import {
  accountCardClassName,
  accountFieldClassName,
  accountInputClassName,
  accountLabelClassName,
  accountSectionCompactClassName,
  accountSectionIntroClassName,
  accountSectionTitleClassName,
} from "@/components/settings/account-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useApiError } from "@/hooks/use-api-error";
import { cn } from "@/lib/utils";

export default function DataSettingsPage() {
  const t = useTranslations("accountSettings");
  const { translateApiError } = useApiError();
  const router = useRouter();
  const { profile, loading, signOut } = useAuth();

  const [confirmation, setConfirmation] = useState("");
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!profile) {
      router.replace("/auth?redirect=/settings/data");
    }
  }, [loading, profile, router]);

  async function handleExport() {
    setExporting(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/export-data");
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? t("exportFailed"));
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `nexusplay-export-${profile?.id.slice(0, 8) ?? "data"}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      showToast(t("exportDone"));
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? translateApiError(exportError.message)
          : t("exportFailed")
      );
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteAccount() {
    if (confirmation !== "DELETE") {
      setError(t("deleteConfirmRequired"));
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "DELETE" }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? t("deleteFailed"));
      }

      await signOut();
      router.replace("/");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? translateApiError(deleteError.message)
          : t("deleteFailed")
      );
    } finally {
      setDeleting(false);
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
      <AccountSettingsPageHeader title={t("dataTitle")} description={t("dataDesc")} />

      <div className="space-y-6">
        <div className={accountCardClassName}>
          <section className={accountSectionCompactClassName}>
            <h2 className={accountSectionTitleClassName}>
              <Download className="size-4 text-cyan-400" />
              {t("exportSection")}
            </h2>
            <p className={accountSectionIntroClassName}>{t("exportDesc")}</p>
            <Button
              type="button"
              variant="outline"
              onClick={handleExport}
              disabled={exporting}
              className="gap-2 border-white/10 bg-white/5"
            >
              {exporting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              {t("exportBtn")}
            </Button>
          </section>
        </div>

        <div
          className={cn(
            accountCardClassName,
            "border-rose-400/20 bg-rose-500/[0.03]"
          )}
        >
          <section className={accountSectionCompactClassName}>
            <h2 className={accountSectionTitleClassName}>
              <Trash2 className="size-4 text-rose-400" />
              {t("deleteSection")}
            </h2>
            <p className={accountSectionIntroClassName}>{t("deleteDesc")}</p>

            <div className="flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-500/5 p-3 text-left">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-400" />
              <p className="text-xs leading-relaxed text-amber-200/90">
                {t("deleteWarning")}
              </p>
            </div>

            <div className={accountFieldClassName}>
              <Label htmlFor="delete-confirm" className={accountLabelClassName}>
                {t("deleteConfirmLabel")}
              </Label>
              <Input
                id="delete-confirm"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder="DELETE"
                className={cn(accountInputClassName, "font-mono")}
              />
            </div>

            {error && <p className="text-center text-sm text-rose-400">{error}</p>}

            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleting || confirmation !== "DELETE"}
              className="gap-2"
            >
              {deleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              {t("deleteBtn")}
            </Button>
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
