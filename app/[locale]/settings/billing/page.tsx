"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, MapPin, Save } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { AccountSettingsPageHeader } from "@/components/settings/account-settings-layout";
import {
  accountCardClassName,
  accountFieldClassName,
  accountInputClassName,
  accountLabelClassName,
  accountSectionTitleClassName,
} from "@/components/settings/account-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useApiError } from "@/hooks/use-api-error";
import type { BillingAddress } from "@/lib/billing-address";
import { cn } from "@/lib/utils";

const EMPTY_BILLING: BillingAddress = {
  billing_name: "",
  billing_line1: "",
  billing_line2: "",
  billing_city: "",
  billing_region: "",
  billing_postal: "",
  billing_country: "HK",
};

export default function BillingSettingsPage() {
  const t = useTranslations("accountSettings");
  const { translateApiError } = useApiError();
  const router = useRouter();
  const { profile, loading } = useAuth();

  const [billing, setBilling] = useState<BillingAddress>(EMPTY_BILLING);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!profile) {
      router.replace("/auth?redirect=/settings/billing");
      return;
    }

    fetch("/api/auth/billing", { credentials: "same-origin" })
      .then((response) => response.json())
      .then((data: { billing?: BillingAddress }) => {
        if (data.billing) {
          setBilling({
            billing_name: data.billing.billing_name ?? "",
            billing_line1: data.billing.billing_line1 ?? "",
            billing_line2: data.billing.billing_line2 ?? "",
            billing_city: data.billing.billing_city ?? "",
            billing_region: data.billing.billing_region ?? "",
            billing_postal: data.billing.billing_postal ?? "",
            billing_country: data.billing.billing_country ?? "HK",
          });
        }
      })
      .finally(() => setFetching(false));
  }, [loading, profile, router]);

  function updateField(key: keyof BillingAddress, value: string) {
    setBilling((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/billing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(billing),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? t("saveFailed"));
      }
      showToast(t("saved"));
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? translateApiError(saveError.message)
          : t("saveFailed")
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading || !profile || fetching) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <>
      <AccountSettingsPageHeader
        title={t("billingTitle")}
        description={t("billingDesc")}
      />

      <div className={accountCardClassName}>
        <section className="space-y-5 text-left">
          <h2 className={accountSectionTitleClassName}>
            <MapPin className="size-4 text-cyan-400" />
            {t("billingSection")}
          </h2>
          <p className="text-xs leading-relaxed text-zinc-500">
            {t("billingSectionDesc")}
          </p>

          <div className={accountFieldClassName}>
            <Label htmlFor="billing-name" className={accountLabelClassName}>
              {t("billingNameLabel")}
            </Label>
            <Input
              id="billing-name"
              value={billing.billing_name ?? ""}
              onChange={(event) => updateField("billing_name", event.target.value)}
              placeholder={t("billingNamePlaceholder")}
              className={cn(accountInputClassName, "text-left")}
            />
          </div>

          <div className={accountFieldClassName}>
            <Label htmlFor="billing-line1" className={accountLabelClassName}>
              {t("billingLine1Label")}
            </Label>
            <Input
              id="billing-line1"
              value={billing.billing_line1 ?? ""}
              onChange={(event) => updateField("billing_line1", event.target.value)}
              placeholder={t("billingLine1Placeholder")}
              className={cn(accountInputClassName, "text-left")}
            />
          </div>

          <div className={accountFieldClassName}>
            <Label htmlFor="billing-line2" className={accountLabelClassName}>
              {t("billingLine2Label")}
            </Label>
            <Input
              id="billing-line2"
              value={billing.billing_line2 ?? ""}
              onChange={(event) => updateField("billing_line2", event.target.value)}
              placeholder={t("billingLine2Placeholder")}
              className={cn(accountInputClassName, "text-left")}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className={accountFieldClassName}>
              <Label htmlFor="billing-city" className={accountLabelClassName}>
                {t("billingCityLabel")}
              </Label>
              <Input
                id="billing-city"
                value={billing.billing_city ?? ""}
                onChange={(event) => updateField("billing_city", event.target.value)}
                className={cn(accountInputClassName, "text-left")}
              />
            </div>
            <div className={accountFieldClassName}>
              <Label htmlFor="billing-region" className={accountLabelClassName}>
                {t("billingRegionLabel")}
              </Label>
              <Input
                id="billing-region"
                value={billing.billing_region ?? ""}
                onChange={(event) =>
                  updateField("billing_region", event.target.value)
                }
                className={cn(accountInputClassName, "text-left")}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className={accountFieldClassName}>
              <Label htmlFor="billing-postal" className={accountLabelClassName}>
                {t("billingPostalLabel")}
              </Label>
              <Input
                id="billing-postal"
                value={billing.billing_postal ?? ""}
                onChange={(event) =>
                  updateField("billing_postal", event.target.value)
                }
                className={cn(accountInputClassName, "text-left")}
              />
            </div>
            <div className={accountFieldClassName}>
              <Label htmlFor="billing-country" className={accountLabelClassName}>
                {t("billingCountryLabel")}
              </Label>
              <Input
                id="billing-country"
                value={billing.billing_country ?? ""}
                onChange={(event) =>
                  updateField("billing_country", event.target.value)
                }
                placeholder="HK"
                className={cn(accountInputClassName, "text-left")}
              />
            </div>
          </div>

          {error && <p className="text-center text-sm text-rose-400">{error}</p>}

          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full gap-2 bg-violet-600 hover:bg-violet-500"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {t("saveBtn")}
          </Button>
        </section>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={cn(
              "fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2",
              "rounded-full border border-violet-400/30 bg-zinc-900/95 px-5 py-2.5",
              "text-sm text-violet-100 shadow-xl backdrop-blur-md"
            )}
          >
            <Check className="size-4 text-violet-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
