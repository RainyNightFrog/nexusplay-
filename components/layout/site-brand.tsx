"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type SiteBrandProps = {
  className?: string;
  showLabel?: boolean;
};

const brandImageClass = cn(
  "object-contain",
  "mix-blend-screen",
  "drop-shadow-[0_0_14px_rgba(34,211,238,0.55)]",
  "drop-shadow-[0_0_24px_rgba(167,139,250,0.35)]"
);

/** 手機頂欄精簡；md 以上還原原本大 Logo */
export function SiteBrand({ className, showLabel = true }: SiteBrandProps) {
  if (!showLabel) {
    return (
      <Link
        href="/"
        aria-label="RainyNightFrog"
        className={cn(
          "flex shrink-0 items-center rounded-lg outline-none",
          "transition-transform hover:scale-[1.02] active:scale-[0.98]",
          "focus-visible:ring-2 focus-visible:ring-cyan-500/40",
          className
        )}
      >
        <Image
          src="/brand/rainynightfrog-icon-256.png"
          alt="RainyNightFrog"
          width={72}
          height={72}
          className={cn(
            "size-8 md:size-14 lg:size-16",
            brandImageClass
          )}
          priority
        />
      </Link>
    );
  }

  return (
    <Link
      href="/"
      aria-label="RainyNightFrog"
      className={cn(
        "flex shrink-0 items-center rounded-lg outline-none",
        "transition-transform hover:scale-[1.02] active:scale-[0.98]",
        "focus-visible:ring-2 focus-visible:ring-cyan-500/40",
        className
      )}
    >
      <Image
        src="/brand/rainynightfrog-logo.png"
        alt="RainyNightFrog"
        width={420}
        height={178}
        className={cn(
          "h-8 w-auto md:h-14 lg:h-16 xl:h-[70px]",
          brandImageClass
        )}
        priority
      />
    </Link>
  );
}
