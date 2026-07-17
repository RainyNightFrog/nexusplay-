"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  Crown,
  Loader2,
  Lock,
  Medal,
  RefreshCw,
  Sparkles,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserBadge } from "@/components/UserBadge";
import { ApShopPanel } from "@/components/ApShopPanel";
import { useAuth } from "@/hooks/use-auth";
import type { ApShopItem, ApWallet, EquippedCosmetics } from "@/lib/ap-shop";
import type { ApShopItemKind } from "@/lib/ap-shop";
import {
  ACHIEVEMENT_CATEGORY_LABELS,
  ACHIEVEMENT_CATEGORY_ORDER,
  type AchievementCategory,
  type AchievementWithProgress,
} from "@/lib/achievements";
import { formatProgressLabel } from "@/lib/achievement-progress";
import type { TitleWardrobeEntry } from "@/lib/titles";
import {
  SUPPORTER_TITLE_LIFETIME,
  SUPPORTER_TITLE_V1,
  SUPPORTER_TITLE_V2,
} from "@/lib/supporter-tier";
import { Link } from "@/i18n/navigation";
import {
  RARITY_BORDER_CLASS,
  RARITY_LABELS,
  getTitleDisplayClass,
} from "@/lib/titles";
import { cn } from "@/lib/utils";

type AchievementsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type AchievementsResponse = {
  achievements: AchievementWithProgress[];
  summary: {
    unlocked_count: number;
    total_count: number;
    total_points: number;
    spendable_ap?: number;
    lifetime_ap?: number;
    completion_percent: number;
    claimable_count?: number;
  };
  categoryProgress: {
    category: AchievementCategory;
    unlocked: number;
    total: number;
    percent: number;
  }[];
};

type TitlesResponse = {
  titles: TitleWardrobeEntry[];
  equipped_title_id: string | null;
  total_points: number;
};

const TAB_TRIGGER_CLASS =
  "flex h-11 min-w-0 flex-1 basis-0 items-center justify-center rounded-lg border-0 px-3 text-center text-sm font-medium leading-tight after:hidden sm:h-12 sm:text-base";

const RARITY_GLOW: Record<string, string> = {
  common: "from-zinc-600/20 to-zinc-700/10",
  rare: "from-cyan-500/20 to-cyan-600/10",
  epic: "from-violet-500/25 to-fuchsia-500/15",
  legendary: "from-amber-400/25 via-fuchsia-500/20 to-cyan-400/20",
};

function formatUnlockPercent(value: number) {
  if (value <= 0) return "0%";
  if (value < 0.1) return "<0.1%";
  if (value >= 10) return `${Math.round(value)}%`;
  return `${value.toFixed(1)}%`;
}

function ProgressRing({
  percent,
  unlocked,
  size = 52,
}: {
  percent: number;
  unlocked: boolean;
  size?: number;
}) {
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={unlocked ? "#34d399" : "url(#progressGradient)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
        </defs>
      </svg>
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center font-bold tabular-nums",
          size >= 56 ? "text-sm" : "text-xs",
          unlocked ? "text-emerald-300" : "text-cyan-300"
        )}
      >
        {unlocked ? "✓" : `${percent}%`}
      </span>
    </div>
  );
}

