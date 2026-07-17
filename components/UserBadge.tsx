"use client";

import type { EquippedTitle } from "@/lib/titles";
import { getTitleDisplayClass } from "@/lib/titles";
import {
  getSupporterDisplayTier,
  supporterUsernameClassByTier,
} from "@/lib/supporter-tier";
import { adminRoleRainbowTextClass } from "@/lib/admin-display-role";
import { SupporterBadge } from "@/components/supporter/supporter-badge";
import { cn } from "@/lib/utils";

type UserBadgeProps = {
  username: string;
  title?: EquippedTitle | null;
  isSupporter?: boolean;
  supporterBadge?: string | null;
  className?: string;
  usernameClassName?: string;
  titleClassName?: string;
  /** AP 商店名字顏色 class */
  nameColorClass?: string | null;
  layout?: "inline" | "stacked" | "compact";
  animateTitle?: boolean;
  maxTitleWidth?: string;
  /** 頭像已有 VIP/SVIP 時可關閉名字旁的徽章 */
  showSupporterBadge?: boolean;
  /** 未佩戴稱號時顯示的角色標籤（例如「玩家」「創作者」） */
  fallbackRoleLabel?: string | null;
  /** 角色標籤使用 SVIP 同款炫彩漸層 */
  fallbackRoleRainbow?: boolean;
};

function isRainyNightFrogTitleClass(cssClass: string | null | undefined) {
  return (cssClass ?? "").includes("title-rainynightfrog");
}

export function UserBadge({
  username,
  title,
  isSupporter = false,
  supporterBadge = null,
  className,
  usernameClassName,
  titleClassName,
  nameColorClass = null,
  layout = "inline",
  animateTitle = true,
  maxTitleWidth = "max-w-[5.5rem]",
  showSupporterBadge = true,
  fallbackRoleLabel = null,
  fallbackRoleRainbow = false,
}: UserBadgeProps) {
  const supporterTier = getSupporterDisplayTier(isSupporter, supporterBadge);
  const isSupporterDisplay = supporterTier !== "none";

  const titleLabel = title?.name ?? null;
  const secondaryLabel = titleLabel ?? fallbackRoleLabel ?? null;
  const isRoleFallback = !titleLabel && Boolean(fallbackRoleLabel);
  const wrapRnfFrame = Boolean(
    title && isRainyNightFrogTitleClass(title.css_class)
  );

  const titleClass = title
    ? cn(
        "font-semibold tracking-wide",
        getTitleDisplayClass(title.css_class, title.rarity_tier, {
          animate: animateTitle,
        }),
        titleClassName
      )
    : isRoleFallback
      ? cn(
          fallbackRoleRainbow
            ? adminRoleRainbowTextClass
            : "font-medium text-zinc-500",
          titleClassName
        )
      : null;

  const nameClass = cn(
    "font-medium",
    isSupporterDisplay && supporterUsernameClassByTier[supporterTier],
    !isSupporterDisplay && nameColorClass,
    usernameClassName,
    isSupporterDisplay &&
      supporterTier === "premium" &&
      "!bg-clip-text !text-transparent hover:!text-transparent",
    isSupporterDisplay &&
      supporterTier === "basic" &&
      "!text-amber-300 hover:!text-amber-200"
  );

  const supporterIcon =
    showSupporterBadge && supporterTier !== "none" ? (
      <SupporterBadge
        isSupporter={isSupporter}
        supporterBadge={supporterBadge}
        tier={supporterTier}
      />
    ) : null;

  function renderTitle(extraClassName?: string) {
    if (!secondaryLabel || !titleClass) return null;
    const inner = (
      <span className={cn(titleClass, extraClassName)} title={secondaryLabel}>
        {secondaryLabel}
      </span>
    );
    if (!wrapRnfFrame) return inner;
    return <span className="title-rainynightfrog-frame">{inner}</span>;
  }

  if (layout === "stacked") {
    return (
      <span className={cn("inline-flex flex-col items-center gap-0.5", className)}>
        <span className="inline-flex items-center gap-1">
          <span className={nameClass}>{username}</span>
          {supporterIcon}
        </span>
        {renderTitle("inline-block text-[10px]")}
      </span>
    );
  }

  if (layout === "compact") {
    return (
      <span
        className={cn("inline-flex min-w-0 max-w-full items-center gap-x-1", className)}
      >
        <span className={cn("min-w-0 truncate", nameClass)}>{username}</span>
        {supporterIcon}
        {renderTitle(
          cn("shrink-0 truncate text-[9px] sm:text-[10px]", maxTitleWidth)
        )}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5",
        className
      )}
    >
      <span className={nameClass}>{username}</span>
      {supporterIcon}
      {renderTitle("inline-block text-[11px] sm:text-xs")}
    </span>
  );
}
