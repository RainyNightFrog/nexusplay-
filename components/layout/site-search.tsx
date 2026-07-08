"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  Clock,
  Flame,
  Gamepad2,
  Hash,
  Loader2,
  Search,
  Sparkles,
  UserRound,
} from "lucide-react";
import { GAME_GENRES } from "@/lib/game-metadata";
import { UserBadge } from "@/components/UserBadge";
import { addSearchHistory, readSearchHistory } from "@/lib/search-history";
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

const FALLBACK_POPULAR = GAME_GENRES.slice(0, 8);

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
  const [assistLoading, setAssistLoading] = useState(false);
  const [games, setGames] = useState<Game[]>([]);
  const [creators, setCreators] = useState<SearchCreatorResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularTerms, setPopularTerms] = useState<string[]>(FALLBACK_POPULAR);
  const [suggestedGames, setSuggestedGames] = useState<Game[]>([]);
  const assistLoadedRef = useRef(false);
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

  const refreshRecentSearches = useCallback(() => {
    setRecentSearches(readSearchHistory().slice(0, 5));
  }, []);

  const loadAssistData = useCallback(async () => {
    if (assistLoadedRef.current) return;
    assistLoadedRef.current = true;
    setAssistLoading(true);

    try {
      const [popularRes, gamesRes] = await Promise.all([
        fetch("/api/search/popular"),
        fetch("/api/games?sort=views"),
      ]);

      if (popularRes.ok) {
        const popularData = (await popularRes.json()) as { terms?: string[] };
        if (Array.isArray(popularData.terms) && popularData.terms.length > 0) {
          setPopularTerms(popularData.terms.slice(0, 8));
        }
      }

      if (gamesRes.ok) {
        const gamesData = (await gamesRes.json()) as { games?: Game[] };
        setSuggestedGames((gamesData.games ?? []).slice(0, 4));
      }
    } catch {
      // keep fallbacks
    } finally {
      setAssistLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enableSuggestions || !open) return;

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      refreshRecentSearches();
      void loadAssistData();
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
  }, [enableSuggestions, loadAssistData, open, query, refreshRecentSearches]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    submit(query);
  }

  const trimmedQuery = query.trim();
  const showAssist =
    enableSuggestions &&
    open &&
    trimmedQuery.length < 2 &&
    (assistLoading ||
      recentSearches.length > 0 ||
      popularTerms.length > 0 ||
      suggestedGames.length > 0);

  const showResults =
    enableSuggestions &&
    open &&
    trimmedQuery.length >= 2 &&
    (loading || games.length > 0 || creators.length > 0);

  const showDropdown = showAssist || showResults;

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
          autoComplete="off"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
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
            "absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-[min(70vh,24rem)] overflow-y-auto rounded-xl",
            "border border-white/10 bg-zinc-900/95 shadow-2xl shadow-black/50 backdrop-blur-xl"
          )}
        >
          {showAssist && (
            <div className="py-2">
              {assistLoading && recentSearches.length === 0 && (
                <div className="flex items-center justify-center gap-2 px-4 py-4 text-sm text-zinc-500">
                  <Loader2 className="size-4 animate-spin" />
                  {ts("suggestLoading")}
                </div>
              )}

              {recentSearches.length > 0 && (
                <section className="px-2 pb-1">
                  <p className="flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    <Clock className="size-3.5 text-cyan-400" />
                    {ts("recentSearches")}
                  </p>
                  {recentSearches.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => submit(item)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-zinc-200 hover:bg-white/5"
                    >
                      <Clock className="size-3.5 shrink-0 text-zinc-500" />
                      <span className="truncate">{item}</span>
                    </button>
                  ))}
                </section>
              )}

              {popularTerms.length > 0 && (
                <section className="border-t border-white/5 px-3 py-2.5">
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    <Flame className="size-3.5 text-amber-400" />
                    {ts("popularShortcuts")}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {popularTerms.map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => submit(term)}
                        className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-300 transition hover:border-cyan-400/30 hover:text-cyan-200"
                      >
                        <Hash className="size-3 text-zinc-500" />
                        {term}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {suggestedGames.length > 0 && (
                <section className="border-t border-white/5 px-2 py-1">
                  <p className="flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                    <Sparkles className="size-3.5 text-violet-400" />
                    {ts("suggestedGames")}
                  </p>
                  {suggestedGames.map((game) => (
                    <button
                      key={game.id}
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        router.push(`/game/${game.id}`);
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-white/5"
                    >
                      <Gamepad2 className="size-4 shrink-0 text-cyan-400" />
                      <span className="min-w-0 flex-1 truncate text-zinc-200">
                        {game.title}
                      </span>
                      {game.genre && (
                        <span className="shrink-0 text-[10px] text-zinc-500">
                          {game.genre}
                        </span>
                      )}
                    </button>
                  ))}
                </section>
              )}
            </div>
          )}

          {showResults && (
            <div className="py-1">
              {loading ? (
                <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-zinc-500">
                  <Loader2 className="size-4 animate-spin" />
                  {ts("suggestLoading")}
                </div>
              ) : (
                <>
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
                      <UserBadge
                        username={creator.displayName}
                        title={creator.equippedTitle}
                        layout="compact"
                        animateTitle={false}
                        className="min-w-0 flex-1"
                        usernameClassName="text-zinc-200"
                        titleClassName="text-[9px]"
                      />
                      <span className="ml-auto text-xs text-zinc-500">
                        {ts("creatorLabel")}
                      </span>
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
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
