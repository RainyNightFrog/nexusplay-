"use client";

import { useLocale, useTranslations } from "next-intl";
import type { ProfileShowcaseTagPayload } from "@/lib/profile-showcase-tags";
import { formatCountryName } from "@/lib/request-geo";
import { cn } from "@/lib/utils";

const TAG_STYLE: Partial<
  Record<ProfileShowcaseTagPayload["id"], string>
> = {
  online_rank: "border-cyan-500/25 bg-cyan-500/10 text-cyan-200",
  play_time_rank: "border-violet-500/25 bg-violet-500/10 text-violet-200",
  donated_rank: "border-amber-500/25 bg-amber-500/10 text-amber-100",
  achievement_count: "border-emerald-500/25 bg-emerald-500/10 text-emerald-200",
  forum_posts: "border-sky-500/25 bg-sky-500/10 text-sky-200",
  supporter: "border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-200",
  follower_count: "border-pink-500/25 bg-pink-500/10 text-pink-200",
  published_games: "border-indigo-500/25 bg-indigo-500/10 text-indigo-200",
  online_status: "border-emerald-500/25 bg-emerald-500/10 text-emerald-200",
  country: "border-white/10 bg-white/5 text-zinc-300",
};

type ProfileShowcaseTagsProps = {
  tags: ProfileShowcaseTagPayload[];
  className?: string;
};

export function ProfileShowcaseTags({ tags, className }: ProfileShowcaseTagsProps) {
  const t = useTranslations("chat");
  const locale = useLocale();

  if (tags.length === 0) return null;

  function labelForTag(tag: ProfileShowcaseTagPayload) {
    switch (tag.id) {
      case "online_rank":
        return t("playerCardTagOnlineRank", { rank: tag.rank ?? 0 });
      case "play_time_rank":
        return t("playerCardTagPlayTimeRank", { rank: tag.rank ?? 0 });
      case "donated_rank":
        return t("playerCardTagDonatedRank", { rank: tag.rank ?? 0 });
      case "achievement_count":
        return t("playerCardTagAchievements", { count: tag.count ?? 0 });
      case "forum_posts":
        return t("playerCardTagForumPosts", { count: tag.count ?? 0 });
      case "supporter":
        return t("playerCardTagSupporter");
      case "follower_count":
        return t("playerCardTagFollowers", { count: tag.count ?? 0 });
      case "published_games":
        return t("playerCardTagPublishedGames", { count: tag.count ?? 0 });
      case "online_status":
        return t("playerCardTagOnlineNow");
      case "country":
        return tag.countryCode
          ? t("playerCardTagCountry", {
              country: formatCountryName(tag.countryCode, locale),
            })
          : null;
      default:
        return null;
    }
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-1.5 sm:justify-start",
        className
      )}
    >
      {tags.map((tag) => {
        const label = labelForTag(tag);
        if (!label) return null;

        return (
          <span
            key={tag.id}
            className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium sm:text-xs",
              TAG_STYLE[tag.id] ?? "border-white/10 bg-white/5 text-zinc-300"
            )}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}
