"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { settingsToggleRowClassName } from "@/components/settings/account-shell";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

type PushNotificationSettingsProps = {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  disabled?: boolean;
};

export function PushNotificationSettings({
  enabled,
  onEnabledChange,
  disabled,
}: PushNotificationSettingsProps) {
  const t = useTranslations("settings");
  const [supported, setSupported] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setSupported(
      typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window
    );
  }, []);

  useEffect(() => {
    fetch("/api/push/vapid-public-key")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { configured?: boolean } | null) => {
        setConfigured(data?.configured === true);
      })
      .catch(() => setConfigured(false));
  }, []);

  const subscribe = useCallback(async () => {
    setBusy(true);
    setStatus(null);

    try {
      const vapidResponse = await fetch("/api/push/vapid-public-key");
      const vapidData = (await vapidResponse.json()) as {
        configured?: boolean;
        publicKey?: string | null;
      };

      if (!vapidData.configured || !vapidData.publicKey) {
        setStatus(t("pushNotConfigured"));
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(t("pushPermissionDenied"));
        onEnabledChange(false);
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidData.publicKey),
      });

      const json = subscription.toJSON();
      const endpoint = json.endpoint;
      const p256dh = json.keys?.p256dh;
      const auth = json.keys?.auth;

      if (!endpoint || !p256dh || !auth) {
        throw new Error("Invalid subscription");
      }

      const response = await fetch("/api/auth/push-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint, keys: { p256dh, auth } }),
      });

      if (!response.ok) {
        throw new Error("Failed to save subscription");
      }

      onEnabledChange(true);
      setStatus(t("pushEnabled"));
    } catch {
      setStatus(t("pushEnableFailed"));
      onEnabledChange(false);
    } finally {
      setBusy(false);
    }
  }, [onEnabledChange, t]);

  const unsubscribe = useCallback(async () => {
    setBusy(true);
    setStatus(null);

    try {
      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      const subscription = registration
        ? await registration.pushManager.getSubscription()
        : null;

      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await fetch("/api/auth/push-subscription", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      } else {
        await fetch("/api/auth/push-subscription", { method: "DELETE" });
      }

      onEnabledChange(false);
      setStatus(t("pushDisabled"));
    } catch {
      setStatus(t("pushDisableFailed"));
    } finally {
      setBusy(false);
    }
  }, [onEnabledChange, t]);

  async function handleCheckedChange(checked: boolean) {
    if (checked) {
      await subscribe();
    } else {
      await unsubscribe();
    }
  }

  async function handleTestPush() {
    setTesting(true);
    setStatus(null);
    try {
      const response = await fetch("/api/auth/push/test", { method: "POST" });
      const data = (await response.json()) as { error?: string; sent?: number };
      if (!response.ok) {
        setStatus(data.error ?? t("pushTestFailed"));
        return;
      }
      setStatus(t("pushTestSent", { count: data.sent ?? 1 }));
    } catch {
      setStatus(t("pushTestFailed"));
    } finally {
      setTesting(false);
    }
  }

  if (!supported) {
    return (
      <p className="text-xs leading-relaxed text-zinc-500">{t("pushUnsupported")}</p>
    );
  }

  return (
    <div className="space-y-2">
      <label htmlFor="pushNotify" className={settingsToggleRowClassName}>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-sm font-medium text-zinc-200">{t("pushNotify")}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
            {configured ? t("pushNotifyDesc") : t("pushNotConfigured")}
          </p>
        </div>
        {busy ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-violet-400" />
        ) : (
          <Checkbox
            id="pushNotify"
            checked={enabled}
            onCheckedChange={(value) => void handleCheckedChange(value === true)}
            disabled={disabled || busy || !configured}
            className="shrink-0 border-white/20 data-checked:border-violet-500 data-checked:bg-violet-500"
          />
        )}
      </label>
      {enabled && configured ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={testing || busy}
          onClick={() => void handleTestPush()}
          className="border-white/10 bg-white/5 text-zinc-300 hover:border-violet-400/30"
        >
          {testing ? (
            <>
              <Loader2 className="mr-2 size-3.5 animate-spin" />
              {t("pushTestSending")}
            </>
          ) : (
            t("pushTestBtn")
          )}
        </Button>
      ) : null}
      {status ? <p className="text-xs text-zinc-500">{status}</p> : null}
    </div>
  );
}
