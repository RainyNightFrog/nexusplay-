import { useTranslations } from "next-intl";
import { SiteSocialLinks } from "@/components/layout/site-social-links";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function SiteFooter({ className }: { className?: string }) {
  const t = useTranslations("legal");
  const th = useTranslations("home");

  const links = [
    { href: "/legal#terms", label: t("navTerms") },
    { href: "/legal#payments", label: t("navPayments") },
    { href: "/legal#privacy", label: t("navPrivacy") },
    { href: "/legal#disclaimer", label: t("navDisclaimer") },
    { href: "/community/rules", label: th("communityRules") },
    { href: "/feeds", label: th("feedsHub") },
    { href: "/feed.xml", label: th("rssFeed"), external: true },
    { href: "/feed.atom.xml", label: th("atomFeed"), external: true },
    { href: "/feed/forum.xml", label: th("rssForum"), external: true },
    { href: "/feeds.opml", label: th("opmlFeed"), external: true },
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
              {"external" in link && link.external ? (
                <a
                  href={link.href}
                  className="text-zinc-500 transition-colors hover:text-violet-400"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  href={link.href}
                  className="text-zinc-500 transition-colors hover:text-violet-400"
                >
                  {link.label}
                </Link>
              )}
            </span>
          ))}
        </nav>
        <p className="mt-4 text-xs text-zinc-600">{th("footer")}</p>
        <p className="mt-2 text-[11px] leading-relaxed text-zinc-700">
          {t("footerNote")}
        </p>
      </div>
    </footer>
  );
}
