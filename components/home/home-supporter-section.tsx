"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import {
  HeartHandshake,
  Loader2,
  Palette,
  Sparkles,
  Users,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { UserBadge } from "@/components/UserBadge";
import { SupporterAvatarInsignia } from "@/components/supporter/supporter-avatar-insignia";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { getInitials } from "@/lib/auth";
import { deferClientTask } from "@/lib/defer-client";
import type { PlatformSupporterPublic } from "@/lib/platform-supporters-service";
import {
  getSupporterDisplayTierFromProfile,
  supporterAvatarRingClassByTier,
} from "@/lib/supporter-tier";
import { cn } from "@/lib/utils";

const PERK_ICONS = [Sparkles, Palette, HeartHandshake] as const;

export function HomeSupporterSection() {
  const t = useTranslations("home");
  const { profile } = useAuth();
  const reduceMotion = useReducedMotion();
  const [supporters, setSupporters] = useState<PlatformSupporterPublic[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const isMember =
    profile?.is_supporter === true ||
    getSupporterDisplayTierFromProfile(profile) !== "none";

  useEffect(() => {
    return deferClientTask(() => {
      fetch("/api/supporters")
        .then((response) => (response.ok ? response.json() : null))
        .then(
          (data: {
            supporters?: PlatformSupporterPublic[];
            total?: number;
          } | null) => {
            setSupporters(data?.supporters ?? []);
            setTotal(data?.total ?? data?.supporters?.length ?? 0);
          }
        )
        .catch(() => {
          setSupporters([]);
          setTotal(0);
        })
        .finally(() => setLoading(false));
    });
  }, []);

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
            {!loading && total > 0 ? (
              <p className="text-xs text-zinc-500">
                {t("supporterCount", { count: total })}
              </p>
            ) : null}
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-zinc-500">
              <Loader2 className="size-4 animate-spin" />
              {t("supporterWallLoading")}
            </div>
          ) : supporters.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-10 text-center">
              <p className="text-sm text-zinc-400">{t("supporterWallEmpty")}</p>
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-2 min-[400px]:gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {supporters.map((supporter, index) => (
                <motion.li
                  key={supporter.id}
                  initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                  whileInView={
                    reduceMotion ? undefined : { opacity: 1, y: 0 }
                  }
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.35,
                    delay: reduceMotion
                      ? 0
                      : Math.min(index * 0.03, 0.36),
                  }}
                  className="flex min-w-0 flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-2 py-3 sm:gap-2 sm:px-2.5"
                >
                  {/* pt 預留 VIP/SVIP 角標空間，避免被裁切或壓到隔壁列 */}
                  <div className="relative pt-5">
                    <div
                      className={cn(
                        "relative size-11 overflow-hidden rounded-full sm:size-12",
                        supporter.tier !== "none" &&
                          supporterAvatarRingClassByTier[supporter.tier]
                      )}
                    >
                      {supporter.avatarUrl ? (
                        <Image
                          src={supporter.avatarUrl}
                          alt={supporter.displayName}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-500/30 to-violet-600/35 text-sm font-bold text-white">
                          {getInitials(supporter.displayName)}
                        </div>
                      )}
                    </div>
                    <SupporterAvatarInsignia
                      isSupporter
                      supporterBadge={supporter.supporterBadge}
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
                      usernameClassName="max-w-full truncate text-center text-[11px] sm:text-xs"
                      className="w-full max-w-full items-center"
                    />
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </div>
      </motion.div>
    </section>
  );
}
