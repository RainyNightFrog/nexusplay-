"use client";

import { useTranslations } from "next-intl";
import {
  Download,
  HeartHandshake,
  Menu,
  MessagesSquare,
  Search,
  Trophy,
} from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { usePwaInstallOptional } from "@/components/pwa/PwaInstallPrompt";
import { useAuth } from "@/hooks/use-auth";
import { getCreatorDashboardHref } from "@/lib/creator-nav";
import { requestOpenLeaderboard } from "@/lib/open-leaderboard";
import { cn } from "@/lib/utils";

type MobileNavMenuProps = {
  className?: string;
  /** 是否顯示社群／支持者（首頁需要；其他頁可關） */
  showExploreLinks?: boolean;
  /** 遊戲頁：收進選單的討論區連結 */
  forumHref?: string;
  forumLabel?: string;
  forumCount?: number;
};

export function MobileNavMenu({
  className,
  showExploreLinks = true,
  forumHref,
  forumLabel,
  forumCount = 0,
}: MobileNavMenuProps) {
  const tNav = useTranslations("nav");
  const tLang = useTranslations("language");
  const tHome = useTranslations("home");
  const tLeaderboard = useTranslations("leaderboard");
  const tPwa = useTranslations("pwa");
  const router = useRouter();
  const { profile, isCreator } = useAuth();
  const pwa = usePwaInstallOptional();
  const creatorHref = getCreatorDashboardHref(profile, isCreator);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5",
          "text-zinc-200 outline-none transition touch-manipulation",
          "hover:border-cyan-400/35 hover:bg-cyan-500/10 hover:text-white",
          "focus-visible:ring-2 focus-visible:ring-cyan-500/30",
          "data-popup-open:border-cyan-400/40 data-popup-open:bg-cyan-500/10",
          "md:hidden",
          className
        )}
        aria-label={tNav("moreMenu")}
      >
        <Menu className="size-5" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className={cn(
          "min-w-[12.5rem] rounded-xl border border-white/10 p-1.5",
          "bg-zinc-950/95 text-zinc-100 shadow-2xl shadow-black/60 backdrop-blur-xl",
          "ring-1 ring-cyan-500/15"
        )}
      >
        <DropdownMenuItem
          onClick={() => router.push("/search")}
          className="cursor-pointer gap-2 rounded-lg px-2.5 py-2.5 text-sm text-zinc-300"
        >
          <Search className="size-4 text-cyan-400" />
          {tNav("searchOpen")}
        </DropdownMenuItem>

        {showExploreLinks && (
          <>
            <DropdownMenuItem
              onClick={() => router.push("/community")}
              className="cursor-pointer gap-2 rounded-lg px-2.5 py-2.5 text-sm text-zinc-300"
            >
              <MessagesSquare className="size-4 text-violet-300" />
              {tNav("community")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push("/supporter")}
              className="cursor-pointer gap-2 rounded-lg px-2.5 py-2.5 text-sm text-zinc-300"
            >
              <HeartHandshake className="size-4 text-amber-300" />
              {tHome("supporterNav")}
            </DropdownMenuItem>
          </>
        )}

        {forumHref && forumLabel && (
          <DropdownMenuItem
            onClick={() => router.push(forumHref)}
            className="cursor-pointer gap-2 rounded-lg px-2.5 py-2.5 text-sm text-zinc-300"
          >
            <MessagesSquare className="size-4 text-violet-300" />
            <span className="min-w-0 flex-1 truncate">{forumLabel}</span>
            {forumCount > 0 && (
              <span className="rounded-full bg-violet-500/25 px-1.5 py-0.5 text-[10px] font-bold text-violet-100">
                {forumCount}
              </span>
            )}
          </DropdownMenuItem>
        )}

        <DropdownMenuItem
          onClick={() => requestOpenLeaderboard()}
          className="cursor-pointer gap-2 rounded-lg px-2.5 py-2.5 text-sm text-zinc-300"
        >
          <Trophy className="size-4 text-amber-300" />
          {tLeaderboard("navLabel")}
        </DropdownMenuItem>

        {isCreator && (
          <DropdownMenuItem
            onClick={() => router.push(creatorHref)}
            className="cursor-pointer gap-2 rounded-lg px-2.5 py-2.5 text-sm text-zinc-300"
          >
            {tNav("creatorDashboard")}
          </DropdownMenuItem>
        )}

        {pwa?.showInstallEntry ? (
          <DropdownMenuItem
            onClick={() => void pwa.promptInstall()}
            className="cursor-pointer gap-2 rounded-lg px-2.5 py-2.5 text-sm text-zinc-300"
          >
            <Download className="size-4 text-cyan-400" />
            {tPwa("menu_install")}
          </DropdownMenuItem>
        ) : null}

        <DropdownMenuSeparator className="my-1 bg-white/10" />

        <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
          <span className="text-xs text-zinc-500">{tLang("label")}</span>
          <LanguageSwitcher />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
