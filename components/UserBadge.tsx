"use client";

import type { EquippedTitle } from "@/lib/titles";
import { getTitleDisplayClass } from "@/lib/titles";
import { cn } from "@/lib/utils";

type UserBadgeProps = {
  username: string;
  title?: EquippedTitle | null;
  className?: string;
  usernameClassName?: string;
  titleClassName?: string;
  layout?: "inline" | "stacked";
  showBrackets?: boolean;
};

export function UserBadge({
  username,
  title,
  className,
  usernameClassName,
  titleClassName,
  layout = "inline",
  showBrackets = true,
}: UserBadgeProps) {
  const titleLabel = title
    ? showBrackets
      ? `「${title.name}」`
      : title.name
    : null;

  if (layout === "stacked") {
    return (
      <span className={cn("inline-flex flex-col items-center gap-0.5", className)}>
        <span className={cn("font-medium", usernameClassName)}>{username}</span>
        {title && (
          <span
            className={cn(
              "text-[10px] font-semibold tracking-wide",
              getTitleDisplayClass(title.css_class, title.rarity_tier),
              titleClassName
            )}
          >
            {titleLabel}
          </span>
        )}
      </span>
    );
  }

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5", className)}>
      <span className={cn("font-medium", usernameClassName)}>{username}</span>
      {title && (
        <span
          className={cn(
            "text-[11px] font-semibold tracking-wide sm:text-xs",
            getTitleDisplayClass(title.css_class, title.rarity_tier),
            titleClassName
          )}
        >
          {titleLabel}
        </span>
      )}
    </span>
  );
}
