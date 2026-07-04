"use client";

import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { CreatorDashboardLink, UserNav } from "@/components/auth/user-nav";
import { cn } from "@/lib/utils";

type NavActionsProps = {
  className?: string;
};

export function NavActions({ className }: NavActionsProps) {
  return (
    <div className={cn("flex items-center gap-2 sm:gap-3", className)}>
      <LanguageSwitcher />
      <CreatorDashboardLink />
      <UserNav />
    </div>
  );
}
