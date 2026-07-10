import type { ReactNode } from "react";
import { UserNav } from "@/components/auth/user-nav";
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
        "sticky top-0 border-b border-white/5 bg-zinc-950/70 backdrop-blur-xl",
        zIndex === "50" ? "z-50" : "z-40",
        className
      )}
    >
      <div
        className={cn(
          "mx-auto flex h-[72px] items-center gap-3 px-4 sm:gap-4 sm:px-6 lg:px-8",
          maxWidthClass[maxWidth],
          innerClassName
        )}
      >
        <SiteBrand />
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
          {children}
        </div>
        <div className="flex shrink-0 items-center pl-2 sm:pl-3">
          <UserNav />
        </div>
      </div>
    </header>
  );
}
