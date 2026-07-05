"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, KeyRound, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApiError } from "@/hooks/use-api-error";
import { cn } from "@/lib/utils";

type LegacyImportListItem = {
  id: number;
  label: string | null;
  used: boolean;
  usedAt: string | null;
  createdAt: string;
};

type CreatedCode = {
  id: number;
  label: string | null;
  code: string;
};

type LegacyImportPanelProps = {
  gameId: string;
  className?: string;
};

export function LegacyImportPanel({ gameId, className }: LegacyImportPanelProps) {
  const t = useTranslations("dashboard");
  const { translateApiError } = useApiError();
  const [entries, setEntries] = useState<LegacyImportListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState("");
  const [saveJson, setSaveJson] = useState('{\n  "level": 1,\n  "coins": 100\n}');
  const [createdCodes, setCreatedCodes] = useState<CreatedCode[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/games/${gameId}/legacy-imports`, {
        credentials: "same-origin",
      });
      const data = (await response.json()) as {
        entries?: LegacyImportListItem[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(translateApiError(data.error) ?? t("legacyImportLoadFailed"));
      }
      setEntries(data.entries ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : t("legacyImportLoadFailed")
      );
    } finally {
      setLoading(false);
    }
  }, [gameId, t, translateApiError]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  async function handleCreate() {
    setCreating(true);
    setError(null);
    setCreatedCodes([]);

    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(saveJson);
      } catch {
        throw new Error(t("legacyImportInvalidJson"));
      }

      const response = await fetch(`/api/games/${gameId}/legacy-imports`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries: [{ label: label.trim() || undefined, save: parsed }],
        }),
      });
      const data = (await response.json()) as {
        codes?: CreatedCode[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(translateApiError(data.error) ?? t("legacyImportCreateFailed"));
      }

      setCreatedCodes(data.codes ?? []);
      setLabel("");
      await loadEntries();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : t("legacyImportCreateFailed")
      );
    } finally {
      setCreating(false);
    }
  }

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    window.setTimeout(() => setCopiedCode(null), 2000);
  }

  return (
    <section
      className={cn(
        "rounded-2xl border border-violet-400/20 bg-violet-500/[0.06] p-4 text-left sm:p-5",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/25 bg-violet-500/10 text-violet-300">
          <KeyRound className="size-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-white">
              {t("legacyImportTitle")}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
              {t("legacyImportDesc")}
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-zinc-300">
              {t("legacyImportLabelField")}
            </label>
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder={t("legacyImportLabelPlaceholder")}
              className="h-10 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-zinc-100 outline-none focus:border-violet-400/40 focus:ring-2 focus:ring-violet-500/20"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-zinc-300">
              {t("legacyImportSaveField")}
            </label>
            <textarea
              value={saveJson}
              onChange={(event) => setSaveJson(event.target.value)}
              rows={6}
              className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 font-mono text-xs leading-relaxed text-zinc-200 outline-none focus:border-violet-400/40 focus:ring-2 focus:ring-violet-500/20"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-300">{error}</p>
          )}

          <Button
            type="button"
            size="sm"
            disabled={creating}
            onClick={() => void handleCreate()}
            className="gap-1.5 border-0 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white hover:from-violet-400 hover:to-fuchsia-500"
          >
            {creating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            {t("legacyImportCreateButton")}
          </Button>

          {createdCodes.length > 0 && (
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3">
              <p className="text-xs font-medium text-emerald-200">
                {t("legacyImportCreatedTitle")}
              </p>
              <ul className="mt-2 space-y-2">
                {createdCodes.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2"
                  >
                    <div className="min-w-0">
                      {item.label && (
                        <p className="truncate text-xs text-zinc-400">{item.label}</p>
                      )}
                      <p className="font-mono text-sm font-semibold tracking-wider text-white">
                        {item.code}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 border-white/10 bg-white/5"
                      onClick={() => void copyCode(item.code)}
                    >
                      {copiedCode === item.code ? (
                        <Check className="size-3.5 text-emerald-300" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                      {t("legacyImportCopyCode")}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <p className="text-xs font-medium text-zinc-300">
              {t("legacyImportListTitle")}
            </p>
            {loading ? (
              <div className="flex items-center gap-2 py-4 text-xs text-zinc-500">
                <Loader2 className="size-4 animate-spin" />
                {t("legacyImportLoading")}
              </div>
            ) : entries.length === 0 ? (
              <p className="py-3 text-xs text-zinc-500">{t("legacyImportEmpty")}</p>
            ) : (
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs">
                {entries.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-zinc-400"
                  >
                    <span className="truncate">
                      {entry.label || `#${entry.id}`}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                        entry.used
                          ? "bg-zinc-700/50 text-zinc-400"
                          : "bg-emerald-500/15 text-emerald-300"
                      )}
                    >
                      {entry.used
                        ? t("legacyImportStatusUsed")
                        : t("legacyImportStatusPending")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
