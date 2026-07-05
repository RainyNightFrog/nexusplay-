"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Copy, KeyRound, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { GameAccessCodeRecord } from "@/lib/partner-access-service";
import { cn } from "@/lib/utils";

type PartnerAccessPanelProps = {
  gameId: number;
  className?: string;
};

export function PartnerAccessPanel({ gameId, className }: PartnerAccessPanelProps) {
  const t = useTranslations("dashboard");
  const [codes, setCodes] = useState<GameAccessCodeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadCodes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/games/${gameId}/partner-access`, {
        credentials: "same-origin",
      });
      const data = (await response.json()) as {
        codes?: GameAccessCodeRecord[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? t("partnerAccessLoadFailed"));
      setCodes(data.codes ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : t("partnerAccessLoadFailed")
      );
    } finally {
      setLoading(false);
    }
  }, [gameId, t]);

  useEffect(() => {
    void loadCodes();
  }, [loadCodes]);

  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      const parsedMaxUses = maxUses.trim()
        ? Number.parseInt(maxUses, 10)
        : null;

      const response = await fetch(`/api/games/${gameId}/partner-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          label: label.trim() || null,
          maxUses:
            parsedMaxUses != null && !Number.isNaN(parsedMaxUses)
              ? parsedMaxUses
              : null,
        }),
      });
      const data = (await response.json()) as {
        code?: GameAccessCodeRecord;
        error?: string;
      };
      if (!response.ok || !data.code) {
        throw new Error(data.error ?? t("partnerAccessCreateFailed"));
      }
      setCodes((current) => [data.code!, ...current]);
      setLabel("");
      setMaxUses("");
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : t("partnerAccessCreateFailed")
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(codeId: string) {
    setError(null);
    try {
      const response = await fetch(
        `/api/games/${gameId}/partner-access?codeId=${encodeURIComponent(codeId)}`,
        { method: "DELETE", credentials: "same-origin" }
      );
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? t("partnerAccessDeleteFailed"));
      setCodes((current) => current.filter((code) => code.id !== codeId));
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : t("partnerAccessDeleteFailed")
      );
    }
  }

  function copyLink(code: GameAccessCodeRecord) {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const link = `${origin}/game/${gameId}?access=${encodeURIComponent(code.code)}`;
    void navigator.clipboard.writeText(link);
    setCopiedId(code.id);
    window.setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <section
      className={cn(
        "rounded-2xl border border-violet-400/15 bg-violet-500/[0.04] p-5",
        className
      )}
    >
      <div className="mb-4 flex items-start gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/10">
          <KeyRound className="size-5 text-violet-300" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">
            {t("partnerAccessTitle")}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400">
            {t("partnerAccessDesc")}
          </p>
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_120px_auto]">
        <div>
          <Label className="mb-1.5 block text-xs text-zinc-500">
            {t("partnerAccessLabel")}
          </Label>
          <Input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder={t("partnerAccessLabelPlaceholder")}
            className="border-white/10 bg-zinc-900/80"
          />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs text-zinc-500">
            {t("partnerAccessMaxUses")}
          </Label>
          <Input
            value={maxUses}
            onChange={(event) => setMaxUses(event.target.value)}
            placeholder="∞"
            inputMode="numeric"
            className="border-white/10 bg-zinc-900/80"
          />
        </div>
        <div className="flex items-end">
          <Button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="w-full gap-2 bg-violet-600 hover:bg-violet-500 sm:w-auto"
          >
            {creating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            {t("partnerAccessCreate")}
          </Button>
        </div>
      </div>

      {error && (
        <p className="mb-3 text-sm text-rose-400">{error}</p>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="size-6 animate-spin text-violet-400" />
        </div>
      ) : codes.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-500">
          {t("partnerAccessEmpty")}
        </p>
      ) : (
        <div className="space-y-2">
          {codes.map((code) => {
            const usesLabel =
              code.max_uses != null
                ? `${code.use_count}/${code.max_uses}`
                : `${code.use_count}`;

            return (
              <div
                key={code.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold text-violet-200">
                    {code.code}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {code.label || t("partnerAccessUntitled")} ·{" "}
                    {t("partnerAccessUses", { count: usesLabel })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => copyLink(code)}
                    className="gap-1.5 text-zinc-300 hover:text-white"
                  >
                    <Copy className="size-3.5" />
                    {copiedId === code.id
                      ? t("partnerAccessCopied")
                      : t("partnerAccessCopyLink")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => void handleDelete(code.id)}
                    className="text-rose-300 hover:text-rose-200"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
