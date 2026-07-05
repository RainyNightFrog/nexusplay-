"use client";

import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

type MfaChallengePanelProps = {
  factorId: string;
  onSuccess: () => void;
  onCancel: () => void;
};

export function MfaChallengePanel({
  factorId,
  onSuccess,
  onCancel,
}: MfaChallengePanelProps) {
  const t = useTranslations("auth");
  const supabase = createClient();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify(event: React.FormEvent) {
    event.preventDefault();
    if (code.trim().length < 6) return;

    setSubmitting(true);
    setError(null);

    try {
      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: code.trim(),
      });

      if (verifyError) throw verifyError;
      onSuccess();
    } catch (verifyError) {
      setError(
        verifyError instanceof Error ? verifyError.message : t("mfaVerifyFailed")
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleVerify} className="space-y-4 rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-cyan-100">
        <ShieldCheck className="size-4" />
        {t("mfaChallengeTitle")}
      </div>
      <p className="text-xs text-zinc-400">{t("mfaChallengeDesc")}</p>
      <div>
        <Label htmlFor="mfa-login-code" className="text-zinc-300">
          {t("mfaCodeLabel")}
        </Label>
        <Input
          id="mfa-login-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          className="mt-1.5 border-white/10 bg-white/5 tracking-widest"
        />
      </div>
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={submitting || code.trim().length < 6}>
          {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {t("mfaVerifyBtn")}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          {t("mfaCancelBtn")}
        </Button>
      </div>
    </form>
  );
}
