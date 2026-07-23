import type { ReactNode } from "react";
import { UserNav } from "@/components/auth/user-nav";
import { ApStoreNavButton } from "@/components/ap-store/ApStoreNavButton";
import { DailyQuestsNavButton } from "@/components/quests/DailyQuestsNavButton";
import { SiteBrand } from "@/components/layout/site-brand";
import { cn } from "@/lib/utils";

type SiteHeaderProps = {
  children?: ReactNode;
  maxWidth?: "7xl" | "5xl" | "3xl" | "full";
  zIndex?: "40" | "50";
  className?: string;
  innerClassName?: string;
};

const maxWidthClass = {
  "7xl": "max-w-7xl",
  "5xl": "max-w-5xl",
  "3xl": "max-w-3xl",
  full: "max-w-full",
} as const;

export function SiteHeader({
  children,
  maxWidth = "7xl",
  zIndex = "40",
  className,
  innerClassName,
}: SiteHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl md:bg-zinc-950/70",
        zIndex === "50" ? "z-50" : "z-40",
        className
      )}
    >
      <div
        className={cn(
          "mx-auto flex h-14 items-center gap-2 px-3",
          "md:h-[72px] md:gap-4 md:px-6 lg:px-8",
          maxWidthClass[maxWidth],
          innerClassName
        )}
      >
        <SiteBrand />
        <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-4">
          {children}
        </div>
        <div className="flex shrink-0 items-center gap-1.5 pl-1 md:gap-2 md:pl-3">
          <ApStoreNavButton />
          <DailyQuestsNavButton />
          <UserNav />
        </div>
      </div>
    </header>
  );
}
