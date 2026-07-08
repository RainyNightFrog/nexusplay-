export type HomeAnnouncementAccent = "cyan" | "violet" | "amber" | "fuchsia";

export type HomeAnnouncement = {
  id: string;
  messageKey: string;
  href?: string;
  external?: boolean;
  accent?: HomeAnnouncementAccent;
};

export const HOME_ANNOUNCEMENTS: HomeAnnouncement[] = [
  {
    id: "launch",
    messageKey: "announcements.launch",
    accent: "cyan",
  },
  {
    id: "upload",
    messageKey: "announcements.upload",
    href: "/dashboard/upload",
    accent: "violet",
  },
  {
    id: "community",
    messageKey: "announcements.community",
    href: "/community",
    accent: "fuchsia",
  },
  {
    id: "feeds",
    messageKey: "announcements.feeds",
    href: "/feeds",
    accent: "cyan",
  },
  {
    id: "featured",
    messageKey: "announcements.featured",
    href: "#featured-games",
    accent: "amber",
  },
  {
    id: "multilingual",
    messageKey: "announcements.multilingual",
    accent: "violet",
  },
  {
    id: "leaderboard",
    messageKey: "announcements.leaderboard",
    accent: "amber",
  },
  {
    id: "achievements",
    messageKey: "announcements.achievements",
    href: "/profile",
    accent: "fuchsia",
  },
  {
    id: "forumRules",
    messageKey: "announcements.forumRules",
    href: "/community/rules",
    accent: "cyan",
  },
  {
    id: "followCreators",
    messageKey: "announcements.followCreators",
    href: "/community",
    accent: "violet",
  },
  {
    id: "zeroDownload",
    messageKey: "announcements.zeroDownload",
    accent: "cyan",
  },
  {
    id: "starGames",
    messageKey: "announcements.starGames",
    href: "#featured-games",
    accent: "amber",
  },
];

export const HOME_ANNOUNCEMENT_ACCENT_CLASS: Record<
  HomeAnnouncementAccent,
  string
> = {
  cyan:
    "bg-gradient-to-r from-cyan-200 via-sky-300 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_14px_rgba(34,211,238,0.45)]",
  violet:
    "bg-gradient-to-r from-violet-200 via-purple-300 to-fuchsia-300 bg-clip-text text-transparent drop-shadow-[0_0_14px_rgba(167,139,250,0.45)]",
  amber:
    "bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-300 bg-clip-text text-transparent drop-shadow-[0_0_14px_rgba(251,191,36,0.4)]",
  fuchsia:
    "bg-gradient-to-r from-fuchsia-200 via-pink-300 to-rose-300 bg-clip-text text-transparent drop-shadow-[0_0_14px_rgba(232,121,249,0.45)]",
};
