"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Loader2, LogOut, Heart, Palette, Settings, Shield, UserRound, Bell } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { getInitials } from "@/lib/auth";
import { getCreatorDashboardHref } from "@/lib/creator-nav";
import { NotificationBell } from "@/components/layout/notification-bell";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export function UserNav() {
  const t = useTranslations("nav");
  const { profile, loading, signOut, isCreator, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loading && !profile) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className="size-9 rounded-full border-white/10 bg-white/5 p-0"
      >
        <Loader2 className="size-4 animate-spin text-zinc-400" />
      </Button>
    );
  }

  if (!profile) {
    return (
      <Link
        href="/auth"
        className={cn(
          buttonVariants({ size: "sm" }),
          "border-0 bg-gradient-to-r from-cyan-500 to-violet-600 text-white shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-violet-500"
        )}
      >
        {t("login")}
      </Link>
    );
  }

  const initials = getInitials(profile.display_name);

  return (
    <div className="flex items-center gap-2">
      <NotificationBell />
      <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "relative flex size-9 items-center justify-center overflow-hidden rounded-full",
          "border border-cyan-400/30 bg-gradient-to-br from-cyan-500/30 to-violet-600/40",
          "shadow-md shadow-cyan-500/20 transition-transform hover:scale-105"
        )}
        aria-label={t("userMenu")}
      >
        {profile.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt={profile.display_name}
            fill
            className="object-cover"
          />
        ) : (
          <span className="text-xs font-bold text-white">{initials}</span>
        )}
      </button>

      {open && (
        <div
          className={cn(
            "absolute right-0 top-11 z-50 min-w-52 overflow-hidden rounded-xl",
            "border border-white/10 bg-zinc-900/95 p-1 text-center shadow-2xl shadow-black/50 backdrop-blur-xl"
          )}
        >
          <div className="border-b border-white/5 px-3 py-2.5 text-center">
            <p className="truncate text-sm font-medium text-white">
              {profile.display_name}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              {isAdmin
                ? t("roleAdmin")
                : isCreator
                  ? t("roleCreator")
                  : t("rolePlayer")}
            </p>
          </div>

          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 hover:text-white"
            >
              <Shield className="size-4 text-amber-400" />
              {t("adminCenter")}
            </Link>
          )}

          {isCreator && (
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 hover:text-white"
            >
              <Palette className="size-4 text-violet-400" />
              {t("creatorDashboard")}
            </Link>
          )}

          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 hover:text-white"
          >
            <UserRound className="size-4 text-cyan-400" />
            {t("profile")}
          </Link>

          <Link
            href="/settings/favorites"
            onClick={() => setOpen(false)}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 hover:text-white"
          >
            <Heart className="size-4 text-rose-400" />
            {t("favorites")}
          </Link>

          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 hover:text-white"
          >
            <Bell className="size-4 text-amber-400" />
            {t("notifications")}
          </Link>

          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 hover:text-white"
          >
            <Settings className="size-4 text-violet-400" />
            {t("settings")}
          </Link>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              signOut();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 hover:text-rose-300"
          >
            <LogOut className="size-4" />
            {t("signOut")}
          </button>
        </div>
      )}
      </div>
    </div>
  );
}

export function CreatorDashboardLink() {
  const t = useTranslations("nav");
  const { profile, loading, isCreator } = useAuth();

  const href = getCreatorDashboardHref(profile, isCreator);

  if (loading && !profile) {
    return (
      <span
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "hidden border-white/10 bg-white/5 sm:inline-flex"
        )}
      >
        <Loader2 className="size-3.5 animate-spin" />
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        buttonVariants({ variant: "outline", size: "sm" }),
        "hidden border-white/10 bg-white/5 text-zinc-200 backdrop-blur-sm hover:border-violet-400/30 hover:bg-violet-500/10 hover:text-white sm:inline-flex"
      )}
    >
      {t("creatorDashboard")}
    </Link>
  );
}
