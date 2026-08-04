import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";
import withNextIntl from "./next-intl.config";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "*.supabase.co";

function resolvePlayOriginForCsp() {
  const configured = process.env.NEXT_PUBLIC_PLAY_ORIGIN?.trim().replace(
    /\/$/,
    ""
  );
  if (configured) return configured;
  const root =
    process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim().toLowerCase() ||
    "rainynightfrog.com";
  if (process.env.NODE_ENV === "development") {
    return "http://play.localhost:3000";
  }
  return `https://play.${root}`;
}

function buildContentSecurityPolicy() {
  const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
    : "https://*.supabase.co";
  const playOrigin = resolvePlayOriginForCsp();

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com https://cdn.jsdelivr.net`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https: https://images.unsplash.com https://api.dicebear.com https://lh3.googleusercontent.com ${supabaseOrigin}`,
    `connect-src 'self' ${supabaseOrigin} wss://${supabaseHostname} https://api.stripe.com https://www.google-analytics.com https://region1.google-analytics.com https://void-gacha.com https://*.void-gacha.com`,
    "font-src 'self' data:",
    "object-src 'none'",
    `frame-src 'self' ${playOrigin} ${supabaseOrigin} https://js.stripe.com https://hooks.stripe.com`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ];

  return directives.join("; ");
}

const nextConfig: NextConfig = {
  serverExternalPackages: ["web-push", "jszip"],
  experimental: {
    webpackMemoryOptimizations: true,
  },
  turbopack: {
    root: projectRoot,
  },
  async rewrites() {
    // 舊資料庫／快取仍指向 .png 時，導向已壓縮的 .webp
    return [
      {
        source: "/covers/:name.png",
        destination: "/covers/:name.webp",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/sdk/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=60, must-revalidate",
          },
        ],
      },
      {
        source: "/games/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=60, must-revalidate",
          },
          // iframe 內街機頁勿套主站完整 CSP，避免引擎腳本／WebGL 被擋成黑屏
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      {
        source: "/demos/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=60, must-revalidate",
          },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      {
        source: "/covers/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=86400",
          },
        ],
      },
      // embed 必須可被主站跨子網域 iframe；不設 X-Frame-Options
      {
        source: "/api/games/:id/embed/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        // 排除街機／demo／sdk／embed，避免完整 CSP 套到 iframe 遊戲文件
        source:
          "/((?!api/games/.*/embed|games/|demos/|sdk/|_next/static).*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: buildContentSecurityPolicy(),
          },
          ...(process.env.NODE_ENV === "production"
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]
            : []),
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: supabaseHostname,
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
        pathname: "/9.x/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "static-cdn.jtvnw.net",
        pathname: "/**",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
