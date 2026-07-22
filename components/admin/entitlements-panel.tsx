"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { KeyRound, Loader2, Search } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectDisplayValue,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import type { AdminUserRecord } from "@/lib/admin-users-service";
import { AdminPanelFrame } from "@/components/admin/admin-panel-frame";

type GameOption = {
  id: number;
  title: string;
};

export function AdminEntitlementsPanel() {
  const t = useTranslations("admin");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [games, setGames] = useState<GameOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedGameId, setSelectedGameId] = useState("");
  const [searching, setSearching] = useState(false);
  const [loadingGames, setLoadingGames] = useState(true);
  const [submitting, setSubmitting] = useState<"grant" | "revoke" | null>(null);

  const loadGames = useCallback(async () => {
    setLoadingGames(true);
    try {
      const response = await fetch("/api/admin/games?status=approved");
      const data = (await response.json()) as {
        games?: Array<{ id: number; title: string }>;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? t("entitlementsGamesFailed"));
      setGames(
        (data.games ?? []).map((game) => ({
          id: game.id,
          title: game.title,
        }))
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : t("entitlementsGamesFailed")
      );
    } finally {
      setLoadingGames(false);
    }
  }, [t]);

  useEffect(() => {
    void loadGames();
  }, [loadGames]);

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    setSearching(true);
    setError(null);
    setSuccess(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      const response = await fetch(`/api/admin/users?${params.toString()}`);
      const data = (await response.json()) as {
        users?: AdminUserRecord[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? t("usersLoadFailed"));
      const list = data.users ?? [];
      setUsers(list);
      if (list.length === 1) {
        setSelectedUserId(list[0].id);
      }
    } catch (searchError) {
      setError(
        searchError instanceof Error ? searchError.message : t("usersLoadFailed")
      );
    } finally {
      setSearching(false);
    }
  }

  async function handleAction(action: "grant" | "revoke") {
    if (!selectedUserId || !selectedGameId) {
      setError(t("entitlementsMissingParams"));
      return;
    }

    setSubmitting(action);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/admin/entitlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          userId: selectedUserId,
          gameId: Number.parseInt(selectedGameId, 10),
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? t("entitlementsActionFailed"));
      }
      setSuccess(
        action === "grant"
          ? t("entitlementsGrantSuccess")
          : t("entitlementsRevokeSuccess")
      );
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : t("entitlementsActionFailed")
      );
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <AdminPanelFrame
      title={t("tabEntitlements")}
      description={t("entitlementsDesc")}
      onRefresh={() => void loadGames()}
      refreshing={loadingGames}
      refreshLabel={t("refresh")}
      error={error}
      centerContent
    >
      {success && (
        <p className="text-center text-sm text-emerald-300">{success}</p>
      )}

      <Card className="border-white/8 bg-zinc-900/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-white">
            <KeyRound className="size-4 text-cyan-400" />
            {t("entitlementsFormTitle")}
          </CardTitle>
          <CardDescription>{t("entitlementsFormDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("usersSearchPlaceholder")}
                className="border-white/10 bg-zinc-900/60 pl-9 text-white"
              />
            </div>
            <Button
              type="submit"
              variant="outline"
              disabled={searching}
              className="border-white/10"
            >
              {searching ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                t("usersSearch")
              )}
            </Button>
          </form>

          <div className="space-y-1.5">
            <Label>{t("entitlementsUserLabel")}</Label>
            <Select
              value={selectedUserId || undefined}
              onValueChange={(value) => setSelectedUserId(value ?? "")}
            >
              <SelectTrigger className="border-white/10 bg-white/5">
                <SelectDisplayValue
                  className={!selectedUserId ? "text-muted-foreground" : undefined}
                >
                  {(() => {
                    const user = users.find((item) => item.id === selectedUserId);
                    if (!user) return t("entitlementsUserPlaceholder");
                    return user.email
                      ? `${user.displayName} · ${user.email}`
                      : user.displayName;
                  })()}
                </SelectDisplayValue>
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.displayName}
                    {user.email ? ` · ${user.email}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{t("entitlementsGameLabel")}</Label>
            <Select
              value={selectedGameId || undefined}
              onValueChange={(value) => setSelectedGameId(value ?? "")}
              disabled={loadingGames}
            >
              <SelectTrigger className="border-white/10 bg-white/5">
                <SelectDisplayValue
                  className={!selectedGameId ? "text-muted-foreground" : undefined}
                >
                  {(() => {
                    const game = games.find(
                      (item) => String(item.id) === selectedGameId
                    );
                    if (!game) return t("entitlementsGamePlaceholder");
                    return `#${game.id} · ${game.title}`;
                  })()}
                </SelectDisplayValue>
              </SelectTrigger>
              <SelectContent>
                {games.map((game) => (
                  <SelectItem key={game.id} value={String(game.id)}>
                    #{game.id} · {game.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={!!submitting || !selectedUserId || !selectedGameId}
              onClick={() => void handleAction("grant")}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              {submitting === "grant" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                t("entitlementsGrant")
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!!submitting || !selectedUserId || !selectedGameId}
              onClick={() => {
                if (!window.confirm(t("entitlementsRevokeConfirm"))) return;
                void handleAction("revoke");
              }}
              className="border-rose-400/20 text-rose-200"
            >
              {submitting === "revoke" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                t("entitlementsRevoke")
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </AdminPanelFrame>
  );
}
