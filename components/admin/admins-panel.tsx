"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Shield, UserPlus, UserX } from "lucide-react";
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
import { AdminPanelFrame } from "@/components/admin/admin-panel-frame";

type AdminAccount = {
  id: string;
  displayName: string;
  username: string | null;
  email: string | null;
  metadataAdmin: boolean;
  createdAt: string | null;
};

export function AdminAdminsPanel() {
  const t = useTranslations("admin");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const loadAdmins = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/admins");
      const data = (await response.json()) as {
        admins?: AdminAccount[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? t("adminsLoadFailed"));
      setAdmins(data.admins ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : t("adminsLoadFailed")
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadAdmins();
  }, [loadAdmins]);

  async function handleAddAdmin(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;

    setAdding(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? t("adminsAddFailed"));
      setEmail("");
      await loadAdmins();
    } catch (addError) {
      setError(
        addError instanceof Error ? addError.message : t("adminsAddFailed")
      );
    } finally {
      setAdding(false);
    }
  }

  async function handleRevoke(userId: string) {
    if (!window.confirm(t("adminsRevokeConfirm"))) return;

    setRevokingId(userId);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/admins?userId=${encodeURIComponent(userId)}`,
        { method: "DELETE" }
      );
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? t("adminsRevokeFailed"));
      await loadAdmins();
    } catch (revokeError) {
      setError(
        revokeError instanceof Error
          ? revokeError.message
          : t("adminsRevokeFailed")
      );
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <AdminPanelFrame
      title={t("tabAdmins")}
      description={t("adminsDesc")}
      onRefresh={() => void loadAdmins()}
      refreshing={loading}
      refreshLabel={t("refresh")}
      error={error}
      centerContent
    >
      <Card className="border-white/8 bg-zinc-900/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <UserPlus className="size-4 text-amber-400" />
            {t("adminsAddTitle")}
          </CardTitle>
          <CardDescription>{t("adminsAddDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddAdmin} className="flex flex-wrap gap-3">
            <div className="min-w-[200px] flex-1 space-y-2">
              <Label htmlFor="admin-email">{t("adminsEmailLabel")}</Label>
              <Input
                id="admin-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t("adminsEmailPlaceholder")}
                className="border-white/10 bg-black/30 text-white"
              />
            </div>
            <div className="flex items-end">
              <Button
                type="submit"
                disabled={adding || !email.trim()}
                className="gap-2 bg-amber-600 hover:bg-amber-500"
              >
                {adding ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <UserPlus className="size-4" />
                )}
                {t("adminsAddBtn")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-white/8 bg-zinc-900/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <Shield className="size-4 text-amber-400" />
            {t("adminsListTitle")}
          </CardTitle>
          <CardDescription>{t("adminsListDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-6 animate-spin text-amber-400" />
            </div>
          ) : admins.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              {t("adminsEmpty")}
            </p>
          ) : (
            admins.map((admin) => (
              <div
                key={admin.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/20 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {admin.displayName}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-zinc-500">
                    {admin.email ?? admin.id}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={revokingId === admin.id}
                  onClick={() => void handleRevoke(admin.id)}
                  className="gap-1.5 border-rose-400/20 text-rose-200"
                >
                  {revokingId === admin.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <UserX className="size-3.5" />
                  )}
                  {t("adminsRevokeBtn")}
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </AdminPanelFrame>
  );
}
