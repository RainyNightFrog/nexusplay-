"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { validateCreatorUsername, normalizeCreatorUsername } from "@/lib/creator-username";
import { buildGameSubdomainUrl } from "@/lib/subdomain";
import { SubdomainUrlPreview } from "@/components/subdomain-url-preview";
import { cn } from "@/lib/utils";

type CreatorUsernameFieldProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function CreatorUsernameField({
  value,
  onChange,
  disabled = false,
}: CreatorUsernameFieldProps) {
  const t = useTranslations("profile");

  const validation = useMemo(() => {
    if (!value.trim()) return null;
    return validateCreatorUsername(value);
  }, [value]);

  const previewUrl = value.trim()
    ? buildGameSubdomainUrl(value.trim())
    : buildGameSubdomainUrl("username");

  return (
    <div className="space-y-2">
      <LabelLike>{t("creatorUsernameLabel")}</LabelLike>
      <div className="mx-auto flex max-w-md items-center gap-2">
        <span className="hidden shrink-0 text-xs text-zinc-500 sm:inline">
          https://
        </span>
        <input
          id="creator-username"
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(event) => onChange(normalizeCreatorUsername(event.target.value))}
          placeholder={t("creatorUsernamePlaceholder")}
          disabled={disabled}
          className={cn(
            "h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-center text-sm text-zinc-100",
            "placeholder:text-zinc-500 backdrop-blur-md outline-none transition-all duration-200",
            "focus:border-cyan-400/40 focus:bg-white/8 focus:ring-2 focus:ring-cyan-500/20"
          )}
        />
        <span className="hidden shrink-0 text-xs text-zinc-500 sm:inline">
          .rainynightfrog.com
        </span>
      </div>
      <p className="text-center text-xs text-zinc-500">{t("creatorUsernameHint")}</p>
      <SubdomainUrlPreview
        url={previewUrl}
        note={t("creatorUsernamePreviewNote")}
        tone="violet"
      />
      {value.trim() && validation && !validation.ok ? (
        <p className="text-center text-xs text-amber-300/90">{validation.error}</p>
      ) : null}
    </div>
  );
}

function LabelLike({ children }: { children: React.ReactNode }) {
  return (
    <label
      htmlFor="creator-username"
      className="block text-center text-sm font-medium text-zinc-200"
    >
      {children}
    </label>
  );
}
