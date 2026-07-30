"use client";

import { useMemo } from "react";
import { useLocale } from "next-intl";
import type { EquippedTitle } from "@/lib/titles";
import { getTitleDisplayClass } from "@/lib/titles";
import { localizeTitleName } from "@/lib/title-i18n";
import {
  getSupporterDisplayTier,
  isSvipLikeTier,
  supporterUsernameClassByTier,
} from "@/lib/supporter-tier";
import { useAppSettings } from "@/components/settings/app-settings-provider";
import { adminRoleRainbowTextClass } from "@/lib/admin-display-role";
import { SupporterBadge } from "@/components/supporter/supporter-badge";
import { cn } from "@/lib/utils";

type UserBadgeProps = {
  username: string;
  title?: EquippedTitle | null;
  isSupporter?: boolean;
  supporterBadge?: string | null;
  /** 永久傳說支持者：特效與 SVIP（premium）相同 */
  supporterLifetime?: boolean;
  className?: string;
  usernameClassName?: string;
  titleClassName?: string;
  /** 名字顏色 CSS class */
  nameColorClass?: string | null;
  layout?: "inline" | "stacked" | "compact";
  animateTitle?: boolean;
  maxTitleWidth?: string;
  /** 頭像已有 VIP/SVIP 時可關閉名字旁的徽章 */
  showSupporterBadge?: boolean;
  /**
   * 優先顯示 AP 名字色（略過 VIP／SVIP 炫彩字）。
   * AP 商店預覽需要看得到名字色，不被支持者特效蓋掉。
   */
  preferNameColor?: boolean;
  /** 未佩戴稱號時顯示的角色標籤（例如「玩家」「創作者」） */
  fallbackRoleLabel?: string | null;
  /** 角色標籤使用 SVIP 同款炫彩漸層 */
  fallbackRoleRainbow?: boolean;
};

function isRainyNightFrogTitleClass(cssClass: string | null | undefined) {
  return (cssClass ?? "").includes("title-rainynightfrog");
}

/** 有 AP 名字色時，去掉會蓋掉 color／漸層字的 Tailwind 文字色 class */
function stripConflictingTextColorClasses(className?: string) {
  if (!className) return className;
  return className
    .split(/\s+/)
    .filter((token) => {
      if (!token) return false;
      // 保留對齊／換行／省略
      if (
        /(?:^|:)text-(?:left|center|right|justify|start|end|wrap|nowrap|balance|pretty|ellipsis|clip)\b/.test(
          token
        )
      ) {
        return true;
      }
      // 保留字級：text-sm、text-lg、text-[10px] 等
      if (
        /(?:^|:)text-(?:xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)\b/.test(
          token
        ) ||
        /(?:^|:)text-\[[^\]]+\]/.test(token)
      ) {
        return true;
      }
      // 去掉純色／語意色（含 hover:text-*）
      if (/(?:^|:)text-/.test(token)) return false;
      return true;
    })
    .join(" ");
}

export function UserBadge({
  username,
  title,
  isSupporter = false,
  supporterBadge = null,
  supporterLifetime = false,
  className,
  usernameClassName,
  titleClassName,
  nameColorClass = null,
  layout = "inline",
  maxTitleWidth = "max-w-[5.5rem]",
  showSupporterBadge = true,
  preferNameColor = false,
  fallbackRoleLabel = null,
  fallbackRoleRainbow = false,
}: UserBadgeProps) {
  const locale = useLocale();
  const { settings, ready } = useAppSettings();
  const supporterTier = getSupporterDisplayTier(
    isSupporter,
    supporterBadge,
    title,
    supporterLifetime
  );
  const isSupporterDisplay = supporterTier !== "none";
  const showApNameColor = Boolean(nameColorClass) && (
    preferNameColor || !isSupporterDisplay
  );
  const showSupporterNameFx = isSupporterDisplay && !showApNameColor;

  const titleLabel = localizeTitleName(title?.name, locale);
  const secondaryLabel = titleLabel ?? fallbackRoleLabel ?? null;
  const isRoleFallback = !titleLabel && Boolean(fallbackRoleLabel);
  const wrapRnfFrame = Boolean(
    title && isRainyNightFrogTitleClass(title.css_class)
  );
  const resolvedAnimateTitle = useMemo(() => {
    if (!ready) return false;
    if (settings.reduceMotion || settings.disableCosmeticFx) return false;
    // 桌面版全站稱號預設開啟動畫；手機版是否開啟則交由設定頁控制。
    return true;
  }, [ready, settings.disableCosmeticFx, settings.reduceMotion]);

  const titleClass = title
    ? cn(
        "font-semibold tracking-wide",
        getTitleDisplayClass(title.css_class, title.rarity_tier, {
          animate: resolvedAnimateTitle,
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

  const resolvedUsernameClass = showApNameColor
    ? stripConflictingTextColorClasses(usernameClassName)
    : usernameClassName;

  const nameClass = cn(
    "font-medium",
    showSupporterNameFx && supporterUsernameClassByTier[supporterTier],
    resolvedUsernameClass,
    // AP 名字色放最後，避免被 text-zinc-*／text-white 蓋掉
    showApNameColor && nameColorClass,
    showSupporterNameFx &&
      isSvipLikeTier(supporterTier) &&
      "!bg-clip-text !text-transparent hover:!text-transparent [-webkit-text-fill-color:transparent]",
    showSupporterNameFx &&
      supporterTier === "basic" &&
      "!text-amber-300 hover:!text-amber-200"
  );

  const supporterIcon =
    showSupporterBadge && supporterTier !== "none" ? (
      <SupporterBadge
        isSupporter={isSupporter}
        supporterBadge={supporterBadge}
        supporterLifetime={supporterLifetime}
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
    return (
      <span
        className={cn(
          "title-rainynightfrog-frame",
          !resolvedAnimateTitle && "title-fx-static"
        )}
      >
        {inner}
      </span>
    );
  }

  if (layout === "stacked") {
    return (
      <span className={cn("inline-flex flex-col items-center gap-1", className)}>
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
        className={cn(
          "inline-flex min-w-0 max-w-full items-center",
          wrapRnfFrame ? "gap-x-2" : "gap-x-1",
          className
        )}
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
        "inline-flex flex-wrap items-center gap-y-0.5",
        wrapRnfFrame ? "gap-x-2.5 sm:gap-x-3.5" : "gap-x-1.5",
        className
      )}
    >
      <span className={nameClass}>{username}</span>
      {supporterIcon}
      {renderTitle("inline-block text-[11px] sm:text-xs")}
    </span>
  );
}
