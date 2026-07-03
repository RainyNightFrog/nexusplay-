import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  MessagesSquare,
  ScrollText,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  COMMUNITY_RULES_FOOTNOTE,
  COMMUNITY_RULES_INTRO,
  COMMUNITY_RULES_SECTIONS,
} from "@/lib/community-rules";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "社群規則 · NexusPlay",
  description: "NexusPlay 社群討論區使用規範、版主職責與檢舉流程",
};

export default function CommunityRulesPage() {
  return (
    <div className="dark min-h-full bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 top-0 size-[520px] rounded-full bg-violet-600/12 blur-[130px]" />
        <div className="absolute -right-32 top-1/3 size-[480px] rounded-full bg-fuchsia-500/8 blur-[140px]" />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/5 bg-zinc-950/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-4 sm:px-6">
          <Link
            href="/community"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "gap-1.5 text-zinc-400 hover:text-violet-300"
            )}
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">社群中心</span>
          </Link>

          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-md shadow-violet-500/20">
              <ScrollText className="size-4 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight text-white">
              社群規則
            </span>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <nav
              aria-label="本頁目錄"
              className="rounded-2xl border border-white/10 bg-zinc-900/50 p-4"
            >
              <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                <BookOpen className="size-3.5" />
                目錄
              </p>
              <ul className="space-y-1 text-sm">
                {COMMUNITY_RULES_SECTIONS.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className="block rounded-lg px-2.5 py-1.5 text-zinc-400 transition-colors hover:bg-white/5 hover:text-violet-200"
                    >
                      {section.title}
                    </a>
                  </li>
                ))}
              </ul>
              <div className="mt-4 border-t border-white/8 pt-4">
                <Link
                  href="/community"
                  className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-violet-400/90 transition-colors hover:bg-violet-500/10 hover:text-violet-300"
                >
                  <MessagesSquare className="size-3.5" />
                  前往討論區
                </Link>
              </div>
            </nav>
          </aside>

          <article className="min-w-0">
            <header className="mb-8 border-b border-white/8 pb-8">
              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                社群規則
              </h1>
              <p className="mt-4 text-base leading-relaxed text-zinc-400">
                {COMMUNITY_RULES_INTRO}
              </p>
            </header>

            <div className="space-y-12">
              {COMMUNITY_RULES_SECTIONS.map((section) => (
                <section
                  key={section.id}
                  id={section.id}
                  className="scroll-mt-28"
                >
                  <h2 className="text-xl font-bold text-white sm:text-2xl">
                    {section.title}
                  </h2>

                  {section.paragraphs?.map((paragraph) => (
                    <p
                      key={paragraph.slice(0, 24)}
                      className="mt-4 text-sm leading-relaxed text-zinc-400 sm:text-base"
                    >
                      {paragraph}
                    </p>
                  ))}

                  {section.items && (
                    <ol className="mt-5 space-y-6">
                      {section.items.map((item, index) => (
                        <li key={item.title} className="flex gap-4">
                          <span
                            className={cn(
                              "flex size-8 shrink-0 items-center justify-center rounded-lg",
                              "bg-violet-500/15 text-sm font-bold text-violet-300 ring-1 ring-violet-400/25"
                            )}
                          >
                            {index + 1}
                          </span>
                          <div className="min-w-0 pt-0.5">
                            <h3 className="font-semibold text-zinc-200">
                              {item.title}
                            </h3>
                            <p className="mt-2 text-sm leading-relaxed text-zinc-500 sm:text-base">
                              {item.body}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </section>
              ))}
            </div>

            <footer className="mt-12 rounded-2xl border border-dashed border-white/10 bg-zinc-900/30 px-5 py-4 text-sm leading-relaxed text-zinc-500">
              {COMMUNITY_RULES_FOOTNOTE}
            </footer>
          </article>
        </div>
      </main>
    </div>
  );
}
