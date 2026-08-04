"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import {
  HeartHandshake,
  Palette,
  Sparkles,
  Users,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  ChatPlayerCard,
  forumAuthorToPlayerPreview,
  virtualPlayerToPlayerPreview,
  type ChatPlayerPreview,
} from "@/components/chat/chat-player-card";
import { UserBadge } from "@/components/UserBadge";
import { SupporterAvatarInsignia } from "@/components/supporter/supporter-avatar-insignia";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAuth } from "@/hooks/use-auth";
import { getInitials } from "@/lib/auth";
import { deferClientTask } from "@/lib/defer-client";
import { fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { getVirtualPlayerEquippedTitle } from "@/lib/virtual-player-supporter";
import { requestOpenPlayerDm } from "@/lib/open-player-dm";
import type { PlatformSupporterPublic } from "@/lib/platform-supporters-service";
import {
  getSupporterDisplayTierFromProfile,
  supporterAvatarRingClassByTier,
} from "@/lib/supporter-tier";
import { API_FETCH_TIMEOUT_MS } from "@/lib/with-timeout";
import { cn } from "@/lib/utils";

const PERK_ICONS = [Sparkles, Palette, HeartHandshake] as const;

function supporterToPlayerPreview(
  supporter: PlatformSupporterPublic
): ChatPlayerPreview {
  if (supporter.virtualPlayerId) {
    return virtualPlayerToPlayerPreview({
      id: supporter.virtualPlayerId,
      displayName: supporter.displayName,
      avatarUrl: supporter.avatarUrl,
      equippedTitle: getVirtualPlayerEquippedTitle(supporter.virtualPlayerId),
      isSupporter: true,
      supporterBadge: supporter.supporterBadge,
      supporterLifetime: supporter.supporterLifetime,
    });
  }

  return {
    ...forumAuthorToPlayerPreview(
      supporter.displayName,
      supporter.id,
      null,
      { isOwn: false }
    ),
    avatarUrl: supporter.avatarUrl,
    isSupporter: true,
    supporterBadge: supporter.supporterBadge,
    supporterLifetime: supporter.supporterLifetime,
  };
}

function isLegendSupporter(supporter: PlatformSupporterPublic) {
  return supporter.tier === "lifetime" || supporter.supporterLifetime;
}

function isSvipOnlySupporter(supporter: PlatformSupporterPublic) {
  return supporter.tier === "premium" && !isLegendSupporter(supporter);
}

type WallAccent = "legend" | "svip" | "vip";

const WALL_ACCENT_STYLES: Record<
  WallAccent,
  { title: string; icon: string; card: string }
> = {
  legend: {
    title: "text-rose-300",
    icon: "text-sky-400",
    card: "border-rose-400/25 hover:border-sky-400/40 hover:bg-rose-500/[0.07] focus-visible:ring-sky-400/40",
  },
  svip: {
    title: "text-violet-300",
    icon: "text-violet-400",
    card: "border-violet-400/20 hover:border-violet-300/40 hover:bg-violet-500/[0.07] focus-visible:ring-violet-400/40",
  },
  vip: {
    title: "text-amber-300",
    icon: "text-amber-400",
    card: "border-white/10 hover:border-amber-400/35 hover:bg-amber-500/[0.06] focus-visible:ring-amber-400/40",
  },
};

type SupporterWallGroupProps = {
  title: string;
  countLabel: string;
  supporters: PlatformSupporterPublic[];
  accent: WallAccent;
  reduceMotion: boolean | null;
  onOpen: (supporter: PlatformSupporterPublic) => void;
};

function SupporterWallGroup({
  title,
  countLabel,
  supporters,
  accent,
  reduceMotion,
  onOpen,
}: SupporterWallGroupProps) {
  if (supporters.length === 0) return null;

  const styles = WALL_ACCENT_STYLES[accent];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          className={cn(
            "inline-flex items-center gap-2 text-sm font-semibold",
            styles.title
          )}
        >
          <Users className={cn("size-4 shrink-0", styles.icon)} />
          {title}
        </div>
        <p className="text-xs text-zinc-500">{countLabel}</p>
      </div>

      <ul className="grid grid-cols-2 gap-2 overflow-visible min-[400px]:gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {supporters.map((supporter, index) => (
          <motion.li
            key={supporter.id}
            className="overflow-visible"
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: 0.35,
              delay: reduceMotion ? 0 : Math.min(index * 0.03, 0.36),
            }}
          >
            <button
              type="button"
              onClick={() => onOpen(supporter)}
              className={cn(
                "flex min-w-0 w-full cursor-pointer flex-col items-center gap-1.5 overflow-visible rounded-xl border bg-white/[0.03] px-2 py-3 text-left sm:gap-2 sm:px-2.5",
                "transition-colors focus-visible:outline-none focus-visible:ring-2",
                styles.card
              )}
            >
              {/* pt 預留 VIP/SVIP/LEGEND 角標空間；支持者牆展示完整頭像特效 */}
              <div className="relative overflow-visible px-2 pb-2 pt-5">
                <div
                  className={cn(
                    "relative inline-flex",
                    supporter.tier !== "none" &&
                      supporterAvatarRingClassByTier[supporter.tier]
                  )}
                >
                  <div className="relative size-11 overflow-hidden rounded-full sm:size-12">
                  <UserAvatar
                    url={supporter.avatarUrl}
                    name={supporter.displayName}
                    className="bg-gradient-to-br from-amber-500/30 to-violet-600/35 text-sm font-bold text-white"
                    fallback={getInitials(supporter.displayName)}
                  />
                  </div>
                </div>
                <SupporterAvatarInsignia
                  isSupporter
                  supporterBadge={supporter.supporterBadge}
                  supporterLifetime={supporter.supporterLifetime}
                  tier={supporter.tier}
                  size="xs"
                />
              </div>
              <div className="w-full min-w-0 overflow-hidden [&_.supporter-username-premium]:max-md:[filter:none]">
                <UserBadge
                  username={supporter.displayName}
                  isSupporter
                  supporterBadge={supporter.supporterBadge}
                  supporterLifetime={supporter.supporterLifetime}
                  layout="stacked"
                  showSupporterBadge={false}
                  animateTitle={false}
                  usernameClassName="max-w-full truncate text-center text-[11px] sm:text-xs"
                  className="w-full max-w-full items-center"
                />
              </div>
            </button>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

