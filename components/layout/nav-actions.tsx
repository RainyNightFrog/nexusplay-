"use client";

import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { MobileSearchButton } from "@/components/layout/mobile-search-button";
import { LeaderboardNavButton } from "@/components/LeaderboardModal";
import { CreatorDashboardLink, UserNav } from "@/components/auth/user-nav";
import { cn } from "@/lib/utils";

type NavActionsProps = {
  className?: string;
};

export function NavActions({ className }: NavActionsProps) {
  return (
    <div className={cn("flex items-center gap-2 sm:gap-3", className)}>
      <MobileSearchButton />
      <LeaderboardNavButton />
      <LanguageSwitcher />
      <CreatorDashboardLink />
      <UserNav />
    </div>
  );
}
