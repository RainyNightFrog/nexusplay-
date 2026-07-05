"use client";

import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/checkbox";
import { settingsToggleRowClassName } from "@/components/settings/account-shell";

type PushCategorySettingsProps = {
  pushNotifyForum: boolean;
  pushNotifyFollow: boolean;
  onForumChange: (enabled: boolean) => void;
  onFollowChange: (enabled: boolean) => void;
  disabled?: boolean;
};

export function PushCategorySettings({
  pushNotifyForum,
  pushNotifyFollow,
  onForumChange,
  onFollowChange,
  disabled,
}: PushCategorySettingsProps) {
  const t = useTranslations("settings");

  return (
    <div className="ml-1 space-y-2 border-l border-white/10 pl-4">
      <label htmlFor="pushNotifyForum" className={settingsToggleRowClassName}>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-sm font-medium text-zinc-200">{t("pushNotifyForum")}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
            {t("pushNotifyForumDesc")}
          </p>
        </div>
        <Checkbox
          id="pushNotifyForum"
          checked={pushNotifyForum}
          disabled={disabled}
          onCheckedChange={(value) => onForumChange(value === true)}
          className="shrink-0 border-white/20 data-checked:border-violet-500 data-checked:bg-violet-500"
        />
      </label>

      <label htmlFor="pushNotifyFollow" className={settingsToggleRowClassName}>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-sm font-medium text-zinc-200">{t("pushNotifyFollow")}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
            {t("pushNotifyFollowDesc")}
          </p>
        </div>
        <Checkbox
          id="pushNotifyFollow"
          checked={pushNotifyFollow}
          disabled={disabled}
          onCheckedChange={(value) => onFollowChange(value === true)}
          className="shrink-0 border-white/20 data-checked:border-violet-500 data-checked:bg-violet-500"
        />
      </label>
    </div>
  );
}
