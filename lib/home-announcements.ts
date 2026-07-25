export type HomeAnnouncementAccent = "cyan" | "violet" | "amber" | "fuchsia";

export type HomeAnnouncement = {
  id: string;
  messageKey: string;
  href?: string;
  external?: boolean;
  accent?: HomeAnnouncementAccent;
};

/** 主頁跑馬燈公告池：每次進站會隨機抽出一部分，讓資訊不重複 */
export const HOME_ANNOUNCEMENTS: HomeAnnouncement[] = [
  {
    id: "launch",
    messageKey: "announcements.launch",
    accent: "cyan",
  },
  {
    id: "tipHowItWorks",
    messageKey: "announcements.tipHowItWorks",
    href: "#game-grid",
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
  {
    id: "tipSearch",
    messageKey: "announcements.tipSearch",
    accent: "cyan",
  },
  {
    id: "tipFilter",
    messageKey: "announcements.tipFilter",
    href: "#game-grid",
    accent: "violet",
  },
  {
    id: "tipBrowse",
    messageKey: "announcements.tipBrowse",
    href: "#game-grid",
    accent: "amber",
  },
  {
    id: "tipFree",
    messageKey: "announcements.tipFree",
    href: "#game-grid",
    accent: "cyan",
  },
  {
    id: "tipArcade",
    messageKey: "announcements.tipArcade",
    href: "/game/neon-snake-extreme",
    accent: "fuchsia",
  },
  {
    id: "tipSupport",
    messageKey: "announcements.tipSupport",
    accent: "amber",
  },
  {
    id: "tipLogin",
    messageKey: "announcements.tipLogin",
    href: "/auth",
    accent: "violet",
  },
  {
    id: "playVoidGacha",
    messageKey: "announcements.playVoidGacha",
    href: "/game/void-gacha",
    accent: "violet",
  },
  {
    id: "playCoreDefense",
    messageKey: "announcements.playCoreDefense",
    href: "/game/core-defense",
    accent: "amber",
  },
  {
    id: "playCyberFortune",
    messageKey: "announcements.playCyberFortune",
    href: "/game/cyber-fortune",
    accent: "cyan",
  },
  {
    id: "playNeonAbyss",
    messageKey: "announcements.playNeonAbyss",
    href: "/game/neon-abyss-runner",
    accent: "cyan",
  },
  {
    id: "playVoidRelay",
    messageKey: "announcements.playVoidRelay",
    href: "/game/void-relay",
    accent: "violet",
  },
  {
    id: "playPulseProtocol",
    messageKey: "announcements.playPulseProtocol",
    href: "/game/pulse-protocol",
    accent: "fuchsia",
  },
  {
    id: "playSignalBreach",
    messageKey: "announcements.playSignalBreach",
    href: "/game/signal-breach",
    accent: "cyan",
  },
  {
    id: "playOrbitalSalvage",
    messageKey: "announcements.playOrbitalSalvage",
    href: "/game/orbital-salvage",
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
