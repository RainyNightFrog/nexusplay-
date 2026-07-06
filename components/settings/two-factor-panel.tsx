"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  accountFieldClassName,
  accountInputClassName,
  accountLabelClassName,
  accountSectionCompactClassName,
  accountSectionIntroClassName,
  accountSectionTitleClassName,
  settingsSectionHeaderRowClassName,
} from "@/components/settings/account-shell";

type TotpFactor = {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status: string;
};

export function TwoFactorPanel({ className }: { className?: string }) {
  const t = useTranslations("accountSettings");
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifiedFactor, setVerifiedFactor] = useState<TotpFactor | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");

  const loadFactors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) throw listError;

      const totp = (data.totp ?? []).find(
        (factor) => factor.status === "verified"
      );
      setVerifiedFactor(totp ?? null);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : t("twoFactorLoadFailed")
      );
    } finally {
      setLoading(false);
    }
  }, [supabase.auth, t]);

  useEffect(() => {
    void loadFactors();
  }, [loadFactors]);

  async function startEnroll() {
    setBusy(true);
    setError(null);
    try {
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Authenticator",
      });

      if (enrollError) throw enrollError;

      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setEnrolling(true);
      setVerifyCode("");
    } catch (enrollError) {
      setError(
        enrollError instanceof Error
          ? enrollError.message
          : t("twoFactorEnrollFailed")
      );
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnroll() {
    if (!factorId || verifyCode.trim().length < 6) return;

    setBusy(true);
    setError(null);
    try {
      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: verifyCode.trim(),
      });

      if (verifyError) throw verifyError;

      setEnrolling(false);
      setFactorId(null);
      setQrCode(null);
      setVerifyCode("");
      await loadFactors();
    } catch (confirmError) {
      setError(
        confirmError instanceof Error
          ? confirmError.message
          : t("twoFactorVerifyFailed")
      );
    } finally {
      setBusy(false);
    }
  }

  async function disableFactor() {
    if (!verifiedFactor) return;

    setBusy(true);
    setError(null);
    try {
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({
        factorId: verifiedFactor.id,
      });

      if (unenrollError) throw unenrollError;

      setVerifiedFactor(null);
      await loadFactors();
    } catch (disableError) {
      setError(
        disableError instanceof Error
          ? disableError.message
          : t("twoFactorDisableFailed")
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className={cn("flex justify-center py-6", className)}>
        <Loader2 className="size-6 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <section className={cn(accountSectionCompactClassName, className)}>
      <div className={settingsSectionHeaderRowClassName}>
        <h2 className={accountSectionTitleClassName}>
          <ShieldCheck className="size-4 text-cyan-400" />
          {t("twoFactorTitle")}
        </h2>
        <Badge
          className={cn(
            "shrink-0 border-0",
            verifiedFactor
              ? "bg-emerald-500/15 text-emerald-200"
              : "bg-zinc-700/50 text-zinc-300"
          )}
        >
          {verifiedFactor ? t("twoFactorEnabled") : t("twoFactorDisabled")}
        </Badge>
      </div>

      <p className={accountSectionIntroClassName}>{t("twoFactorDesc")}</p>

      {error && <p className="text-center text-sm text-rose-400">{error}</p>}

      {verifiedFactor ? (
        <div className="space-y-3">
          <p className="text-sm text-zinc-300">{t("twoFactorActiveHint")}</p>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => void disableFactor()}
            className="gap-2 border-rose-400/20 text-rose-200 hover:bg-rose-500/10"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ShieldOff className="size-4" />
            )}
            {t("twoFactorDisableBtn")}
          </Button>
        </div>
      ) : enrolling ? (
        <div className="space-y-4 rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-4">
          <p className="text-sm text-cyan-100">{t("twoFactorScanHint")}</p>
          {qrCode && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrCode}
              alt={t("twoFactorQrAlt")}
              className="mx-auto size-44 rounded-lg bg-white p-2"
            />
          )}
          <div className={accountFieldClassName}>
            <Label htmlFor="totp-code" className={accountLabelClassName}>
              {t("twoFactorCodeLabel")}
            </Label>
            <Input
              id="totp-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={verifyCode}
              onChange={(event) => setVerifyCode(event.target.value)}
              placeholder="000000"
              className={cn(accountInputClassName, "tracking-widest")}
            />
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              type="button"
              disabled={busy || verifyCode.trim().length < 6}
              onClick={() => void confirmEnroll()}
              className="gap-2 bg-cyan-600 hover:bg-cyan-500"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("twoFactorConfirmBtn")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setEnrolling(false);
                setFactorId(null);
                setQrCode(null);
                setVerifyCode("");
              }}
            >
              {t("twoFactorCancelBtn")}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          disabled={busy}
          onClick={() => void startEnroll()}
          className="gap-2 bg-cyan-600 hover:bg-cyan-500"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          {t("twoFactorEnableBtn")}
        </Button>
      )}
    </section>
  );
}
