"use client";

import { useTranslations } from "next-intl";
import { Handshake, Mail, Users } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";

const CONTACT_EMAIL = "rainynightfrog@gmail.com";

export function AboutView() {
  const t = useTranslations("about");

  return (
    <div className="dark relative min-h-full text-zinc-100">
      <SiteHeader />

      <main className="relative mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-200">
            <Users className="size-3.5" />
            RainyNightFrog
          </div>
          <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
            {t("intro")}
          </p>
        </div>

        <section className="mt-10 rounded-2xl border border-white/8 bg-zinc-900/50 p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20">
              <Users className="size-5 text-cyan-300" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{t("joinTitle")}</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{t("joinP1")}</p>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">{t("joinP2")}</p>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-white/8 bg-zinc-900/50 p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20">
              <Handshake className="size-5 text-violet-300" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{t("contactTitle")}</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{t("contactP1")}</p>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-cyan-300 transition-colors hover:text-cyan-200"
              >
                <Mail className="size-4 shrink-0" />
                {CONTACT_EMAIL}
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
