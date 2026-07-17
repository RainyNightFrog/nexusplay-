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
          className={cn("size-11 sm:size-14 md:size-16", brandImageClass)}
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
          "h-10 w-auto sm:h-14 md:h-16 lg:h-[70px]",
          brandImageClass
        )}
        priority
      />
    </Link>
  );
}
