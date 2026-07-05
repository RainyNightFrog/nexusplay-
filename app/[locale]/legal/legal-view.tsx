"use client";

import { useTranslations } from "next-intl";
import { ArrowLeft, Scale } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { SiteHeader } from "@/components/layout/site-header";
import { buttonVariants } from "@/components/ui/button";
import {
  FEE_CHANGE_NOTICE_DAYS,
  PAYMENT_PROCESSOR_FEE_FIXED_USD,
  PAYMENT_PROCESSOR_FEE_PERCENT,
  PLANNED_FUTURE_PLATFORM_FEE_PERCENT,
  PLANNED_PLATFORM_FEE_PERCENT,
} from "@/lib/tip-fee-policy";
import { cn } from "@/lib/utils";

export function LegalView() {
  const t = useTranslations("legal");

  const sections = [
    {
      id: "terms",
      title: t("termsTitle"),
      paragraphs: [
        t("termsP1"),
        t("termsP2"),
        t("termsP3"),
        t("termsP4"),
      ],
    },
    {
      id: "payments",
      title: t("paymentsTitle"),
      paragraphs: [
        t("paymentsP1"),
        t("paymentsP2", {
          percent: PLANNED_PLATFORM_FEE_PERCENT,
          futurePercent: PLANNED_FUTURE_PLATFORM_FEE_PERCENT,
        }),
        t("paymentsP3", {
          percent: PAYMENT_PROCESSOR_FEE_PERCENT,
          fixed: PAYMENT_PROCESSOR_FEE_FIXED_USD.toFixed(2),
        }),
        t("paymentsP4"),
        t("paymentsP5"),
        t("paymentsP6"),
        t("paymentsP7", { days: FEE_CHANGE_NOTICE_DAYS }),
      ],
    },
    {
      id: "privacy",
      title: t("privacyTitle"),
      paragraphs: [t("privacyP1"), t("privacyP2"), t("privacyP3"), t("privacyP4")],
    },
    {
      id: "disclaimer",
      title: t("disclaimerTitle"),
      paragraphs: [
        t("disclaimerP1"),
        t("disclaimerP2"),
        t("disclaimerP3"),
      ],
    },
  ] as const;

  return (
    <div className="dark relative flex min-h-full flex-col text-zinc-100">
      <SiteHeader>
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "gap-1.5 text-zinc-400 hover:text-violet-300"
          )}
        >
          <ArrowLeft className="size-4" />
          <span className="hidden sm:inline">{t("backHome")}</span>
        </Link>
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-violet-600">
            <Scale className="size-4 text-white" />
          </div>
          <span className="truncate text-base font-bold text-white">
            {t("title")}
          </span>
        </div>
      </SiteHeader>

      <main className="relative mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <p className="text-center text-sm leading-relaxed text-zinc-400">
          {t("intro")}
        </p>
        <p className="mx-auto mt-3 max-w-2xl text-center text-xs text-amber-200/80">
          {t("draftNotice")}
        </p>

        <div className="mt-10 space-y-10">
          {sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-24 rounded-2xl border border-white/10 bg-zinc-900/50 p-6 sm:p-8"
            >
              <h2 className="text-lg font-semibold text-white">
                {section.title}
              </h2>
              <div className="mt-4 space-y-4">
                {section.paragraphs.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="text-sm leading-relaxed text-zinc-400"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-zinc-600">
          {t("lastUpdated")}
        </p>
      </main>
    </div>
  );
}
