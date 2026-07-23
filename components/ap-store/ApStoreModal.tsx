"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Coins,
  Loader2,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserBadge } from "@/components/UserBadge";
import { useAuth } from "@/hooks/use-auth";
import { useApiError } from "@/hooks/use-api-error";
import type {
  ApStoreCategory,
  ApStoreDashboard,
  ApStoreItem,
} from "@/lib/ap-store-service";
import { cn } from "@/lib/utils";

type ApStoreModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const CATEGORIES: ApStoreCategory[] = [
  "title",
  "name_color",
  "avatar_frame",
  "badge_effect",
];

const RARITY_CLASS: Record<string, string> = {
  common: "border-zinc-500/40 text-zinc-300",
  rare: "border-cyan-400/50 text-cyan-200",
  epic: "border-violet-400/50 text-violet-200",
  legendary: "border-amber-400/60 text-amber-200 shadow-[0_0_16px_rgba(251,191,36,0.35)]",
  mythic:
    "border-fuchsia-400/70 text-fuchsia-100 shadow-[0_0_20px_rgba(232,121,249,0.45)]",
};

export function ApStoreModal({ open, onOpenChange }: ApStoreModalProps) {
  const t = useTranslations("apStore");
  const { profile, refreshProfile } = useAuth();
  const { translateApiError } = useApiError();
  const [data, setData] = useState<ApStoreDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ApStoreItem | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ap/store", { credentials: "same-origin" });
      const payload = (await response.json()) as ApStoreDashboard & {
        error?: string;
      };
      if (!response.ok) {
        setError(translateApiError(payload.error) ?? t("loadError"));
        return;
      }
      setData(payload);
    } catch {
      setError(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [profile, t, translateApiError]);

  useEffect(() => {
    if (open && profile) void load();
  }, [open, profile, load]);

  const previewTitle = useMemo(() => {
    if (!selected || selected.category !== "title") {
      return profile?.equipped_title ?? null;
    }
    return {
      id: selected.unlockTitleId ?? selected.id,
      name: selected.name,
      css_class: selected.cssClass,
      rarity_tier: selected.rarity,
    };
  }, [selected, profile?.equipped_title]);

  const previewNameColor =
    selected?.category === "name_color"
      ? selected.cssClass
      : profile?.equipped_name_color_class;

  async function buySelected() {
    if (!selected) return;
    setBusyId(selected.id);
    setError(null);
    try {
      const response = await fetch("/api/ap/buy", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: selected.id }),
      });
      const payload = (await response.json()) as ApStoreDashboard & {
        error?: string;
      };
      if (!response.ok) {
        setError(translateApiError(payload.error) ?? t("buyFailed"));
        return;
      }
      setData(payload);
      setConfirmOpen(false);
      await refreshProfile();
    } catch {
      setError(t("buyFailed"));
    } finally {
      setBusyId(null);
    }
  }

  async function toggleEquip(item: ApStoreItem) {
    setBusyId(item.id);
    setError(null);
    try {
      const response = await fetch("/api/ap/equip", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, equip: !item.equipped }),
      });
      const payload = (await response.json()) as ApStoreDashboard & {
        error?: string;
      };
      if (!response.ok) {
        setError(translateApiError(payload.error) ?? t("equipFailed"));
        return;
      }
      setData(payload);
      await refreshProfile();
    } catch {
      setError(t("equipFailed"));
    } finally {
      setBusyId(null);
    }
  }

  function categoryLabel(category: ApStoreCategory) {
    if (category === "title") return t("tabTitle");
    if (category === "name_color") return t("tabNameColor");
    if (category === "avatar_frame") return t("tabFrame");
    return t("tabBadge");
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-hidden border-white/10 bg-zinc-950 text-zinc-100 sm:max-w-5xl">
          <DialogHeader className="text-center sm:text-center">
            <DialogTitle className="flex items-center justify-center gap-2 text-xl">
              <ShoppingBag className="size-5 text-amber-300" />
              {t("title")}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {t("subtitle")}
            </DialogDescription>
          </DialogHeader>

          {!profile ? (
            <p className="py-10 text-center text-sm text-zinc-400">
              {t("loginRequired")}
            </p>
          ) : (
            <div className="space-y-4">
              <div className="relative flex flex-col items-center justify-center gap-1 rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-500/15 via-zinc-900 to-cyan-500/10 px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-2">
                  <Coins className="size-5 animate-pulse text-amber-300" />
                  <div className="text-center">
                    <p className="text-xs text-zinc-400">{t("balanceLabel")}</p>
                    <p className="text-lg font-bold text-amber-100">
                      {data?.balance ?? "—"} AP
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void load()}
                  disabled={loading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 gap-1.5 text-zinc-400"
                >
                  <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
                  <span className="hidden sm:inline">{t("refresh")}</span>
                </Button>
              </div>

              {error && (
                <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-center text-xs text-rose-300">
                  {error}
                </p>
              )}

              {loading && !data ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="size-8 animate-spin text-amber-300" />
                </div>
              ) : data ? (
                <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
                  <Tabs defaultValue="title" className="min-w-0">
                    <TabsList className="mb-3 flex h-auto w-full flex-wrap justify-center gap-1 rounded-xl border border-white/10 bg-zinc-900/80 p-1">
                      {CATEGORIES.map((category) => (
                        <TabsTrigger
                          key={category}
                          value={category}
                          className="flex-1 rounded-lg px-2 py-2 text-xs sm:text-sm"
                        >
                          {categoryLabel(category)}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {CATEGORIES.map((category) => (
                      <TabsContent
                        key={category}
                        value={category}
                        className="max-h-[52vh] space-y-2 overflow-y-auto pr-1"
                      >
                        {data.items
                          .filter((item) => item.category === category)
                          .map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setSelected(item)}
                              className={cn(
                                "w-full rounded-xl border bg-zinc-900/70 p-3 text-left transition",
                                selected?.id === item.id
                                  ? "border-cyan-400/50 ring-1 ring-cyan-400/30"
                                  : "border-white/10 hover:border-white/25"
                              )}
                            >
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <p className="text-sm font-semibold text-white">
                                    {item.name}
                                  </p>
                                  <p className="mt-1 text-xs text-zinc-400">
                                    {item.description}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <span
                                    className={cn(
                                      "rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase",
                                      RARITY_CLASS[item.rarity]
                                    )}
                                  >
                                    {item.rarity === "common"
                                      ? t("rarityCommon")
                                      : item.rarity === "rare"
                                        ? t("rarityRare")
                                        : item.rarity === "epic"
                                          ? t("rarityEpic")
                                          : item.rarity === "mythic"
                                            ? t("rarityMythic")
                                            : t("rarityLegendary")}
                                  </span>
                                  <p className="mt-1 text-sm font-bold text-amber-200">
                                    {item.costAp} AP
                                  </p>
                                </div>
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {item.owned ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={busyId === item.id}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      void toggleEquip(item);
                                    }}
                                  >
                                    {busyId === item.id ? (
                                      <Loader2 className="size-3.5 animate-spin" />
                                    ) : item.equipped ? (
                                      t("unequip")
                                    ) : (
                                      t("equip")
                                    )}
                                  </Button>
                                ) : (
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="gap-1 bg-amber-500 text-zinc-950 hover:bg-amber-400"
                                    disabled={
                                      busyId === item.id ||
                                      (item.stockRemaining != null &&
                                        item.stockRemaining <= 0)
                                    }
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setSelected(item);
                                      setConfirmOpen(true);
                                    }}
                                  >
                                    <Sparkles className="size-3.5" />
                                    {t("buy")}
                                  </Button>
                                )}
                                {item.isLimited && (
                                  <span className="inline-flex items-center gap-1 text-[11px] text-fuchsia-300">
                                    <Star className="size-3" />
                                    {t("limited", {
                                      remaining: item.stockRemaining ?? 0,
                                    })}
                                  </span>
                                )}
                              </div>
                            </button>
                          ))}
                      </TabsContent>
                    ))}
                  </Tabs>

                  <aside className="rounded-2xl border border-cyan-400/20 bg-zinc-900/80 p-4">
                    <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-cyan-300">
                      {t("livePreview")}
                    </p>
                    <div className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-zinc-950/70 p-4">
                      <div
                        className={cn(
                          "relative flex size-14 items-center justify-center overflow-hidden rounded-full border border-cyan-400/30 bg-gradient-to-br from-cyan-500/30 to-violet-600/40",
                          selected?.category === "avatar_frame"
                            ? selected.cssClass
                            : profile.equipped_avatar_frame_class
                        )}
                      >
                        <span className="text-sm font-bold text-white">
                          {(profile.display_name ?? "?").slice(0, 2)}
                        </span>
                      </div>
                      <UserBadge
                        username={profile.display_name}
                        title={previewTitle}
                        nameColorClass={previewNameColor}
                        layout="stacked"
                        isSupporter={profile.is_supporter}
                        supporterBadge={profile.supporter_badge}
                      />
                      {selected && (
                        <p className="text-center text-[11px] text-zinc-500">
                          {t("previewHint", { name: selected.name })}
                        </p>
                      )}
                    </div>
                  </aside>
                </div>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="border-white/10 bg-zinc-950 text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("confirmTitle")}</DialogTitle>
            <DialogDescription>
              {selected
                ? t("confirmDesc", {
                    name: selected.name,
                    cost: selected.costAp,
                    remain: Math.max(
                      0,
                      (data?.balance ?? 0) - selected.costAp
                    ),
                  })
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
            >
              {t("cancel")}
            </Button>
            <Button
              type="button"
              disabled={!selected || busyId === selected?.id}
              onClick={() => void buySelected()}
              className="bg-amber-500 text-zinc-950 hover:bg-amber-400"
            >
              {busyId ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                t("confirmBuy")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
