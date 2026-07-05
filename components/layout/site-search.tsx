"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Gamepad2, Loader2, Search, UserRound } from "lucide-react";
import { addSearchHistory } from "@/lib/search-history";
import type { SearchCreatorResult } from "@/lib/platform-search-service";
import type { Game } from "@/lib/games";
import { cn } from "@/lib/utils";

type SiteSearchProps = {
  className?: string;
  inputClassName?: string;
  defaultQuery?: string;
  autoFocus?: boolean;
  enableSuggestions?: boolean;
};

export function SiteSearch({
  className,
  inputClassName,
  defaultQuery = "",
  autoFocus = false,
  enableSuggestions = true,
}: SiteSearchProps) {
  const t = useTranslations("nav");
  const ts = useTranslations("search");
  const router = useRouter();
  const [query, setQuery] = useState(defaultQuery);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [games, setGames] = useState<Game[]>([]);
  const [creators, setCreators] = useState<SearchCreatorResult[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(defaultQuery);
  }, [defaultQuery]);

  const submit = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      addSearchHistory(trimmed);
      setOpen(false);
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    },
    [router]
  );

  useEffect(() => {
    if (!enableSuggestions || !open) return;

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setGames([]);
      setCreators([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = window.setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(trimmed)}`)
        .then((response) => (response.ok ? response.json() : null))
        .then(
          (data: {
            games?: Game[];
            creators?: SearchCreatorResult[];
          } | null) => {
            setGames((data?.games ?? []).slice(0, 5));
            setCreators((data?.creators ?? []).slice(0, 3));
          }
        )
        .catch(() => {
          setGames([]);
          setCreators([]);
        })
        .finally(() => setLoading(false));
    }, 280);

    return () => window.clearTimeout(timer);
  }, [enableSuggestions, open, query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    submit(query);
  }

  const showDropdown =
    enableSuggestions &&
    open &&
    query.trim().length >= 2 &&
    (loading || games.length > 0 || creators.length > 0);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <form onSubmit={handleSubmit}>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-zinc-500" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={t("searchPlaceholder")}
          autoFocus={autoFocus}
          className={cn(
            "h-10 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 text-sm",
            "text-zinc-100 placeholder:text-zinc-500 backdrop-blur-md",
            "outline-none transition-all duration-200",
            "focus:border-cyan-400/40 focus:bg-white/8 focus:ring-2 focus:ring-cyan-500/20",
            inputClassName
          )}
        />
      </form>

      {showDropdown && (
        <div
          className={cn(
            "absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-xl",
            "border border-white/10 bg-zinc-900/95 shadow-2xl shadow-black/50 backdrop-blur-xl"
          )}
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-zinc-500">
              <Loader2 className="size-4 animate-spin" />
              {ts("suggestLoading")}
            </div>
          ) : (
            <div className="py-1">
              {creators.map((creator) => (
                <button
                  key={creator.id}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    router.push(`/creator/${creator.id}`);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-white/5"
                >
                  <UserRound className="size-4 shrink-0 text-violet-400" />
                  <span className="truncate text-zinc-200">{creator.displayName}</span>
                  <span className="ml-auto text-xs text-zinc-500">{ts("creatorLabel")}</span>
                </button>
              ))}
              {games.map((game) => (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    router.push(`/game/${game.id}`);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-white/5"
                >
                  <Gamepad2 className="size-4 shrink-0 text-cyan-400" />
                  <span className="truncate text-zinc-200">{game.title}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => submit(query)}
                className="w-full border-t border-white/5 px-4 py-2.5 text-left text-xs text-violet-400 hover:bg-white/5"
              >
                {ts("viewAllResults")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
