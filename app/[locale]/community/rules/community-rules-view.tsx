"use client";

import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  BookOpen,
  MessagesSquare,
  ScrollText,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { SiteHeader } from "@/components/layout/site-header";
import { cn } from "@/lib/utils";

export function CommunityRulesView() {
  const t = useTranslations("rules");
  const tCommunity = useTranslations("community");

  const sections = [
    {
      id: "disclaimer",
      title: t("disclaimerTitle"),
      paragraphs: [t("disclaimerP1"), t("disclaimerP2")],
    },
    {
      id: "rules",
      title: t("rulesTitle"),
      items: [
        { title: t("rule1Title"), body: t("rule1Body") },
        { title: t("rule2Title"), body: t("rule2Body") },
        { title: t("rule3Title"), body: t("rule3Body") },
        { title: t("rule4Title"), body: t("rule4Body") },
        { title: t("rule5Title"), body: t("rule5Body") },
        { title: t("rule6Title"), body: t("rule6Body") },
      ],
    },
    {
      id: "moderators",
      title: t("moderatorsTitle"),
      paragraphs: [
        t("moderatorsP1"),
        t("moderatorsP2"),
        t("moderatorsP3"),
        t("moderatorsP4"),
      ],
    },
    {
      id: "reporting",
      title: t("reportingTitle"),
      paragraphs: [t("reportingP1"), t("reportingP2"), t("reportingP3")],
    },
  ] as const;

  return (
    <div className="dark relative min-h-full text-zinc-100">
      <SiteHeader>
          <Link
            href="/community"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "gap-1.5 text-zinc-400 hover:text-violet-300"
            )}
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">{tCommunity("hub")}</span>
          </Link>

          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-md shadow-violet-500/20">
              <ScrollText className="size-4 text-white" />
            </div>
            <span className="truncate text-base font-bold tracking-tight text-white">
              {t("title")}
            </span>
          </div>
      </SiteHeader>

      <main className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <nav
              aria-label={t("tocLabel")}
              className="rounded-2xl border border-white/10 bg-zinc-900/50 p-4"
            >
              <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                <BookOpen className="size-3.5" />
                {t("toc")}
              </p>
              <ul className="space-y-1 text-sm">
                {sections.map((section) => (
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
                  {t("goToForum")}
                </Link>
              </div>
            </nav>
          </aside>

          <article className="min-w-0">
            <header className="mb-8 border-b border-white/8 pb-8">
              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {t("title")}
              </h1>
              <p className="mt-4 text-base leading-relaxed text-zinc-400">
                {t("intro")}
              </p>
            </header>

            <div className="space-y-12">
              {sections.map((section) => (
                <section
                  key={section.id}
                  id={section.id}
                  className="scroll-mt-28"
                >
                  <h2 className="text-xl font-bold text-white sm:text-2xl">
                    {section.title}
                  </h2>

                  {"paragraphs" in section &&
                    section.paragraphs?.map((paragraph) => (
                      <p
                        key={paragraph.slice(0, 24)}
                        className="mt-4 text-sm leading-relaxed text-zinc-400 sm:text-base"
                      >
                        {paragraph}
                      </p>
                    ))}

                  {"items" in section && section.items && (
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
              {t("footnote")}
            </footer>
          </article>
        </div>
      </main>
    </div>
  );
}
