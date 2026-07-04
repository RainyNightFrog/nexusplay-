"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { Check, Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  localeLabels,
  locales,
  type AppLocale,
} from "@/i18n/routing";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const t = useTranslations("language");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const currentLabel = localeLabels[locale]?.short ?? locale;

  function switchLocale(nextLocale: AppLocale) {
    if (nextLocale === locale) return;

    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isPending}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5",
          "text-sm text-zinc-200 backdrop-blur-sm outline-none",
          "transition-all duration-300 ease-out",
          "hover:border-cyan-400/35 hover:bg-cyan-500/10 hover:text-white",
          "hover:shadow-[0_0_18px_rgba(34,211,238,0.25)]",
          "focus-visible:border-violet-400/40 focus-visible:ring-2 focus-visible:ring-violet-500/25",
          "data-popup-open:border-cyan-400/40 data-popup-open:bg-cyan-500/10",
          "data-popup-open:shadow-[0_0_20px_rgba(34,211,238,0.3)]",
          isPending && "pointer-events-none opacity-70"
        )}
        aria-label={t("label")}
      >
        <Globe
          className={cn(
            "size-4 shrink-0 text-cyan-400/90 transition-transform duration-300",
            isPending && "animate-spin"
          )}
        />
        <span className="hidden max-w-[5rem] truncate font-medium sm:inline">
          {currentLabel}
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className={cn(
          "min-w-[13.5rem] overflow-hidden rounded-xl border border-white/10 p-0",
          "bg-zinc-950/95 text-zinc-100 shadow-2xl shadow-black/60 backdrop-blur-xl",
          "ring-1 ring-cyan-500/15"
        )}
      >
        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 z-10 h-4 bg-gradient-to-b from-zinc-950/95 to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-4 bg-gradient-to-t from-zinc-950/95 to-transparent"
          />

          <div
            className={cn(
              "nexus-lang-scroll max-h-[min(22rem,var(--available-height))]",
              "overflow-y-auto overflow-x-hidden p-1.5"
            )}
          >
            {locales.map((code) => {
              const isActive = code === locale;
              const meta = localeLabels[code];

              return (
                <DropdownMenuItem
                  key={code}
                  onClick={() => switchLocale(code)}
                  className={cn(
                    "cursor-pointer rounded-lg px-2.5 py-2.5 text-sm transition-all duration-300 ease-out",
                    "text-zinc-300 outline-none",
                    "hover:bg-gradient-to-r hover:from-cyan-500/15 hover:to-violet-500/15",
                    "hover:text-white hover:shadow-[0_0_16px_rgba(139,92,246,0.2)]",
                    "focus:bg-gradient-to-r focus:from-cyan-500/15 focus:to-violet-500/15",
                    "focus:text-white focus:shadow-[0_0_16px_rgba(34,211,238,0.25)]",
                    isActive &&
                      "bg-gradient-to-r from-cyan-500/20 to-violet-500/20 text-white shadow-[0_0_12px_rgba(34,211,238,0.2)]"
                  )}
                >
                  <span className="flex min-w-0 flex-1 items-center gap-2.5">
                    <span
                      className={cn(
                        "inline-flex h-6 min-w-[2rem] shrink-0 items-center justify-center rounded-md px-1.5",
                        "border border-white/10 bg-white/5 text-[10px] font-bold uppercase tracking-wide",
                        isActive
                          ? "border-cyan-400/35 text-cyan-200 shadow-[0_0_10px_rgba(34,211,238,0.25)]"
                          : "text-zinc-400"
                      )}
                    >
                      {meta?.short ?? code}
                    </span>
                    <span className="min-w-0 truncate font-medium">{t(code)}</span>
                  </span>
                  {isActive && (
                    <Check className="size-4 shrink-0 text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
                  )}
                </DropdownMenuItem>
              );
            })}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
