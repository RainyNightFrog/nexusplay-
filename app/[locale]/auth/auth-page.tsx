"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import type { UserRole } from "@/lib/auth";
import { buildChooseRolePath, shouldSkipAccountIntent } from "@/lib/account-intent";
import { waitForAuthStorageFlush } from "@/lib/auth-callback-exchange";
import { setAuthRedirectCookie } from "@/lib/auth-redirect-cookie";
import { MfaChallengePanel } from "@/components/auth/mfa-challenge-panel";
import { createClient } from "@/lib/supabase/client";
import {
  clearPkceVerifierBackup,
  clearStaleSupabaseSessionCookies,
  savePkceVerifierBackup,
  waitForPkceVerifierCookie,
} from "@/lib/supabase/pkce";
import { getAuthCallbackUrl } from "@/lib/auth-redirect-urls";
import {
  clearRememberedCredentials,
  readRememberedCredentials,
  saveRememberedCredentials,
} from "@/lib/remembered-credentials";
import { cn } from "@/lib/utils";

type AuthMode = "login" | "register";
type AuthMethod = "password" | "magicLink";
type AuthView = "form" | "forgot" | "reset";
type OAuthProvider = "google" | "discord" | "github" | "twitch";

const OAUTH_SETUP_SCRIPTS: Record<OAuthProvider, string> = {
  google: "setup:google",
  discord: "setup:discord",
  github: "setup:github",
  twitch: "setup:twitch",
};

const OAUTH_PROVIDER_LABELS: Record<OAuthProvider, string> = {
  google: "Google",
  discord: "Discord",
  github: "GitHub",
  twitch: "Twitch",
};

const OAUTH_QUERY_PARAMS: Partial<Record<OAuthProvider, Record<string, string>>> = {
  google: { prompt: "select_account" },
};

