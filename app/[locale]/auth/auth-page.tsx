"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  Loader2,
  Lock,
  Mail,
  Sparkles,
  UserRound,
  WandSparkles,
} from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserRole } from "@/lib/auth";
import { buildChooseRolePath } from "@/lib/account-intent";
import { MfaChallengePanel } from "@/components/auth/mfa-challenge-panel";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type AuthMode = "login" | "register";

const authInputClassName = cn(
  "h-11 rounded-xl border-white/10 bg-white/5 text-zinc-100 placeholder:text-zinc-500",
  "focus-visible:border-cyan-400/40 focus-visible:ring-cyan-500/20"
);

export default function AuthPage() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();

  const redirectTo = searchParams.get("redirect") ?? "/";
  const hint = searchParams.get("hint");
  const callbackError = searchParams.get("error");

  const [mode, setMode] = useState<AuthMode>("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("player");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    callbackError ? t("callbackFailed") : null
  );
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);

  const hintMessage = useMemo(() => {
    if (hint === "creator") {
      return t("creatorHint");
    }
    return null;
  }, [hint, t]);

  const featureItems = [t("feature1"), t("feature2"), t("feature3")] as const;

  async function goAfterAuth() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.user_metadata?.role === "admin") {
      router.push(redirectTo);
    } else {
      router.push(buildChooseRolePath(redirectTo));
    }
    router.refresh();
  }

  async function handleGoogleSignIn() {
    setLoading(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
        },
      });

      if (oauthError) throw oauthError;
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : t("operationFailed");
      const needsProvider =
        message.toLowerCase().includes("provider") ||
        message.toLowerCase().includes("google") ||
        message.toLowerCase().includes("oauth");
      setError(
        needsProvider
          ? `${message}（請在 Supabase → Authentication → Providers 啟用 Google，或執行 npm run setup:google 查看設定步驟）`
          : message
      );
      setLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();

    try {
      if (mode === "register") {
        if (!displayName.trim()) {
          throw new Error(t("displayNameRequired"));
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              display_name: displayName.trim(),
              role,
            },
            emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
          },
        });

        if (signUpError) throw signUpError;

        if (data.session) {
          await goAfterAuth();
          return;
        }

        setMessage(t("registerSuccess"));
        setMode("login");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) throw signInError;

      const { data: aal, error: aalError } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (!aalError && aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
        const { data: factors, error: factorsError } =
          await supabase.auth.mfa.listFactors();

        if (!factorsError) {
          const verified = (factors.totp ?? []).find(
            (factor) => factor.status === "verified"
          );
          if (verified) {
            setMfaFactorId(verified.id);
            return;
          }
        }
      }

      await goAfterAuth();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : t("operationFailed")
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="dark relative min-h-full overflow-hidden text-zinc-100">
      <SiteHeader>
        <div className="ml-auto">
          <LanguageSwitcher />
        </div>
      </SiteHeader>

      <div className="relative mx-auto flex min-h-full max-w-6xl flex-col px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid flex-1 items-center gap-10 lg:grid-cols-[1.1fr_420px]">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="hidden lg:block"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-1.5 text-xs font-medium text-cyan-300">
              <Sparkles className="size-3.5" />
              {t("badge")}
            </div>
            <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
              <span className="bg-gradient-to-br from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
                {t("hero1")}
              </span>
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                {t("hero2")}
              </span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-zinc-400">
              {t("heroDesc")}
            </p>

            <div className="mt-8 grid max-w-md gap-3">
              {featureItems.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300"
                >
                  <WandSparkles className="size-4 shrink-0 text-violet-400" />
                  {item}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative mx-auto w-full max-w-md"
          >
            <div className="absolute -inset-1 rounded-[28px] bg-gradient-to-r from-cyan-400 via-violet-500 to-fuchsia-500 opacity-40 blur-xl" />

            <Card className="relative overflow-hidden rounded-[24px] border-white/10 bg-zinc-900/80 py-0 shadow-2xl shadow-black/50 backdrop-blur-xl">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />

              <CardHeader className="gap-4 px-6 pt-6 pb-0">
                <div className="flex rounded-xl border border-white/10 bg-white/5 p-1">
                  {(["login", "register"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => {
                        setMode(tab);
                        setError(null);
                        setMessage(null);
                      }}
                      className={cn(
                        "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                        mode === tab
                          ? "bg-gradient-to-r from-cyan-500 to-violet-600 text-white shadow-md shadow-violet-500/20"
                          : "text-zinc-400 hover:text-zinc-200"
                      )}
                    >
                      {tab === "login" ? t("login") : t("register")}
                    </button>
                  ))}
                </div>

                <div>
                  <CardTitle className="text-2xl text-white">
                    {mode === "login" ? t("welcomeBack") : t("createAccount")}
                  </CardTitle>
                  <CardDescription className="mt-1 text-zinc-400">
                    {mode === "login" ? t("loginDesc") : t("registerDesc")}
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="px-6 pb-6 pt-5">
                {(hintMessage || message || error) && (
                  <div className="mb-4 space-y-2">
                    {hintMessage && (
                      <div className="flex gap-2 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-200">
                        <AlertCircle className="mt-0.5 size-4 shrink-0" />
                        {hintMessage}
                      </div>
                    )}
                    {message && (
                      <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2.5 text-sm text-cyan-100">
                        {message}
                      </div>
                    )}
                    {error && (
                      <div className="flex gap-2 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-200">
                        <AlertCircle className="mt-0.5 size-4 shrink-0" />
                        {error}
                      </div>
                    )}
                  </div>
                )}

                {mfaFactorId ? (
                  <MfaChallengePanel
                    factorId={mfaFactorId}
                    onSuccess={() => void goAfterAuth()}
                    onCancel={() => {
                      setMfaFactorId(null);
                      void createClient().auth.signOut();
                    }}
                  />
                ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <AnimatePresence mode="wait">
                    {mode === "register" && (
                      <motion.div
                        key="register-fields"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4 overflow-hidden"
                      >
                        <div className="space-y-2">
                          <Label htmlFor="displayName" className="text-zinc-300">
                            {t("displayName")}
                          </Label>
                          <div className="relative">
                            <UserRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-500" />
                            <Input
                              id="displayName"
                              value={displayName}
                              onChange={(event) =>
                                setDisplayName(event.target.value)
                              }
                              placeholder={t("displayNamePlaceholder")}
                              className={cn(authInputClassName, "pl-10")}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-zinc-300">{t("accountRole")}</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {(
                              [
                                { value: "player", label: t("rolePlayer") },
                                { value: "creator", label: t("roleCreator") },
                              ] as const
                            ).map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => setRole(option.value)}
                                className={cn(
                                  "rounded-xl border px-3 py-2.5 text-sm font-medium transition-all",
                                  role === option.value
                                    ? "border-violet-400/40 bg-violet-500/15 text-violet-200"
                                    : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                                )}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-zinc-300">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-500" />
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="you@example.com"
                        required
                        className={cn(authInputClassName, "pl-10")}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-zinc-300">
                      {t("password")}
                    </Label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-500" />
                      <Input
                        id="password"
                        type="password"
                        autoComplete={
                          mode === "login" ? "current-password" : "new-password"
                        }
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder={t("passwordPlaceholder")}
                        minLength={6}
                        required
                        className={cn(authInputClassName, "pl-10")}
                      />
                    </div>
                  </div>

                  <div className="relative py-1">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-white/10" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-zinc-900/80 px-2 text-zinc-500">
                        {t("orContinueWith")}
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    onClick={handleGoogleSignIn}
                    className={cn(
                      "h-11 w-full rounded-xl border-white/15 bg-white/5 text-zinc-100",
                      "hover:border-white/25 hover:bg-white/10"
                    )}
                  >
                    {loading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <>
                        <svg
                          className="size-4"
                          viewBox="0 0 24 24"
                          aria-hidden
                        >
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                        {t("continueWithGoogle")}
                      </>
                    )}
                  </Button>

                  <Button
                    type="submit"
                    disabled={loading}
                    className={cn(
                      "mt-2 h-11 w-full rounded-xl border-0 text-base font-semibold",
                      "bg-gradient-to-r from-cyan-500 via-violet-600 to-fuchsia-600 text-white",
                      "shadow-lg shadow-violet-500/25 hover:from-cyan-400 hover:to-violet-500"
                    )}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        {tCommon("processing")}
                      </>
                    ) : mode === "login" ? (
                      t("login")
                    ) : (
                      t("createAccountBtn")
                    )}
                  </Button>
                </form>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
