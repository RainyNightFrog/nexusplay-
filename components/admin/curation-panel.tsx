"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertOctagon,
  Loader2,
  RefreshCw,
  Sparkles,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdminCurationGameRecord } from "@/lib/admin-curation-service";
import { cn } from "@/lib/utils";

export function AdminCurationPanel() {
  const t = useTranslations("admin");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [games, setGames] = useState<AdminCurationGameRecord[]>([]);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<
    Record<number, { featuredBadge: string; featuredSort: string }>
  >({});

  const loadCuration = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/curation");
      const data = (await response.json()) as {
        games?: AdminCurationGameRecord[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? t("curationLoadFailed"));
      const list = data.games ?? [];
      setGames(list);
      setDrafts(
        Object.fromEntries(
          list.map((game) => [
            game.id,
            {
              featuredBadge: game.featuredBadge ?? "",
              featuredSort: String(game.featuredSort),
            },
          ])
        )
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : t("curationLoadFailed")
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadCuration();
  }, [loadCuration]);

  async function patchGame(
    gameId: number,
    patch: {
      isFeatured?: boolean;
      featuredBadge?: string | null;
      featuredSort?: number;
      publishStatus?: "draft" | "public";
    }
  ) {
    setSavingId(gameId);
    setError(null);
    try {
      const response = await fetch(`/api/admin/curation/${gameId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = (await response.json()) as {
        game?: AdminCurationGameRecord;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? t("curationSaveFailed"));
      if (data.game) {
        setGames((prev) =>
          prev.map((game) => (game.id === gameId ? data.game! : game))
        );
        setDrafts((prev) => ({
          ...prev,
          [gameId]: {
            featuredBadge: data.game!.featuredBadge ?? "",
            featuredSort: String(data.game!.featuredSort),
          },
        }));
      } else {
        await loadCuration();
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : t("curationSaveFailed")
      );
    } finally {
      setSavingId(null);
    }
  }

  function updateDraft(
    gameId: number,
    field: "featuredBadge" | "featuredSort",
    value: string
  ) {
    setDrafts((prev) => ({
      ...prev,
      [gameId]: { ...prev[gameId], [field]: value },
    }));
  }

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">{t("tabCuration")}</h2>
          <p className="mt-1 text-sm text-zinc-500">{t("curationDesc")}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void loadCuration()}
          disabled={loading}
          className="gap-2 border-white/10"
        >
          <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          {t("refresh")}
        </Button>
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      <Card className="border-white/8 bg-zinc-900/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <Sparkles className="size-4 text-yellow-400" />
            {t("curationListTitle")}
          </CardTitle>
          <CardDescription>{t("curationListDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-6 animate-spin text-yellow-400" />
            </div>
          ) : games.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              {t("curationEmpty")}
            </p>
          ) : (
            games.map((game) => {
              const draft = drafts[game.id] ?? {
                featuredBadge: "",
                featuredSort: "0",
              };
              const isSaving = savingId === game.id;

              return (
                <div
                  key={game.id}
                  className="rounded-xl border border-white/8 bg-black/20 px-4 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-white">
                          {game.title}
                        </p>
                        {game.isFeatured && (
                          <Badge className="gap-1 border border-yellow-400/30 bg-yellow-500/10 text-yellow-200">
                            <Star className="size-3" />
                            {t("curationFeatured")}
                          </Badge>
                        )}
                        <Badge className="border border-white/10 bg-white/5 text-zinc-300">
                          {game.publishStatus}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {game.category} · {game.playsCount} {t("curationPlays")}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isSaving}
                      onClick={() =>
                        void patchGame(game.id, { isFeatured: !game.isFeatured })
                      }
                      className={cn(
                        "gap-1.5 border-white/10",
                        game.isFeatured && "border-yellow-400/30 text-yellow-200"
                      )}
                    >
                      {isSaving ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Star className="size-3.5" />
                      )}
                      {game.isFeatured
                        ? t("curationUnfeature")
                        : t("curationFeature")}
                    </Button>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor={`badge-${game.id}`}>
                        {t("curationBadgeLabel")}
                      </Label>
                      <Input
                        id={`badge-${game.id}`}
                        value={draft.featuredBadge}
                        onChange={(event) =>
                          updateDraft(game.id, "featuredBadge", event.target.value)
                        }
                        placeholder={t("curationBadgePlaceholder")}
                        className="border-white/10 bg-zinc-950/50 text-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`sort-${game.id}`}>
                        {t("curationSortLabel")}
                      </Label>
                      <Input
                        id={`sort-${game.id}`}
                        type="number"
                        value={draft.featuredSort}
                        onChange={(event) =>
                          updateDraft(game.id, "featuredSort", event.target.value)
                        }
                        className="border-white/10 bg-zinc-950/50 text-white"
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isSaving}
                      onClick={() =>
                        void patchGame(game.id, {
                          featuredBadge: draft.featuredBadge.trim() || null,
                          featuredSort:
                            Number.parseInt(draft.featuredSort, 10) || 0,
                        })
                      }
                      className="border-white/10"
                    >
                      {isSaving ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        t("curationSaveBtn")
                      )}
                    </Button>
                    {game.publishStatus === "public" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isSaving}
                        onClick={() => {
                          if (!window.confirm(t("curationDraftConfirm"))) return;
                          void patchGame(game.id, { publishStatus: "draft" });
                        }}
                        className="gap-1.5 border-rose-400/20 text-rose-200"
                      >
                        {isSaving ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <AlertOctagon className="size-3.5" />
                        )}
                        {t("curationEmergencyDraft")}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