const OAUTH_IN_FLIGHT_KEY = "oauth:in-flight";

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
  const callbackReason = searchParams.get("reason");
  const urlMode = searchParams.get("mode");

  const [authView, setAuthView] = useState<AuthView>(() =>
    urlMode === "reset" ? "reset" : "form"
  );
  const [mode, setMode] = useState<AuthMode>("login");
  const [authMethod, setAuthMethod] = useState<AuthMethod>("password");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberPassword, setRememberPassword] = useState(false);
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetSessionReady, setResetSessionReady] = useState<boolean | null>(null);
  const [role, setRole] = useState<UserRole>("player");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(() => {
    if (!callbackError) return null;
    if (callbackError === "callback") {
      return callbackReason
        ? `${t("callbackFailed")}（${callbackReason}）`
        : t("callbackFailed");
    }
    return t("callbackFailed");
  });
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);

  useEffect(() => {
    if (callbackError) {
      window.sessionStorage.removeItem(OAUTH_IN_FLIGHT_KEY);
      clearPkceVerifierBackup();
    }
  }, [callbackError]);

  useEffect(() => {
    if (urlMode === "reset" || callbackError) return;

    const timeout = window.setTimeout(() => {
      if (window.sessionStorage.getItem(OAUTH_IN_FLIGHT_KEY) === "1") return;

      const supabase = createClient();
      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (window.sessionStorage.getItem(OAUTH_IN_FLIGHT_KEY) === "1") return;
        if (session?.user) {
          router.replace(redirectTo);
          router.refresh();
        }
      });
    }, 800);

    return () => window.clearTimeout(timeout);
  }, [callbackError, redirectTo, router, urlMode]);

  useEffect(() => {
    const remembered = readRememberedCredentials();
    if (!remembered) return;

    setEmail(remembered.email);
    setPassword(remembered.password);
    setRememberPassword(true);
  }, []);

  useEffect(() => {
    if (urlMode !== "reset") return;

    setAuthView("reset");

    const supabase = createClient();
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setResetSessionReady(Boolean(session?.user));
    });
  }, [urlMode]);

  const cardTitle = useMemo(() => {
    if (authView === "forgot") return t("forgotPasswordTitle");
    if (authView === "reset") return t("resetPasswordTitle");
    return mode === "login" ? t("welcomeBack") : t("createAccount");
  }, [authView, mode, t]);

  const cardDescription = useMemo(() => {
    if (authView === "forgot") return t("forgotPasswordDesc");
    if (authView === "reset") return t("resetPasswordDesc");
    if (authMethod === "magicLink") {
      return mode === "login" ? t("loginMagicDesc") : t("registerMagicDesc");
    }
    return mode === "login" ? t("loginDesc") : t("registerDesc");
  }, [authView, authMethod, mode, t]);

  const hintMessage = useMemo(() => {
    if (hint === "admin") {
      return t("adminHint");
    }
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

    if (user && shouldSkipAccountIntent(user)) {
      router.push(redirectTo);
    } else {
      router.push(buildChooseRolePath(redirectTo));
    }
    router.refresh();
  }

  async function handleOAuthSignIn(provider: OAuthProvider) {
    setOauthLoading(provider);
    setError(null);
    setMessage(null);

    window.sessionStorage.setItem(OAUTH_IN_FLIGHT_KEY, "1");

    const supabase = createClient();

    try {
      clearStaleSupabaseSessionCookies();
      setAuthRedirectCookie(redirectTo);

      const queryParams = OAUTH_QUERY_PARAMS[provider];
      const { data: oauthData, error: oauthError } =
        await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: getAuthCallbackUrl(window.location.origin),
            skipBrowserRedirect: true,
            ...(queryParams ? { queryParams } : {}),
          },
        });

      if (oauthError) throw oauthError;
      if (!oauthData?.url) {
        throw new Error(t("operationFailed"));
      }

      const verifierReady = await waitForPkceVerifierCookie();
      if (!verifierReady) {
        throw new Error(
          "PKCE code verifier not found in storage. This can happen if the auth flow was initiated in a different browser or device, or if the storage was cleared. For SSR frameworks (Next.js)"
        );
      }

      if (!savePkceVerifierBackup()) {
        throw new Error(
          "PKCE code verifier not found in storage. This can happen if the auth flow was initiated in a different browser or device, or if the storage was cleared. For SSR frameworks (Next.js)"
        );
      }

      await waitForAuthStorageFlush();
      window.location.assign(oauthData.url);
    } catch (submitError) {
      window.sessionStorage.removeItem(OAUTH_IN_FLIGHT_KEY);
      const message =
        submitError instanceof Error ? submitError.message : t("operationFailed");
      const providerLabel = OAUTH_PROVIDER_LABELS[provider].toLowerCase();
      const needsProvider =
        message.toLowerCase().includes("provider") ||
        message.toLowerCase().includes(providerLabel) ||
        message.toLowerCase().includes("oauth");
      setError(
        needsProvider
          ? `${message}（請在 Supabase → Authentication → Providers 啟用 ${OAUTH_PROVIDER_LABELS[provider]}，或執行 npm run ${OAUTH_SETUP_SCRIPTS[provider]} 查看設定步驟）`
          : message
      );
      setOauthLoading(null);
    }
  }

  async function handleMagicLink() {
    setLoading(true);
    setError(null);
    setMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError(t("magicLinkEmailRequired"));
      setLoading(false);
      return;
    }

    const supabase = createClient();

    try {
      if (mode === "register" && !displayName.trim()) {
        throw new Error(t("displayNameRequired"));
      }

      setAuthRedirectCookie(redirectTo);

      const emailRedirectTo = `${getAuthCallbackUrl(window.location.origin)}?redirect=${encodeURIComponent(redirectTo)}`;
      const options: {
        emailRedirectTo: string;
        shouldCreateUser: boolean;
        data?: Record<string, string | boolean>;
      } = {
        emailRedirectTo,
        shouldCreateUser: mode === "register",
      };

      if (mode === "register") {
        options.data = {
          display_name: displayName.trim(),
          role,
          developing_games: role === "creator",
          account_intent_at: new Date().toISOString(),
        };
      }

      const { error: magicLinkError } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options,
      });

      if (magicLinkError) throw magicLinkError;

      setMessage(t("magicLinkSent"));
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : t("operationFailed")
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError(t("magicLinkEmailRequired"));
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? t("operationFailed"));
      }

      setMessage(t("resetEmailSent"));
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : t("operationFailed")
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (resetNewPassword.length < 8) {
      setError(t("resetPasswordMinLength"));
      setLoading(false);
      return;
    }

    if (resetNewPassword !== resetConfirmPassword) {
      setError(t("passwordMismatch"));
      setLoading(false);
      return;
    }

    const supabase = createClient();

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: resetNewPassword,
      });

      if (updateError) throw updateError;

      setMessage(t("resetPasswordSuccess"));
      setResetNewPassword("");
      setResetConfirmPassword("");

      window.setTimeout(() => {
        void goAfterAuth();
      }, 1200);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : t("operationFailed")
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (authMethod === "magicLink") {
      await handleMagicLink();
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);

    const supabase = createClient();

    try {
      if (mode === "register") {
        if (!displayName.trim()) {
          throw new Error(t("displayNameRequired"));
        }

        setAuthRedirectCookie(redirectTo);

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              display_name: displayName.trim(),
              role,
              developing_games: role === "creator",
              account_intent_at: new Date().toISOString(),
            },
            emailRedirectTo: `${getAuthCallbackUrl(window.location.origin)}?redirect=${encodeURIComponent(redirectTo)}`,
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

      if (rememberPassword) {
        saveRememberedCredentials(email.trim(), password);
      } else {
        clearRememberedCredentials();
      }

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
            className="hidden text-center lg:block"
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
            <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-zinc-400">
              {t("heroDesc")}
            </p>

            <div className="mx-auto mt-8 grid max-w-md gap-3">
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
            <div className="mb-6 text-center lg:hidden">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-1.5 text-xs font-medium text-cyan-300">
                <Sparkles className="size-3.5" />
                {t("badge")}
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                <span className="bg-gradient-to-br from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
                  {t("hero1")}
                </span>{" "}
                <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                  {t("hero2")}
                </span>
              </h1>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-zinc-400">
                {t("heroDesc")}
              </p>
            </div>

            <div className="absolute -inset-1 rounded-[28px] bg-gradient-to-r from-cyan-400 via-violet-500 to-fuchsia-500 opacity-40 blur-xl" />

            <Card className="relative overflow-hidden rounded-[24px] border-white/10 bg-zinc-900/80 py-0 shadow-2xl shadow-black/50 backdrop-blur-xl">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />

              <CardHeader className="gap-4 px-6 pt-6 pb-0">
                {authView === "form" && (
                  <div className="flex rounded-xl border border-white/10 bg-white/5 p-1">
                    {(["login", "register"] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => {
                          setMode(tab);
                          setAuthMethod("password");
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
                )}

                <div className="text-center">
                  <CardTitle className="text-2xl text-white">{cardTitle}</CardTitle>
                  <CardDescription className="mt-1 text-zinc-400">
                    {cardDescription}
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
                      <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2.5 text-center text-sm text-cyan-100">
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
                ) : authView === "forgot" ? (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="forgot-email" className="block text-center text-zinc-300">
                        Email
                      </Label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-500" />
                        <Input
                          id="forgot-email"
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
                      ) : (
                        t("sendResetLink")
                      )}
                    </Button>

                    <button
                      type="button"
                      onClick={() => {
                        setAuthView("form");
                        setError(null);
                        setMessage(null);
                      }}
                      className="w-full text-center text-sm text-cyan-400 hover:text-cyan-300 hover:underline"
                    >
                      {t("backToLogin")}
                    </button>
                  </form>
                ) : authView === "reset" ? (
                  resetSessionReady === false ? (
                    <div className="space-y-4 text-center">
                      <p className="text-sm text-zinc-400">{t("resetSessionRequired")}</p>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthView("forgot");
                          setError(null);
                          setMessage(null);
                        }}
                        className="text-sm text-cyan-400 hover:text-cyan-300 hover:underline"
                      >
                        {t("sendResetLink")}
                      </button>
                    </div>
                  ) : resetSessionReady === null ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="size-6 animate-spin text-violet-400" />
                    </div>
                  ) : (
                    <form onSubmit={handleResetPassword} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="reset-password" className="block text-center text-zinc-300">
                          {t("newPassword")}
                        </Label>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-500" />
                          <Input
                            id="reset-password"
                            type="password"
                            autoComplete="new-password"
                            value={resetNewPassword}
                            onChange={(event) => setResetNewPassword(event.target.value)}
                            placeholder={t("resetPasswordMinLength")}
                            minLength={8}
                            required
                            className={cn(authInputClassName, "pl-10")}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label
                          htmlFor="reset-confirm-password"
                          className="block text-center text-zinc-300"
                        >
                          {t("confirmPassword")}
                        </Label>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-500" />
                          <Input
                            id="reset-confirm-password"
                            type="password"
                            autoComplete="new-password"
                            value={resetConfirmPassword}
                            onChange={(event) => setResetConfirmPassword(event.target.value)}
                            placeholder={t("confirmPassword")}
                            minLength={8}
                            required
                            className={cn(authInputClassName, "pl-10")}
                          />
                        </div>
                      </div>

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
                        ) : (
                          t("resetPasswordBtn")
                        )}
                      </Button>
                    </form>
                  )
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
                          <Label htmlFor="displayName" className="block text-center text-zinc-300">
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
                          <Label className="block text-center text-zinc-300">{t("accountRole")}</Label>
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
                    <Label htmlFor="email" className="block text-center text-zinc-300">
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
                    <div className="flex items-center justify-center gap-2">
                      <Label htmlFor="password" className="text-zinc-300">
                        {t("password")}
                      </Label>
                      {mode === "login" && (
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMethod((current) =>
                              current === "password" ? "magicLink" : "password"
                            );
                            setError(null);
                            setMessage(null);
                          }}
                          className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline"
                        >
                          {authMethod === "password"
                            ? t("useMagicLink")
                            : t("usePassword")}
                        </button>
                      )}
                      {mode === "register" && (
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMethod((current) =>
                              current === "password" ? "magicLink" : "password"
                            );
                            setError(null);
                            setMessage(null);
                          }}
                          className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline"
                        >
                          {authMethod === "password"
                            ? t("useMagicLinkRegister")
                            : t("usePassword")}
                        </button>
                      )}
                    </div>
                    {authMethod === "password" ? (
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
                    ) : (
                      <p className="rounded-xl border border-cyan-400/15 bg-cyan-500/5 px-3 py-2.5 text-center text-xs leading-relaxed text-cyan-100/90">
                        {t("magicLinkHint")}
                      </p>
                    )}

                    {mode === "login" && authMethod === "password" && (
                      <div className="flex items-center justify-between gap-3 pt-1">
                        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-400">
                          <Checkbox
                            checked={rememberPassword}
                            onCheckedChange={(checked) =>
                              setRememberPassword(checked === true)
                            }
                          />
                          <span>{t("rememberPassword")}</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setAuthView("forgot");
                            setError(null);
                            setMessage(null);
                          }}
                          className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline"
                        >
                          {t("forgotPassword")}
                        </button>
                      </div>
                    )}
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

                  <div className="grid gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={loading || oauthLoading !== null}
                      onClick={() => void handleOAuthSignIn("google")}
                      className={cn(
                        "h-11 w-full rounded-xl border-white/15 bg-white/5 text-zinc-100",
                        "hover:border-white/25 hover:bg-white/10"
                      )}
                    >
                      {oauthLoading === "google" ? (
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
                      type="button"
                      variant="outline"
                      disabled={loading || oauthLoading !== null}
                      onClick={() => void handleOAuthSignIn("discord")}
                      className={cn(
                        "h-11 w-full rounded-xl border-white/15 bg-white/5 text-zinc-100",
                        "hover:border-white/25 hover:bg-white/10"
                      )}
                    >
                      {oauthLoading === "discord" ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <>
                          <svg
                            className="size-4"
                            viewBox="0 0 24 24"
                            aria-hidden
                          >
                            <path
                              fill="#5865F2"
                              d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"
                            />
                          </svg>
                          {t("continueWithDiscord")}
                        </>
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      disabled={loading || oauthLoading !== null}
                      onClick={() => void handleOAuthSignIn("github")}
                      className={cn(
                        "h-11 w-full rounded-xl border-white/15 bg-white/5 text-zinc-100",
                        "hover:border-white/25 hover:bg-white/10"
                      )}
                    >
                      {oauthLoading === "github" ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <>
                          <svg
                            className="size-4"
                            viewBox="0 0 24 24"
                            aria-hidden
                          >
                            <path
                              fill="currentColor"
                              d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
                            />
                          </svg>
                          {t("continueWithGithub")}
                        </>
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      disabled={loading || oauthLoading !== null}
                      onClick={() => void handleOAuthSignIn("twitch")}
                      className={cn(
                        "h-11 w-full rounded-xl border-white/15 bg-white/5 text-zinc-100",
                        "hover:border-white/25 hover:bg-white/10"
                      )}
                    >
                      {oauthLoading === "twitch" ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <>
                          <svg
                            className="size-4"
                            viewBox="0 0 24 24"
                            aria-hidden
                          >
                            <path
                              fill="#9146FF"
                              d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"
                            />
                          </svg>
                          {t("continueWithTwitch")}
                        </>
                      )}
                    </Button>
                  </div>

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
                    ) : authMethod === "magicLink" ? (
                      mode === "login" ? t("sendMagicLink") : t("sendMagicLinkRegister")
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
