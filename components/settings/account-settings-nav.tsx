"use client";

import { useTranslations } from "next-intl";
import {
  Banknote,
  CreditCard,
  Database,
  Heart,
  KeyRound,
  Lock,
  MapPin,
  Palette,
  Shield,
  UserRound,
  Users,
  Wrench,
} from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  accountNavLinkClassName,
} from "@/components/settings/account-shell";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  labelKey: string;
  icon: typeof Palette;
  creatorOnly?: boolean;
  exact?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/settings", labelKey: "navGeneral", icon: Palette, exact: true },
  { href: "/settings/security", labelKey: "navSecurity", icon: Lock },
  { href: "/settings/privacy", labelKey: "navPrivacy", icon: Shield },
  { href: "/settings/payment", labelKey: "navPayment", icon: CreditCard },
  { href: "/settings/favorites", labelKey: "navFavorites", icon: Heart },
  { href: "/settings/following", labelKey: "navFollowing", icon: Users },
  { href: "/settings/billing", labelKey: "navBilling", icon: MapPin },
  {
    href: "/settings/creator",
    labelKey: "navCreator",
    icon: Wrench,
    creatorOnly: true,
  },
  {
    href: "/settings/api",
    labelKey: "navApiKeys",
    icon: KeyRound,
    creatorOnly: true,
  },
  {
    href: "/settings/payout",
    labelKey: "navPayout",
    icon: Banknote,
    creatorOnly: true,
  },
  { href: "/settings/data", labelKey: "navData", icon: Database },
];

export function AccountSettingsNav() {
  const t = useTranslations("accountSettings");
  const pathname = usePathname();
  const { isCreator } = useAuth();

  const items = NAV_ITEMS.filter((item) => !item.creatorOnly || isCreator);

  return (
    <nav className="space-y-1 text-center">
      <Link
        href="/profile"
        className={cn(
          accountNavLinkClassName,
          "mb-3",
          pathname === "/profile"
            ? "bg-violet-500/15 text-violet-200"
            : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
        )}
      >
        <UserRound className="size-4 shrink-0" />
        {t("navProfile")}
      </Link>

      {items.map(({ href, labelKey, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              accountNavLinkClassName,
              active
                ? "bg-cyan-500/15 text-cyan-200"
                : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {t(labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