function AchievementProgressPanel({
  summary,
  categoryProgress,
}: {
  summary: AchievementsResponse["summary"];
  categoryProgress: AchievementsResponse["categoryProgress"];
}) {
  const t = useTranslations("achievements");

  return (
    <aside className="hidden w-52 shrink-0 flex-col gap-3 overflow-y-auto overscroll-contain border-l border-white/8 bg-zinc-950/40 p-4 lg:flex xl:w-60">
      <div className="rounded-xl border border-white/8 bg-zinc-900/60 p-4 text-center">
        <ProgressRing percent={summary.completion_percent} unlocked={false} size={72} />
        <p className="mt-2 text-sm font-medium text-zinc-300">{t("overallProgress")}</p>
        <p className="mt-0.5 text-xl font-bold text-amber-300">
          {summary.unlocked_count}
          <span className="text-base font-normal text-zinc-500">/{summary.total_count}</span>
        </p>
      </div>

      <div className="space-y-2.5">
        <p className="px-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          {t("categoryProgress")}
        </p>
        {categoryProgress.map((item) => (
          <div key={item.category} className="space-y-1 px-1">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-zinc-400">
                {ACHIEVEMENT_CATEGORY_LABELS[item.category]}
              </span>
              <span className="tabular-nums text-zinc-500">
                {item.unlocked}/{item.total}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-all duration-500"
                style={{ width: `${item.percent}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto rounded-lg border border-amber-400/15 bg-amber-500/5 p-3 text-center">
        <p className="text-xs text-zinc-500 sm:text-sm">{t("statPoints")}</p>
        <p className="text-lg font-bold text-amber-300 sm:text-xl">{summary.total_points} AP</p>
      </div>
    </aside>
  );
}

function AchievementCard({
  achievement,
  claiming,
  onClaim,
}: {
  achievement: AchievementWithProgress;
  claiming: boolean;
  onClaim?: (code: string) => void;
}) {
  const t = useTranslations("achievements");
  const locked = !achievement.unlocked;
  const claimable = achievement.claimable && locked;
  const progressLabel = formatProgressLabel(
    achievement.code,
    achievement.progress_current,
    achievement.progress_target
  );

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border p-4 transition-all sm:p-5",
        claimable
          ? "border-amber-400/35 bg-amber-500/5 ring-1 ring-amber-400/20"
          : locked
            ? "border-white/6 bg-zinc-900/40"
            : cn(
                "border-white/10 bg-zinc-900/60",
                RARITY_BORDER_CLASS[achievement.rarity_tier]
              )
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-60",
          RARITY_GLOW[achievement.rarity_tier]
        )}
      />

      <div className="relative flex items-center gap-4">
        <div
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-xl text-xl sm:size-14 sm:text-2xl",
            locked
              ? "bg-zinc-800/80 grayscale"
              : "bg-gradient-to-br from-cyan-500/15 to-violet-500/15 ring-1 ring-white/10"
          )}
        >
          {locked ? <Lock className="size-4 text-zinc-500 sm:size-5" /> : achievement.badge_icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4
              className={cn(
                "text-base font-semibold sm:text-lg",
                locked ? "text-zinc-500" : "text-zinc-100"
              )}
            >
              {achievement.title}
            </h4>
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-300">
              +{achievement.points}
            </span>
          </div>

          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-zinc-400 sm:text-base">
            {achievement.description}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
            <span className="text-zinc-600">
              {ACHIEVEMENT_CATEGORY_LABELS[achievement.category]}
            </span>
            <span className="text-zinc-700">·</span>
            <span className="text-cyan-400/80">
              {t("globalUnlock", {
                percent: formatUnlockPercent(achievement.unlock_percent),
              })}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-center gap-1.5">
          <ProgressRing
            percent={achievement.progress_percent}
            unlocked={achievement.unlocked}
            size={56}
          />
          {claimable && onClaim ? (
            <Button
              type="button"
              disabled={claiming}
              onClick={() => onClaim(achievement.code)}
              className="h-8 gap-1.5 border-0 bg-gradient-to-r from-amber-500 to-orange-500 px-3 text-xs font-semibold text-white shadow-md shadow-amber-500/25 hover:from-amber-400 hover:to-orange-400"
            >
              {claiming ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              {claiming ? t("claiming") : t("claim")}
            </Button>
          ) : (
            <span className="text-xs tabular-nums text-zinc-500">
              {achievement.unlocked
                ? t("unlocked")
                : claimable
                  ? t("claimable")
                  : progressLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function TitleWardrobePanel({
  titles,
  equippedTitle,
  displayName,
}: {
  titles: TitleWardrobeEntry[];
  equippedTitle: TitleWardrobeEntry | null;
  displayName: string;
}) {
  const t = useTranslations("achievements");
  const unlockedCount = titles.filter((title) => title.unlocked).length;

  return (
    <aside className="hidden w-48 shrink-0 flex-col gap-2 overflow-y-auto overscroll-contain border-l border-white/8 bg-zinc-950/40 p-3 lg:flex xl:w-52">
      <div className="rounded-lg border border-violet-400/15 bg-violet-500/5 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-300/80">
          {t("titleCollection")}
        </p>
        <p className="mt-0.5 text-2xl font-bold text-violet-200">
          {unlockedCount}
          <span className="text-sm font-normal text-zinc-500">/{titles.length}</span>
        </p>
      </div>

      <div className="space-y-1.5">
        <p className="px-0.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          {t("titleWardrobeSteps")}
        </p>
        <ol className="space-y-1 text-xs leading-snug text-zinc-400">
          <li className="flex gap-1.5 rounded-md border border-white/5 bg-zinc-900/50 px-2 py-1.5">
            <span className="font-bold text-amber-300">1</span>
            <span>{t("titleStep1")}</span>
          </li>
          <li className="flex gap-1.5 rounded-md border border-white/5 bg-zinc-900/50 px-2 py-1.5">
            <span className="font-bold text-violet-300">2</span>
            <span>{t("titleStep2")}</span>
          </li>
          <li className="flex gap-1.5 rounded-md border border-white/5 bg-zinc-900/50 px-2 py-1.5">
            <span className="font-bold text-cyan-300">3</span>
            <span>{t("titleStep3")}</span>
          </li>
        </ol>
      </div>

      <div className="mt-auto rounded-lg border border-white/8 bg-zinc-900/60 p-3">
        <p className="text-[11px] font-medium text-zinc-500">{t("displayPreview")}</p>
        {equippedTitle ? (
          <div className="mt-1.5 rounded-md border border-cyan-400/15 bg-black/25 px-2 py-1.5">
            <UserBadge
              username={displayName}
              title={equippedTitle}
              usernameClassName="text-sm text-zinc-200"
              titleClassName="text-xs"
            />
          </div>
        ) : (
          <p className="mt-1.5 text-xs text-zinc-600">{t("noEquipped")}</p>
        )}
      </div>
    </aside>
  );
}

function TitleCard({
  title,
  displayName,
  equipping,
  onEquip,
  onUnequip,
  onGoToAchievements,
}: {
  title: TitleWardrobeEntry;
  displayName: string;
  equipping: boolean;
  onEquip: (titleId: string) => void;
  onUnequip: () => void;
  onGoToAchievements?: () => void;
}) {
  const t = useTranslations("achievements");
  const locked = !title.unlocked;
  const achievement = title.unlock_achievement;

  const statusLabel = title.is_equipped
    ? t("equippedNow")
    : locked
      ? t("locked")
      : t("ownedTitle");

  const statusClass = title.is_equipped
    ? "border-cyan-400/30 bg-cyan-500/15 text-cyan-200"
    : locked
      ? "border-zinc-600/40 bg-zinc-800/60 text-zinc-500"
      : "border-emerald-400/25 bg-emerald-500/10 text-emerald-200";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border p-3.5 transition-all sm:p-4",
        locked
          ? "border-white/5 bg-zinc-900/30"
          : cn(
              "border-white/10 bg-zinc-900/55",
              RARITY_BORDER_CLASS[title.rarity_tier],
              title.is_equipped && "ring-1 ring-cyan-400/40"
            )
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-50",
          RARITY_GLOW[title.rarity_tier]
        )}
      />

      <div className="relative space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                statusClass
              )}
            >
              {statusLabel}
            </span>
            <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[11px] text-zinc-400">
              {RARITY_LABELS[title.rarity_tier]}
            </span>
          </div>
          {title.is_equipped ? (
            <Crown className="size-4 shrink-0 text-amber-300" />
          ) : locked ? (
            <Lock className="size-4 shrink-0 text-zinc-600" />
          ) : (
            <Sparkles className="size-4 shrink-0 text-violet-300" />
          )}
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "text-base font-bold sm:text-lg",
                locked
                  ? "text-zinc-500"
                  : getTitleDisplayClass(title.css_class, title.rarity_tier)
              )}
            >
              {title.name}
            </p>

            <p className="mt-1 text-left text-xs leading-snug text-zinc-400 sm:text-sm">
              {achievement ? (
                <>
                  {t("unlockRequirement", { achievement: achievement.title })}{" "}
                  <span aria-hidden>{achievement.badge_icon}</span>
                  {!locked && (
                    <span
                      className={cn(
                        "ml-1",
                        achievement.unlocked ? "text-emerald-400" : "text-amber-300"
                      )}
                    >
                      ·{" "}
                      {achievement.unlocked
                        ? t("achievementCompleted")
                        : t("achievementInProgress")}
                    </span>
                  )}
                </>
              ) : title.name === SUPPORTER_TITLE_V1 ? (
                t("unlockRequirementSupporterBasic")
              ) : title.name === SUPPORTER_TITLE_V2 ? (
                t("unlockRequirementSupporterPremium")
              ) : title.name === SUPPORTER_TITLE_LIFETIME ? (
                t("unlockRequirementSupporterLifetime")
              ) : title.name === "AP 先驅" ||
                title.name === "霓虹旅人" ||
                title.name === "點數帝王" ? (
                t("unlockRequirementApShop")
              ) : (
                t("unlockRequirementUnknown")
              )}
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
            <div className="rounded-md border border-white/5 bg-black/20 px-2.5 py-1.5">
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                {locked ? t("displayPreviewLocked") : t("displayPreview")}
              </p>
              <UserBadge
                username={displayName}
                title={locked ? { ...title, name: title.name } : title}
                usernameClassName={cn(
                  "text-sm",
                  locked ? "text-zinc-600" : "text-zinc-200"
                )}
                titleClassName={locked ? "opacity-40 text-xs" : "text-xs sm:text-sm"}
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-1.5">
              {locked && onGoToAchievements && achievement && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onGoToAchievements}
                  className="h-8 gap-1 px-2 text-xs text-zinc-400 hover:text-amber-300"
                >
                  {t("goToAchievement")}
                  <ArrowRight className="size-3.5" />
                </Button>
              )}
              {locked &&
                !achievement &&
                (title.name === SUPPORTER_TITLE_V1 ||
                  title.name === SUPPORTER_TITLE_V2 ||
                  title.name === SUPPORTER_TITLE_LIFETIME) && (
                  <Link
                    href="/supporter"
                    className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs text-zinc-400 transition-colors hover:text-amber-300"
                  >
                    {t("goToSupporter")}
                    <ArrowRight className="size-3.5" />
                  </Link>
                )}
              {locked ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled
                  className="h-8 border-white/10 bg-white/5 px-3 text-xs text-zinc-500"
                >
                  <Lock className="size-3.5" />
                  {t("locked")}
                </Button>
              ) : title.is_equipped ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={equipping}
                  onClick={() => onUnequip()}
                  className="h-8 border-rose-400/20 bg-rose-500/10 px-3 text-xs text-rose-200 hover:bg-rose-500/15"
                >
                  {equipping ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  {t("unequip")}
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={equipping}
                  onClick={() => onEquip(title.id)}
                  className="h-8 border-0 bg-gradient-to-r from-cyan-500 to-violet-600 px-3 text-xs text-white shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-violet-500"
                >
                  {equipping ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Medal className="size-3.5" />
                  )}
                  {t("equip")}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AchievementsModal({ open, onOpenChange }: AchievementsModalProps) {
  const t = useTranslations("achievements");
  const { profile, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<"achievements" | "titles" | "shop">(
    "achievements"
  );
  const [achievementsData, setAchievementsData] = useState<AchievementsResponse | null>(null);
  const [titlesData, setTitlesData] = useState<TitlesResponse | null>(null);
  const [shopWallet, setShopWallet] = useState<ApWallet | null>(null);
  const [shopItems, setShopItems] = useState<ApShopItem[]>([]);
  const [shopEquipped, setShopEquipped] = useState<EquippedCosmetics | null>(null);
  const [loading, setLoading] = useState(false);
  const [equippingId, setEquippingId] = useState<string | "unequip" | null>(null);
  const [claimingCode, setClaimingCode] = useState<string | "all" | null>(null);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(false);

    try {
      const [achievementsRes, titlesRes, shopRes] = await Promise.all([
        fetch("/api/achievements", { credentials: "same-origin", cache: "no-store" }),
        profile
          ? fetch("/api/titles", { credentials: "same-origin", cache: "no-store" })
          : Promise.resolve(null),
        profile
          ? fetch("/api/ap/shop", { credentials: "same-origin", cache: "no-store" })
          : Promise.resolve(null),
      ]);

      if (!achievementsRes.ok) {
        throw new Error("achievements failed");
      }

      const achievementsPayload = (await achievementsRes.json()) as AchievementsResponse;
      setAchievementsData(achievementsPayload);

      if (titlesRes) {
        if (!titlesRes.ok) {
          throw new Error("titles failed");
        }
        const titlesPayload = (await titlesRes.json()) as TitlesResponse;
        setTitlesData(titlesPayload);
      } else {
        setTitlesData(null);
      }

      if (shopRes) {
        if (shopRes.ok) {
          const shopPayload = (await shopRes.json()) as {
            wallet: ApWallet;
            items: ApShopItem[];
            equipped: EquippedCosmetics;
          };
          setShopWallet(shopPayload.wallet);
          setShopItems(shopPayload.items);
          setShopEquipped(shopPayload.equipped);
        } else {
          setShopWallet(null);
          setShopItems([]);
          setShopEquipped(null);
        }
      } else {
        setShopWallet(null);
        setShopItems([]);
        setShopEquipped(null);
      }
    } catch {
      setError(true);
      if (!silent) {
        setAchievementsData(null);
        setTitlesData(null);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    if (!open) return;
    void fetchData();
  }, [fetchData, open]);

  const handleEquip = async (titleId: string) => {
    setEquippingId(titleId);
    try {
      const response = await fetch("/api/titles/equip", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title_id: titleId }),
      });

      if (!response.ok) {
        throw new Error("equip failed");
      }

      await fetchData(true);
      await refreshProfile();
    } finally {
      setEquippingId(null);
    }
  };

  const handleUnequip = async () => {
    setEquippingId("unequip");
    try {
      const response = await fetch("/api/titles/equip", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title_id: null }),
      });

      if (!response.ok) {
        throw new Error("unequip failed");
      }

      await fetchData(true);
      await refreshProfile();
    } finally {
      setEquippingId(null);
    }
  };

  const handleClaim = async (code: string) => {
    setClaimingCode(code);
    try {
      const response = await fetch("/api/achievements/claim", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        throw new Error("claim failed");
      }

      const payload = (await response.json()) as AchievementsResponse;
      setAchievementsData(payload);
      await fetchData(true);
      await refreshProfile();
    } catch {
      setError(true);
    } finally {
      setClaimingCode(null);
    }
  };

  const handleClaimAll = async () => {
    setClaimingCode("all");
    try {
      const response = await fetch("/api/achievements/claim", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claim_all: true }),
      });

      if (!response.ok) {
        throw new Error("claim all failed");
      }

      const payload = (await response.json()) as AchievementsResponse;
      setAchievementsData(payload);
      await fetchData(true);
      await refreshProfile();
    } catch {
      setError(true);
    } finally {
      setClaimingCode(null);
    }
  };

  const handleShopPurchase = async (itemCode: string) => {
    const response = await fetch("/api/ap/purchase", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_code: itemCode }),
    });
    const payload = (await response.json()) as {
      error?: string;
      wallet?: ApWallet;
      items?: ApShopItem[];
      equipped?: EquippedCosmetics;
    };
    if (!response.ok) {
      throw new Error(payload.error || t("shopBuyFailed"));
    }
    if (payload.wallet) setShopWallet(payload.wallet);
    if (payload.items) setShopItems(payload.items);
    if (payload.equipped) setShopEquipped(payload.equipped);
    await fetchData(true);
    await refreshProfile();
  };

  const handleShopEquip = async (
    kind: Exclude<ApShopItemKind, "title">,
    itemCode: string | null
  ) => {
    const response = await fetch("/api/ap/equip", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, item_code: itemCode }),
    });
    const payload = (await response.json()) as {
      error?: string;
      wallet?: ApWallet;
      items?: ApShopItem[];
      equipped?: EquippedCosmetics;
    };
    if (!response.ok) {
      throw new Error(payload.error || t("shopEquipFailed"));
    }
    if (payload.wallet) setShopWallet(payload.wallet);
    if (payload.items) setShopItems(payload.items);
    if (payload.equipped) setShopEquipped(payload.equipped);
    await refreshProfile();
  };

  const claimableCount =
    achievementsData?.summary.claimable_count ??
    achievementsData?.achievements.filter((item) => item.claimable).length ??
    0;

  const groupedAchievements = ACHIEVEMENT_CATEGORY_ORDER.map((category) => ({
    category,
    items:
      achievementsData?.achievements.filter((item) => item.category === category) ??
      [],
  })).filter((group) => group.items.length > 0);

  const allTitles = titlesData?.titles ?? [];
  const equippedTitleEntry =
    allTitles.find((title) => title.is_equipped) ??
    (profile?.equipped_title
      ? allTitles.find((title) => title.id === profile.equipped_title?.id) ?? null
      : null);
  const displayName =
    profile?.display_name?.trim() || t("previewUsername");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          "!flex max-h-[92vh] w-[min(calc(100vw-1rem),1120px)] max-w-[min(calc(100vw-1rem),1120px)] flex-col gap-0 overflow-hidden",
          "sm:max-w-[1120px]",
          "border-amber-400/15 bg-zinc-950/95 p-0 text-base text-zinc-100",
          "shadow-2xl shadow-amber-500/10 backdrop-blur-xl"
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-amber-500/10 via-violet-500/5 to-transparent" />

        <div className="relative flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-5 py-5 sm:gap-5 sm:px-6 sm:py-6">
          <DialogHeader className="shrink-0 space-y-1.5 text-center">
            <DialogTitle className="flex items-center justify-center gap-3 text-2xl font-bold sm:text-3xl">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/25 to-violet-500/20 sm:size-12">
                <Trophy className="size-5 text-amber-300 sm:size-6" />
              </span>
              <span className="bg-gradient-to-r from-amber-200 via-violet-300 to-cyan-300 bg-clip-text text-transparent">
                {t("title")}
              </span>
            </DialogTitle>
            <DialogDescription className="text-sm text-zinc-400 sm:text-base">
              {t("subtitle")}
            </DialogDescription>
          </DialogHeader>

          {profile && achievementsData && (
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-white/8 bg-zinc-900/50 p-3 text-center sm:grid-cols-4 sm:gap-4 sm:p-4">
              <div>
                <p className="text-xl font-bold text-cyan-300 sm:text-2xl">
                  {achievementsData.summary.unlocked_count}
                </p>
                <p className="text-xs text-zinc-500 sm:text-sm">{t("statUnlocked")}</p>
              </div>
              <div>
                <p className="text-xl font-bold text-amber-300 sm:text-2xl">
                  {achievementsData.summary.spendable_ap ??
                    shopWallet?.balance ??
                    achievementsData.summary.total_points}
                </p>
                <p className="text-xs text-zinc-500 sm:text-sm">{t("statSpendableAp")}</p>
              </div>
              <div>
                <p className="text-xl font-bold text-orange-300 sm:text-2xl">
                  {achievementsData.summary.lifetime_ap ??
                    achievementsData.summary.total_points}
                </p>
                <p className="text-xs text-zinc-500 sm:text-sm">{t("statLifetimeAp")}</p>
              </div>
              <div>
                <p className="text-xl font-bold text-violet-300 sm:text-2xl">
                  {allTitles.filter((title) => title.unlocked).length}
                </p>
                <p className="text-xs text-zinc-500 sm:text-sm">{t("statTitles")}</p>
              </div>
            </div>
          )}

          <Tabs
            value={activeTab}
            onValueChange={(value) =>
              setActiveTab(value as "achievements" | "titles" | "shop")
            }
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/10 bg-zinc-900/40">
              <TabsList className="!flex !h-auto !w-full shrink-0 items-stretch gap-1.5 rounded-none border-0 border-b border-white/10 bg-zinc-900/80 p-1.5 group-data-horizontal/tabs:!h-auto">
                <TabsTrigger
                  value="achievements"
                  className={cn(
                    TAB_TRIGGER_CLASS,
                    "!h-11 sm:!h-12",
                    "data-active:bg-gradient-to-r data-active:from-amber-500/25 data-active:to-orange-500/20 data-active:text-amber-100"
                  )}
                >
                  🏅 {t("tabAchievements")}
                </TabsTrigger>
                <TabsTrigger
                  value="titles"
                  className={cn(
                    TAB_TRIGGER_CLASS,
                    "!h-11 sm:!h-12",
                    "data-active:bg-gradient-to-r data-active:from-violet-500/25 data-active:to-fuchsia-500/20 data-active:text-violet-100"
                  )}
                >
                  👑 {t("tabTitles")}
                </TabsTrigger>
                <TabsTrigger
                  value="shop"
                  className={cn(
                    TAB_TRIGGER_CLASS,
                    "!h-11 sm:!h-12",
                    "data-active:bg-gradient-to-r data-active:from-cyan-500/25 data-active:to-emerald-500/20 data-active:text-cyan-100"
                  )}
                >
                  🛒 {t("tabShop")}
                </TabsTrigger>
              </TabsList>

              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/5 px-4 py-3 text-base text-zinc-500 sm:px-5">
                <span className="min-w-0 truncate text-sm sm:text-base">
                  {loading
                    ? t("loading")
                    : error
                      ? t("loadError")
                      : activeTab === "titles"
                        ? t("titlesTabHint")
                        : activeTab === "shop"
                          ? t("shopTabHint")
                          : t("liveStats")}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 shrink-0 gap-2 px-4 text-sm text-zinc-400 hover:text-amber-300 sm:text-base"
                  onClick={() => void fetchData()}
                  disabled={loading}
                >
                  <RefreshCw className={cn("size-4", loading && "animate-spin")} />
                  {t("refresh")}
                </Button>
              </div>

              <div className="flex min-h-0 flex-1">
                <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable] px-4 py-3 pb-6 sm:px-5 sm:py-4 sm:pb-8">
                <TabsContent value="achievements" className="mt-0 outline-none">
                  {loading && !achievementsData ? (
                    <div className="flex items-center justify-center py-16 text-zinc-500">
                      <Loader2 className="mr-2 size-5 animate-spin" />
                      {t("loading")}
                    </div>
                  ) : error ? (
                    <p className="py-16 text-center text-base text-zinc-500">{t("loadError")}</p>
                  ) : (
                    <div className="space-y-4">
                      {profile && achievementsData && claimableCount > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3">
                          <p className="text-sm text-amber-100 sm:text-base">
                            {t("claimable")} · {claimableCount}
                          </p>
                          <Button
                            type="button"
                            disabled={claimingCode !== null}
                            onClick={() => void handleClaimAll()}
                            className="h-9 gap-1.5 border-0 bg-gradient-to-r from-amber-500 to-orange-500 px-4 text-sm font-semibold text-white shadow-md shadow-amber-500/25 hover:from-amber-400 hover:to-orange-400"
                          >
                            {claimingCode === "all" ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Sparkles className="size-4" />
                            )}
                            {claimingCode === "all" ? t("claiming") : t("claimAll")}
                          </Button>
                        </div>
                      )}
                      {profile && achievementsData && (
                        <div className="rounded-xl border border-white/8 bg-zinc-900/50 p-4 lg:hidden">
                          <div className="flex items-center gap-4">
                            <ProgressRing
                              percent={achievementsData.summary.completion_percent ?? 0}
                              unlocked={false}
                              size={60}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-zinc-300 sm:text-base">
                                {t("overallProgress")}
                              </p>
                              <p className="text-base text-zinc-500 sm:text-lg">
                                {achievementsData.summary.unlocked_count}/
                                {achievementsData.summary.total_count} ·{" "}
                                {achievementsData.summary.total_points} AP
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      {groupedAchievements.map((group) => (
                        <section key={group.category}>
                          <h3 className="mb-2.5 flex items-center justify-between px-1 text-sm font-semibold uppercase tracking-wider text-zinc-500 sm:text-base">
                            <span>{ACHIEVEMENT_CATEGORY_LABELS[group.category]}</span>
                            <span className="text-xs font-normal normal-case tabular-nums text-zinc-600 sm:text-sm">
                              {group.items.filter((i) => i.unlocked).length}/{group.items.length}
                            </span>
                          </h3>
                          <div className="space-y-2">
                            {group.items.map((achievement) => (
                              <AchievementCard
                                key={achievement.id}
                                achievement={achievement}
                                claiming={claimingCode === achievement.code}
                                onClaim={profile ? handleClaim : undefined}
                              />
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="titles" className="mt-0 outline-none">
                  {!profile ? (
                    <p className="py-16 text-center text-base text-zinc-500">
                      {t("loginRequired")}
                    </p>
                  ) : loading && !titlesData ? (
                    <div className="flex items-center justify-center py-16 text-zinc-500">
                      <Loader2 className="mr-2 size-5 animate-spin" />
                      {t("loading")}
                    </div>
                  ) : error ? (
                    <p className="py-16 text-center text-base text-zinc-500">{t("loadError")}</p>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="rounded-lg border border-violet-400/15 bg-violet-500/5 px-3 py-2 text-xs leading-snug text-violet-100/90 sm:text-sm">
                        {t("titleWardrobeGuide")}
                      </div>

                      {titlesData && (
                        <div className="rounded-lg border border-white/8 bg-zinc-900/50 p-3 lg:hidden">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-xs font-medium text-zinc-300 sm:text-sm">
                                {t("titleCollection")}
                              </p>
                              <p className="text-sm text-zinc-500 sm:text-base">
                                {allTitles.filter((title) => title.unlocked).length}/
                                {allTitles.length}
                              </p>
                            </div>
                            <div className="min-w-0 text-right">
                              <p className="text-[10px] text-zinc-500 sm:text-xs">{t("displayPreview")}</p>
                              {equippedTitleEntry ? (
                                <UserBadge
                                  username={displayName}
                                  title={equippedTitleEntry}
                                  usernameClassName="text-xs text-zinc-300 sm:text-sm"
                                  titleClassName="text-[10px] sm:text-xs"
                                />
                              ) : (
                                <p className="text-xs text-zinc-600">{t("noEquipped")}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        {allTitles.map((title) => (
                          <TitleCard
                            key={title.id}
                            title={title}
                            displayName={displayName}
                            equipping={
                              equippingId === title.id || equippingId === "unequip"
                            }
                            onEquip={handleEquip}
                            onUnequip={handleUnequip}
                            onGoToAchievements={() => setActiveTab("achievements")}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="shop" className="mt-0 outline-none">
                  {!profile ? (
                    <p className="py-16 text-center text-base text-zinc-500">
                      {t("loginRequired")}
                    </p>
                  ) : (
                    <ApShopPanel
                      wallet={shopWallet}
                      items={shopItems}
                      equipped={shopEquipped}
                      loading={loading}
                      onPurchase={handleShopPurchase}
                      onEquip={handleShopEquip}
                    />
                  )}
                </TabsContent>
                </div>

                {activeTab === "achievements" && achievementsData && profile && (
                  <AchievementProgressPanel
                    summary={{
                      ...achievementsData.summary,
                      completion_percent:
                        achievementsData.summary.completion_percent ??
                        (achievementsData.summary.total_count > 0
                          ? Math.round(
                              (achievementsData.summary.unlocked_count /
                                achievementsData.summary.total_count) *
                                100
                            )
                          : 0),
                    }}
                    categoryProgress={achievementsData.categoryProgress ?? []}
                  />
                )}
                {activeTab === "titles" && titlesData && profile && (
                  <TitleWardrobePanel
                    titles={allTitles}
                    equippedTitle={equippedTitleEntry}
                    displayName={displayName}
                  />
                )}
              </div>
            </div>
          </Tabs>

          {profile?.equipped_title && (
            <p className="shrink-0 border-t border-white/5 pt-4 text-center text-sm text-zinc-500 sm:text-base">
              {t("currentlyEquipped")}{" "}
              <span
                className={getTitleDisplayClass(
                  profile.equipped_title.css_class,
                  profile.equipped_title.rarity_tier
                )}
              >
                {profile.equipped_title.name}
              </span>
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
