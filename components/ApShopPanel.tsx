"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, ShoppingBag, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AP_SHOP_KIND_LABELS,
  type ApShopItem,
  type ApShopItemKind,
  type ApWallet,
  type EquippedCosmetics,
} from "@/lib/ap-shop";
import { RARITY_BORDER_CLASS, RARITY_LABELS } from "@/lib/titles";
import { cn } from "@/lib/utils";

type ApShopPanelProps = {
  wallet: ApWallet | null;
  items: ApShopItem[];
  equipped: EquippedCosmetics | null;
  loading: boolean;
  onPurchase: (code: string) => Promise<void>;
  onEquip: (kind: Exclude<ApShopItemKind, "title">, code: string | null) => Promise<void>;
  onRefreshTitles?: () => Promise<void>;
};

const KIND_ORDER: ApShopItemKind[] = [
  "title",
  "avatar_frame",
  "name_color",
  "chat_bubble",
];

export function ApShopPanel({
  wallet,
  items,
  loading,
  onPurchase,
  onEquip,
}: ApShopPanelProps) {
  const t = useTranslations("achievements");
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleBuy = async (item: ApShopItem) => {
    setBusyCode(item.code);
    setErrorMsg(null);
    try {
      await onPurchase(item.code);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : t("shopBuyFailed"));
    } finally {
      setBusyCode(null);
    }
  };

  const handleEquip = async (item: ApShopItem) => {
    if (item.kind === "title") return;
    setBusyCode(`equip:${item.code}`);
    setErrorMsg(null);
    try {
      const next = item.equipped ? null : item.code;
      await onEquip(item.kind, next);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : t("shopEquipFailed"));
    } finally {
      setBusyCode(null);
    }
  };

  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-zinc-500">
        <Loader2 className="mr-2 size-5 animate-spin" />
        {t("loading")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-400/20 bg-gradient-to-r from-amber-500/10 to-violet-500/10 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-amber-100 sm:text-base">
              {t("shopBalanceLabel")}
            </p>
            <p className="text-xs text-zinc-400 sm:text-sm">{t("shopBalanceHint")}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums text-amber-300">
              {wallet?.balance ?? 0}{" "}
              <span className="text-sm font-semibold text-amber-200/80">AP</span>
            </p>
            <p className="text-xs text-zinc-500">
              {t("shopLifetimeLabel")}: {wallet?.lifetime_earned ?? 0}
            </p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {errorMsg}
        </p>
      )}

      {KIND_ORDER.map((kind) => {
        const group = items.filter((item) => item.kind === kind);
        if (group.length === 0) return null;
        return (
          <section key={kind}>
            <h3 className="mb-2.5 px-1 text-sm font-semibold uppercase tracking-wider text-zinc-500 sm:text-base">
              {AP_SHOP_KIND_LABELS[kind]}
            </h3>
            <div className="space-y-2">
              {group.map((item) => {
                const canAfford = (wallet?.balance ?? 0) >= item.price_ap;
                const buying = busyCode === item.code;
                const equipping = busyCode === `equip:${item.code}`;
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "flex flex-col gap-3 rounded-xl border bg-zinc-900/60 p-3 sm:flex-row sm:items-center sm:justify-between",
                      RARITY_BORDER_CLASS[item.rarity_tier]
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-zinc-100">{item.name}</p>
                        <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-400">
                          {RARITY_LABELS[item.rarity_tier]}
                        </span>
                        {item.owned && (
                          <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-300">
                            {t("shopOwned")}
                          </span>
                        )}
                        {item.equipped && (
                          <span className="rounded-md bg-violet-500/15 px-1.5 py-0.5 text-[10px] text-violet-300">
                            {t("shopEquipped")}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-zinc-400">{item.description}</p>
                      {item.css_class && item.kind !== "title" && (
                        <p
                          className={cn(
                            "mt-1.5 text-xs",
                            item.kind === "name_color" && item.css_class
                          )}
                        >
                          {item.kind === "name_color"
                            ? t("shopPreviewName")
                            : item.css_class}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <span className="tabular-nums text-sm font-semibold text-amber-300">
                        {item.price_ap} AP
                      </span>
                      {!item.owned ? (
                        <Button
                          type="button"
                          disabled={buying || !canAfford}
                          onClick={() => void handleBuy(item)}
                          className="h-9 gap-1.5 border-0 bg-gradient-to-r from-amber-500 to-orange-500 px-3 text-sm text-white hover:from-amber-400 hover:to-orange-400 disabled:opacity-50"
                        >
                          {buying ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <ShoppingBag className="size-3.5" />
                          )}
                          {canAfford ? t("shopBuy") : t("shopCannotAfford")}
                        </Button>
                      ) : item.kind === "title" ? (
                        <span className="text-xs text-emerald-300/90">
                          {t("shopTitleGranted")}
                        </span>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={equipping}
                          onClick={() => void handleEquip(item)}
                          className="h-9 border-white/15 bg-white/5 px-3 text-sm text-zinc-200 hover:bg-white/10"
                        >
                          {equipping ? (
                            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="mr-1.5 size-3.5" />
                          )}
                          {item.equipped ? t("shopUnequip") : t("shopEquip")}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
