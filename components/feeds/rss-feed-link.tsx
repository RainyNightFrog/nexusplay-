"use client";

import { Rss } from "lucide-react";
import { cn } from "@/lib/utils";

type RssFeedLinkProps = {
  href: string;
  label: string;
  className?: string;
};

export function RssFeedLink({ href, label, className }: RssFeedLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1.5 text-sm text-amber-400/90 transition-colors hover:text-amber-300",
        className
      )}
    >
      <Rss className="size-3.5" />
      {label}
    </a>
  );
}
