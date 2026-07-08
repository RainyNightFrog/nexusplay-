export type SiteSocialPlatform =
  | "x"
  | "github"
  | "discord"
  | "instagram"
  | "tiktok"
  | "youtube"
  | "facebook"
  | "bilibili"
  | "douyin";

export type SiteSocialLink = {
  id: SiteSocialPlatform;
  href: string;
};

/** Each platform's official homepage — used when no brand-specific URL is configured. */
export const PLATFORM_OFFICIAL_URLS: Record<SiteSocialPlatform, string> = {
  x: "https://x.com",
  github: "https://github.com",
  discord: "https://discord.com",
  instagram: "https://www.instagram.com",
  tiktok: "https://www.tiktok.com",
  youtube: "https://www.youtube.com",
  facebook: "https://www.facebook.com",
  bilibili: "https://www.bilibili.com",
  douyin: "https://www.douyin.com",
};

const SOCIAL_ENV_KEYS: Record<SiteSocialPlatform, string> = {
  x: "NEXT_PUBLIC_SOCIAL_X_URL",
  github: "NEXT_PUBLIC_SOCIAL_GITHUB_URL",
  discord: "NEXT_PUBLIC_SOCIAL_DISCORD_URL",
  instagram: "NEXT_PUBLIC_SOCIAL_INSTAGRAM_URL",
  tiktok: "NEXT_PUBLIC_SOCIAL_TIKTOK_URL",
  youtube: "NEXT_PUBLIC_SOCIAL_YOUTUBE_URL",
  facebook: "NEXT_PUBLIC_SOCIAL_FACEBOOK_URL",
  bilibili: "NEXT_PUBLIC_SOCIAL_BILIBILI_URL",
  douyin: "NEXT_PUBLIC_SOCIAL_DOUYIN_URL",
};

/** Display order — Douyin and TikTok are kept apart intentionally. */
export const SOCIAL_LINK_ORDER: SiteSocialPlatform[] = [
  "x",
  "github",
  "discord",
  "instagram",
  "tiktok",
  "youtube",
  "facebook",
  "bilibili",
  "douyin",
];

function resolveSocialUrl(
  envValue: string | undefined,
  fallback: string
): string {
  const trimmed = envValue?.trim();
  if (trimmed) return trimmed;
  return fallback;
}

/** Footer social links — defaults to each platform's official site; override via env for brand pages. */
export function getSiteSocialLinks(): SiteSocialLink[] {
  return SOCIAL_LINK_ORDER.map((id) => ({
    id,
    href: resolveSocialUrl(
      process.env[SOCIAL_ENV_KEYS[id]],
      PLATFORM_OFFICIAL_URLS[id]
    ),
  }));
}
