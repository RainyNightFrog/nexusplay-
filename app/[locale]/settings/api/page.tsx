"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Copy,
  KeyRound,
  Loader2,
  Plus,
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
  settingsInlineActionRowClassName,
  settingsListRowClassName,
} from "@/components/settings/account-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useApiError } from "@/hooks/use-api-error";
import type { ApiKeyRecord } from "@/lib/api-key-service";
import { cn } from "@/lib/utils";

type CreatedKey = {
  id: string;
  name: string;
  secret: string;
  key_prefix: string;
  created_at: string;
};

export default function ApiKeysSettingsPage() {
  const t = useTranslations("accountSettings");
  const { translateApiError } = useApiError();
  const router = useRouter();
  const { profile, loading, isCreator } = useAuth();

  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [fetching, setFetching] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<CreatedKey | null>(null);
  const [copied, setCopied] = useState(false);

  const loadKeys = useCallback(async () => {
    setFetching(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/api-keys", {
        credentials: "same-origin",
      });
      const data = (await response.json()) as {
        keys?: ApiKeyRecord[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? t("apiKeysLoadFailed"));
      setKeys(data.keys ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? translateApiError(loadError.message)
          : t("apiKeysLoadFailed")
      );
    } finally {
      setFetching(false);
    }
  }, [t, translateApiError]);

  useEffect(() => {
    if (loading) return;
    if (!profile) {
      router.replace("/auth?redirect=/settings/api");
      return;
    }
    if (!isCreator) {
      router.replace("/settings");
      return;
    }
    void loadKeys();
  }, [loading, profile, isCreator, router, loadKeys]);

  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ name }),
      });
      const data = (await response.json()) as {
        key?: CreatedKey;
        error?: string;
      };
      if (!response.ok || !data.key) {
        throw new Error(data.error ?? t("apiKeysCreateFailed"));
      }
      setCreatedKey(data.key);
      setName("");
      await loadKeys();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? translateApiError(createError.message)
          : t("apiKeysCreateFailed")
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string) {
    setError(null);
    try {
      const response = await fetch(
        `/api/auth/api-keys?id=${encodeURIComponent(id)}`,
        { method: "DELETE", credentials: "same-origin" }
      );
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? t("apiKeysRevokeFailed"));
      setKeys((current) => current.filter((key) => key.id !== id));
    } catch (revokeError) {
      setError(
        revokeError instanceof Error
          ? translateApiError(revokeError.message)
          : t("apiKeysRevokeFailed")
      );
    }
  }

  function copySecret(secret: string) {
    void navigator.clipboard.writeText(secret);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
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
        title={t("apiKeysTitle")}
        description={t("apiKeysDesc")}
      />

      <div className="space-y-6">
        <div className={accountCardClassName}>
          <section className={accountSectionCompactClassName}>
            <h2 className={accountSectionTitleClassName}>
              <KeyRound className="size-4 text-amber-400" />
              {t("apiKeysSection")}
            </h2>
            <p className={accountSectionIntroClassName}>
              {t("apiKeysSectionDesc")}
            </p>

            <div className={accountFieldClassName}>
              <Label htmlFor="api-key-name" className={accountLabelClassName}>
                {t("apiKeysNameLabel")}
              </Label>
              <div className={settingsInlineActionRowClassName}>
                <Input
                  id="api-key-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={t("apiKeysNamePlaceholder")}
                  className={cn(accountInputClassName, "sm:flex-1")}
                />
                <Button
                  type="button"
                  onClick={handleCreate}
                  disabled={creating || !name.trim()}
                  className="gap-2 bg-amber-600 hover:bg-amber-500"
                >
                  {creating ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  {t("apiKeysCreateBtn")}
                </Button>
              </div>
            </div>

            {createdKey && (
              <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 p-4">
                <p className="text-sm font-medium text-amber-100">
                  {t("apiKeysCreatedTitle")}
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  {t("apiKeysCreatedDesc")}
                </p>
                <code className="mt-3 block break-all rounded-lg bg-black/30 px-3 py-2 text-xs text-amber-200">
                  {createdKey.secret}
                </code>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => copySecret(createdKey.secret)}
                  className="mt-3 gap-1.5 text-amber-200"
                >
                  <Copy className="size-3.5" />
                  {copied ? t("apiKeysCopied") : t("apiKeysCopySecret")}
                </Button>
              </div>
            )}

            {error && <p className="text-center text-sm text-rose-400">{error}</p>}

            {fetching ? (
              <div className="flex justify-center py-8">
                <Loader2 className="size-6 animate-spin text-amber-400" />
              </div>
            ) : keys.length === 0 ? (
              <p className="py-6 text-center text-sm text-zinc-500">
                {t("apiKeysEmpty")}
              </p>
            ) : (
              <div className="space-y-2">
                {keys.map((key) => (
                  <div
                    key={key.id}
                    className={settingsListRowClassName}
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{key.name}</p>
                      <p className="font-mono text-xs text-zinc-500">
                        {key.key_prefix}
                      </p>
                      {key.last_used_at && (
                        <p className="mt-1 text-[11px] text-zinc-600">
                          {t("apiKeysLastUsed", {
                            date: new Date(key.last_used_at).toLocaleDateString(),
                          })}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => void handleRevoke(key.id)}
                      className="text-rose-300 hover:text-rose-200"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className={accountCardClassName}>
          <section className="space-y-3 text-center">
            <h2 className={accountSectionTitleClassName}>
              {t("apiKeysEndpointsTitle")}
            </h2>
            <p className={accountSectionIntroClassName}>
              {t("apiKeysEndpointsDesc")}
            </p>
            <ul className="space-y-2 text-center font-mono text-xs text-zinc-400">
              <li className="rounded-lg border border-white/8 bg-black/20 px-3 py-2">
                GET /api/v1/creator/games
              </li>
              <li className="rounded-lg border border-white/8 bg-black/20 px-3 py-2">
                GET /api/v1/creator/analytics?scope=all&amp;range=last7
              </li>
              <li className="rounded-lg border border-white/8 bg-black/20 px-3 py-2">
                GET /api/v1/creator/revenue?scope=all
              </li>
              <li className="rounded-lg border border-emerald-400/20 bg-emerald-500/5 px-3 py-2 text-emerald-200/90">
                POST /api/v1/creator/games
                <span className="mt-1 block text-[10px] font-sans text-zinc-500">
                  multipart/form-data · 欄位同儀表板上傳
                </span>
              </li>
              <li className="rounded-lg border border-emerald-400/20 bg-emerald-500/5 px-3 py-2 text-emerald-200/90">
                PATCH /api/v1/creator/games/[id]
                <span className="mt-1 block text-[10px] font-sans text-zinc-500">
                  JSON · title, publishStatus, tipsEnabled 等
                </span>
              </li>
              <li className="rounded-lg border border-rose-400/20 bg-rose-500/5 px-3 py-2 text-rose-200/90">
                DELETE /api/v1/creator/games/[id]
              </li>
            </ul>
          </section>
        </div>

        <p className="text-center text-xs leading-relaxed text-zinc-600">
          {t("apiKeysUsageHint")}
        </p>
      </div>

      <AnimatePresence>
        {copied && !createdKey && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={cn(
              "fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2",
              "rounded-full border border-amber-400/30 bg-zinc-900/95 px-5 py-2.5",
              "text-sm text-amber-100 shadow-xl backdrop-blur-md"
            )}
          >
            <Check className="size-4 text-amber-400" />
            {t("apiKeysCopied")}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
