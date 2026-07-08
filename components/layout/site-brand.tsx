"use client";

import { Gamepad2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type SiteBrandProps = {
  className?: string;
  showLabel?: boolean;
};

export function SiteBrand({ className, showLabel = true }: SiteBrandProps) {
  return (
    <Link
      href="/"
      aria-label="RainyNightFrog"
      className={cn(
        "flex shrink-0 items-center gap-2.5 rounded-lg outline-none",
        "transition-transform hover:scale-[1.03] active:scale-[0.98]",
        "focus-visible:ring-2 focus-visible:ring-cyan-500/40",
        className
      )}
    >
      <div className="relative flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-violet-600 shadow-lg shadow-cyan-500/25">
        <Gamepad2 className="size-5 text-white" />
      </div>
      {showLabel && (
        <span className="hidden bg-gradient-to-r from-white via-cyan-100 to-violet-200 bg-clip-text text-lg font-bold tracking-tight text-transparent sm:block">
          RainyNightFrog
        </span>
      )}
    </Link>
  );
}
