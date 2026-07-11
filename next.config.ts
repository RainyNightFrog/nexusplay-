import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";
import withNextIntl from "./next-intl.config";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "*.supabase.co";

function buildContentSecurityPolicy() {
  const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
    : "https://*.supabase.co";

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https: https://images.unsplash.com https://api.dicebear.com https://lh3.googleusercontent.com ${supabaseOrigin}`,
    `connect-src 'self' ${supabaseOrigin} wss://${supabaseHostname} https://api.stripe.com https://www.google-analytics.com https://region1.google-analytics.com`,
    "font-src 'self' data:",
    "object-src 'none'",
    `frame-src 'self' ${supabaseOrigin} https://js.stripe.com https://hooks.stripe.com`,
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
  async headers() {
    return [
      {
        source: "/(.*)",
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
    ],
  },
};

export default withNextIntl(nextConfig);