export function HomeSupporterSection() {
  const t = useTranslations("home");
  const { profile } = useAuth();
  const reduceMotion = useReducedMotion();
  const [supporters, setSupporters] = useState<PlatformSupporterPublic[]>([]);
  const [total, setTotal] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [playerPreview, setPlayerPreview] = useState<ChatPlayerPreview | null>(
    null
  );
  const [playerCardOpen, setPlayerCardOpen] = useState(false);

  const isMember =
    profile?.is_supporter === true ||
    profile?.is_admin === true ||
    getSupporterDisplayTierFromProfile(profile) !== "none";

  const legendSupporters = supporters.filter(isLegendSupporter);
  const svipSupporters = supporters.filter(isSvipOnlySupporter);
  const vipSupporters = supporters.filter(
    (supporter) =>
      !isLegendSupporter(supporter) && !isSvipOnlySupporter(supporter)
  );

  const loadSupporters = useCallback((markHydrated: boolean) => {
    const controller = new AbortController();
    fetchWithTimeout(
      `/api/supporters?t=${Date.now()}`,
      {
        cache: "no-store",
        signal: controller.signal,
      },
      API_FETCH_TIMEOUT_MS
    )
      .then((response) => (response.ok ? response.json() : null))
      .then(
        (data: {
          supporters?: PlatformSupporterPublic[];
          total?: number;
        } | null) => {
          if (!data) return;
          setSupporters(data.supporters ?? []);
          setTotal(data.total ?? data.supporters?.length ?? 0);
        }
      )
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        // 失敗保留既有名單，避免牆面被清空
      })
      .finally(() => {
        if (markHydrated) setHydrated(true);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    let abortFetch: (() => void) | undefined;
    const cancelDefer = deferClientTask(() => {
      abortFetch = loadSupporters(true);
    });
    return () => {
      cancelDefer();
      abortFetch?.();
    };
  }, [
    loadSupporters,
    profile?.is_supporter,
    profile?.supporter_badge,
    profile?.supporter_lifetime,
    profile?.is_admin,
  ]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") {
        loadSupporters(false);
      }
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [loadSupporters]);

  const openSupporterProfile = useCallback(
    (supporter: PlatformSupporterPublic) => {
      setPlayerPreview(supporterToPlayerPreview(supporter));
      setPlayerCardOpen(true);
    },
    []
  );

  const perks = [
    t("supporterPerkBadge"),
    t("supporterPerkFx"),
    t("supporterPerkEcosystem"),
  ] as const;

  return (
    <section className="pb-10 sm:pb-14" aria-labelledby="home-supporter-heading">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 20 }}
        whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-24px" }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl border border-white/10 bg-zinc-900/60 shadow-2xl shadow-black/40 backdrop-blur-md"
      >
        <div className="relative overflow-hidden rounded-t-2xl border-b border-white/10 bg-gradient-to-br from-amber-500/10 via-transparent to-cyan-500/10 px-4 py-7 sm:px-8 sm:py-10">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(251,191,36,0.12),_transparent_55%)]"
            aria-hidden
          />

          <div className="relative mx-auto max-w-3xl text-center">
            <div className="mb-3 inline-flex items-center justify-center gap-2 text-sm font-medium text-amber-300">
              <HeartHandshake className="size-4 shrink-0" />
              {t("supporterWallTitle")}
            </div>
            <h2
              id="home-supporter-heading"
              className="text-balance text-xl font-bold tracking-tight text-white sm:text-3xl"
            >
              {t("supporterSectionTitle")}
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-pretty text-sm leading-relaxed text-zinc-400 sm:text-base">
              {t("supporterSectionDesc")}
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 sm:mt-5 sm:gap-2">
              {perks.map((label, index) => {
                const Icon = PERK_ICONS[index] ?? Sparkles;
                return (
                  <span
                    key={label}
                    className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-300 sm:px-3 sm:text-xs"
                  >
                    <Icon className="size-3.5 shrink-0 text-amber-300" />
                    <span className="truncate">{label}</span>
                  </span>
                );
              })}
            </div>

            <div className="mt-6 flex justify-center sm:mt-7">
              <Button
                size="lg"
                nativeButton={false}
                render={<Link href="/supporter" />}
                className={cn(
                  "h-11 w-full max-w-xs gap-2 rounded-xl px-6 text-sm font-semibold sm:w-auto sm:px-7",
                  "border-0 bg-gradient-to-r from-amber-500 via-orange-500 to-fuchsia-500 text-white",
                  "shadow-lg shadow-amber-500/20 hover:opacity-95 active:opacity-90"
                )}
              >
                <Sparkles className="size-4 shrink-0" />
                <span className="truncate">
                  {isMember
                    ? t("supporterSectionCtaMember")
                    : t("supporterSectionCta")}
                </span>
              </Button>
            </div>
          </div>
        </div>

        <div className="px-4 py-5 sm:px-8 sm:py-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-zinc-300">
              <Users className="size-4 shrink-0 text-cyan-400" />
              {t("supporterWallTitle")}
            </div>
            {!hydrated || total <= 0 ? null : (
              <p className="text-xs text-zinc-500">
                {t("supporterCount", { count: total })}
              </p>
            )}
          </div>

          {!hydrated ? (
            <ul className="grid grid-cols-2 gap-2 min-[400px]:gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <li
                  key={index}
                  className="h-28 animate-pulse rounded-xl bg-white/[0.04]"
                />
              ))}
            </ul>
          ) : supporters.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-10 text-center">
              <p className="text-sm text-zinc-400">{t("supporterWallEmpty")}</p>
            </div>
          ) : (
            <div className="space-y-7">
              <SupporterWallGroup
                title={t("supporterWallLegendTitle")}
                countLabel={t("supporterCount", {
                  count: legendSupporters.length,
                })}
                supporters={legendSupporters}
                accent="legend"
                reduceMotion={reduceMotion}
                onOpen={openSupporterProfile}
              />
              <SupporterWallGroup
                title={t("supporterWallSvipTitle")}
                countLabel={t("supporterCount", {
                  count: svipSupporters.length,
                })}
                supporters={svipSupporters}
                accent="svip"
                reduceMotion={reduceMotion}
                onOpen={openSupporterProfile}
              />
              <SupporterWallGroup
                title={t("supporterWallVipTitle")}
                countLabel={t("supporterCount", {
                  count: vipSupporters.length,
                })}
                supporters={vipSupporters}
                accent="vip"
                reduceMotion={reduceMotion}
                onOpen={openSupporterProfile}
              />
            </div>
          )}
        </div>
      </motion.div>

      <ChatPlayerCard
        player={playerPreview}
        open={playerCardOpen}
        onOpenChange={setPlayerCardOpen}
        canDirectMessage={Boolean(profile)}
        onDirectMessage={
          profile ? (target) => requestOpenPlayerDm(target) : undefined
        }
      />
    </section>
  );
}
