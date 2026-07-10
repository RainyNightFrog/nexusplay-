import { useTranslations } from "next-intl";
import { ChevronDown, Rss } from "lucide-react";
import { SiteSocialLinks } from "@/components/layout/site-social-links";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const subscriptionFeeds = [
  { href: "/feed.xml", labelKey: "rssFeed" as const },
  { href: "/feed.atom.xml", labelKey: "atomFeed" as const },
  { href: "/feed/forum.xml", labelKey: "rssForum" as const },
  { href: "/feeds.opml", labelKey: "opmlFeed" as const },
] as const;

export function SiteFooter({ className }: { className?: string }) {
  const t = useTranslations("legal");
  const ta = useTranslations("about");
  const th = useTranslations("home");

  const links = [
    { href: "/about", label: ta("navAbout") },
    { href: "/legal#terms", label: t("navTerms") },
    { href: "/legal#payments", label: t("navPayments") },
    { href: "/legal#privacy", label: t("navPrivacy") },
    { href: "/legal#disclaimer", label: t("navDisclaimer") },
    { href: "/community/rules", label: th("communityRules") },
  ] as const;

  return (
    <footer
      className={cn(
        "relative mt-auto border-t border-white/5 py-8",
        className
      )}
    >
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <SiteSocialLinks
          navLabel={th("socialNavLabel")}
          labels={{
            x: th("socialX"),
            github: th("socialGithub"),
            discord: th("socialDiscord"),
            instagram: th("socialInstagram"),
            tiktok: th("socialTiktok"),
            youtube: th("socialYoutube"),
            facebook: th("socialFacebook"),
            bilibili: th("socialBilibili"),
            douyin: th("socialDouyin"),
          }}
          className="mb-6"
        />
        <div
          className="mx-auto mb-6 h-px max-w-xs bg-gradient-to-r from-transparent via-white/10 to-transparent"
          aria-hidden
        />
        <nav
          aria-label={t("footerNavLabel")}
          className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs"
        >
          {links.map((link, index) => (
            <span key={link.href} className="inline-flex items-center gap-3">
              {index > 0 && (
                <span className="text-zinc-700" aria-hidden>
                  ·
                </span>
              )}
              <Link
                href={link.href}
                className="text-zinc-500 transition-colors hover:text-violet-400"
              >
                {link.label}
              </Link>
            </span>
          ))}
        </nav>

        <details className="group mx-auto mt-4 max-w-md text-center">
          <summary className="inline-flex cursor-pointer list-none items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-zinc-500 transition-colors hover:bg-white/5 hover:text-violet-400 [&::-webkit-details-marker]:hidden">
            <Rss className="size-3.5 shrink-0" aria-hidden />
            <span>{th("feedsHub")}</span>
            <ChevronDown
              className="size-3.5 shrink-0 transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs">
            {subscriptionFeeds.map((feed, index) => (
              <span key={feed.href} className="inline-flex items-center gap-3">
                {index > 0 && (
                  <span className="text-zinc-700" aria-hidden>
                    ·
                  </span>
                )}
                <a
                  href={feed.href}
                  className="text-zinc-500 transition-colors hover:text-violet-400"
                >
                  {th(feed.labelKey)}
                </a>
              </span>
            ))}
            <span className="inline-flex items-center gap-3">
              <span className="text-zinc-700" aria-hidden>
                ·
              </span>
              <Link
                href="/feeds"
                className="text-zinc-500 transition-colors hover:text-violet-400"
              >
                {th("feedsHubAll")}
              </Link>
            </span>
          </div>
        </details>

        <p className="mt-4 text-xs text-zinc-600">{th("footer")}</p>
        <p className="mt-2 text-[11px] leading-relaxed text-zinc-700">
          {t("footerNote")}
        </p>
      </div>
    </footer>
  );
}
