"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type AuthCallbackMessageKey =
  | "callbackCompleting"
  | "callbackVerifying"
  | "callbackVerifyingRecovery";

type AuthCallbackScreenProps = {
  messageKey: AuthCallbackMessageKey;
};

export function AuthCallbackScreen({ messageKey }: AuthCallbackScreenProps) {
  const t = useTranslations("auth");

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="relative mx-auto w-full max-w-md">
        <div className="absolute -inset-1 rounded-[28px] bg-gradient-to-r from-cyan-400 via-violet-500 to-fuchsia-500 opacity-40 blur-xl" />
        <Card className="relative overflow-hidden rounded-[24px] border-white/10 bg-zinc-900/80 py-0 shadow-2xl shadow-black/50 backdrop-blur-xl">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
          <CardHeader className="gap-3 px-6 pt-8 pb-2 text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-1.5 text-xs font-medium text-cyan-300">
              <Sparkles className="size-3.5" />
              {t("badge")}
            </div>
            <CardTitle className="text-xl text-white">{t("callbackTitle")}</CardTitle>
            <CardDescription className="text-sm leading-relaxed text-zinc-400">
              {t(messageKey)}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3 px-6 pt-2 pb-8">
            <Loader2 className="size-10 animate-spin text-cyan-400" aria-hidden="true" />
            <p className="text-xs text-zinc-500">{t("callbackHint")}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
