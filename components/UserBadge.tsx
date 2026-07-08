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
  layout?: "inline" | "stacked" | "compact";
  showBrackets?: boolean;
  animateTitle?: boolean;
  maxTitleWidth?: string;
};

export function UserBadge({
  username,
  title,
  className,
  usernameClassName,
  titleClassName,
  layout = "inline",
  showBrackets = true,
  animateTitle = true,
  maxTitleWidth = "max-w-[5.5rem]",
}: UserBadgeProps) {
  const titleLabel = title
    ? showBrackets
      ? `「${title.name}」`
      : title.name
    : null;

  const titleClass = title
    ? cn(
        "font-semibold tracking-wide",
        getTitleDisplayClass(title.css_class, title.rarity_tier, {
          animate: animateTitle,
        }),
        titleClassName
      )
    : null;

  if (layout === "stacked") {
    return (
      <span className={cn("inline-flex flex-col items-center gap-0.5", className)}>
        <span className={cn("font-medium", usernameClassName)}>{username}</span>
        {title && titleLabel && (
          <span className={cn("inline-block text-[10px]", titleClass)}>{titleLabel}</span>
        )}
      </span>
    );
  }

  if (layout === "compact") {
    return (
      <span
        className={cn("inline-flex min-w-0 max-w-full items-center gap-x-1", className)}
      >
        <span className={cn("min-w-0 truncate font-medium", usernameClassName)}>
          {username}
        </span>
        {title && titleLabel && (
          <span
            className={cn("shrink-0 truncate text-[9px] sm:text-[10px]", maxTitleWidth, titleClass)}
            title={title.name}
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
      {title && titleLabel && (
        <span className={cn("inline-block text-[11px] sm:text-xs", titleClass)}>{titleLabel}</span>
      )}
    </span>
  );
}
