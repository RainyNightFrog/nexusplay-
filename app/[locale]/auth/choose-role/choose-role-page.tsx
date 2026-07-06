"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Gamepad2, Loader2, Rocket, Sparkles, Wand2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { UserRole } from "@/lib/auth";
import {
  readAccountIntentFromMetadata,
  shouldSkipAccountIntent,
} from "@/lib/account-intent";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export default function ChooseRolePage() {
  const t = useTranslations("auth.chooseRole");
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/";

  const [intent, setIntent] = useState<UserRole>("player");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (!user) {
        router.replace(`/auth?redirect=${encodeURIComponent(redirectTo)}`);
        return;
      }

      if (shouldSkipAccountIntent(user)) {
        router.replace(redirectTo);
        return;
      }

      setIntent(readAccountIntentFromMetadata(user));
      setLoading(false);
    }

    bootstrap().catch(() => {
      if (!cancelled) {
        setError(t("loadFailed"));
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [redirectTo, router, t]);

  async function handleContinue() {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/account-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ intent }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? t("saveFailed"));
      }

      router.replace(redirectTo);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : t("saveFailed")
      );
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="dark flex min-h-full items-center justify-center text-zinc-100">
        <Loader2 className="size-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  const options: Array<{
    value: UserRole;
    icon: typeof Gamepad2;
    accent: "cyan" | "violet";
  }> = [
    { value: "player", icon: Gamepad2, accent: "cyan" },
    { value: "creator", icon: Wand2, accent: "violet" },
  ];

  return (
    <div className="dark relative min-h-full overflow-hidden text-zinc-100">
      <SiteHeader>
        <div className="ml-auto">
          <LanguageSwitcher />
        </div>
      </SiteHeader>

      <div className="relative mx-auto flex min-h-full max-w-lg flex-col justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className="mb-6 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-4 py-1.5 text-xs font-medium text-violet-300">
              <Sparkles className="size-3.5" />
              {t("badge")}
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              {t("title")}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              {t("description")}
            </p>
          </div>

          <Card className="border-white/10 bg-zinc-900/80 py-0 shadow-2xl backdrop-blur-xl">
            <CardHeader className="gap-2 px-6 pt-6 pb-0 text-center">
              <CardTitle className="text-lg text-white">{t("cardTitle")}</CardTitle>
              <CardDescription>{t("cardDesc")}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 px-6 pt-5 pb-6">
              <div className="grid gap-3 sm:grid-cols-2">
                {options.map(({ value, icon: Icon, accent }) => {
                  const selected = intent === value;
                  const isCreator = value === "creator";

                  return (
                    <button
                      key={value}
                      type="button"
                      disabled={submitting}
                      onClick={() => setIntent(value)}
                      className={cn(
                        "rounded-2xl border px-4 py-4 text-left transition-all",
                        "disabled:cursor-not-allowed disabled:opacity-60",
                        selected
                          ? isCreator
                            ? "border-violet-400/40 bg-violet-500/10 shadow-[0_0_24px_rgba(139,92,246,0.18)]"
                            : "border-cyan-400/40 bg-cyan-500/10 shadow-[0_0_24px_rgba(34,211,238,0.18)]"
                          : "border-white/10 bg-white/[0.03] hover:border-white/20"
                      )}
                    >
                      <div
                        className={cn(
                          "mb-3 flex size-10 items-center justify-center rounded-xl border",
                          selected
                            ? isCreator
                              ? "border-violet-400/30 bg-violet-500/15 text-violet-300"
                              : "border-cyan-400/30 bg-cyan-500/15 text-cyan-300"
                            : "border-white/10 bg-white/5 text-zinc-400"
                        )}
                      >
                        <Icon className="size-5" />
                      </div>
                      <p className="text-sm font-semibold text-white">
                        {isCreator ? t("creatorTitle") : t("playerTitle")}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                        {isCreator ? t("creatorDesc") : t("playerDesc")}
                      </p>
                    </button>
                  );
                })}
              </div>

              {error && (
                <p className="rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                  {error}
                </p>
              )}

              <Button
                type="button"
                disabled={submitting}
                onClick={handleContinue}
                className={cn(
                  "h-11 w-full gap-2 rounded-xl border-0 text-base font-semibold",
                  "bg-gradient-to-r from-cyan-500 via-violet-600 to-fuchsia-600 text-white",
                  "shadow-lg shadow-violet-500/25"
                )}
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {t("saving")}
                  </>
                ) : (
                  <>
                    <Rocket className="size-4" />
                    {t("continue")}
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-zinc-500">{t("footnote")}</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
