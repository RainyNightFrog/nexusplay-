"use client";

import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { MobileNavMenu } from "@/components/layout/mobile-nav-menu";
import { LeaderboardNavButton } from "@/components/LeaderboardModal";
import { CreatorDashboardLink } from "@/components/auth/user-nav";
import { cn } from "@/lib/utils";

type NavActionsProps = {
  className?: string;
};

export function NavActions({ className }: NavActionsProps) {
  return (
    <div className={cn("flex items-center gap-2 sm:gap-3", className)}>
      {/* 桌面導覽；hidden 仍掛載，供手機選單用事件開啟排行榜 */}
      <div className="hidden items-center gap-2 sm:gap-3 md:flex">
        <LeaderboardNavButton />
        <LanguageSwitcher />
        <CreatorDashboardLink />
      </div>
      <MobileNavMenu showExploreLinks={false} />
    </div>
  );
}
