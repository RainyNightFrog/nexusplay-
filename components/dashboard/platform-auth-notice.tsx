"use client";

import { Cloud, LogIn } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const BASIC_SDK_SNIPPET = `// 玩家登入由平台處理，遊戲內無需自建登入 UI
const user = await RainyNightFrog.waitForAuth();
if (user) {
  const save = await RainyNightFrog.loadSave();
  // 還原 save ...
}
await RainyNightFrog.saveSave({ level: 1, coins: 100 });`;

const MERGE_SDK_SNIPPET = `// 訪客可玩；登入後合併本機 + 雲端並上傳
await RainyNightFrog.waitForAuth();
const save = await RainyNightFrog.loadSaveMerged("my-game-save");
// 或：RainyNightFrog.loadSaveMerged(() => readYourOldLocalSave())`;

const IMPORT_SDK_SNIPPET = `// 舊平台玩家：登入後輸入創作者提供的遷移碼
await RainyNightFrog.waitForAuth();
const save = await RainyNightFrog.importLegacySave(playerEnteredCode);
// 成功後 save 已寫入 RainyNightFrog 雲端`;

type PlatformAuthNoticeProps = {
  className?: string;
};

export function PlatformAuthNotice({ className }: PlatformAuthNoticeProps) {
  const t = useTranslations("dashboard");

  return (
    <section
      className={cn(
        "rounded-2xl border border-sky-400/20 bg-sky-500/[0.06] p-4 sm:p-5",
        className
      )}
    >
      <div className="mx-auto max-w-2xl space-y-3 text-center">
        <div className="flex justify-center">
          <div className="flex size-10 items-center justify-center rounded-xl border border-sky-400/25 bg-sky-500/10 text-sky-300">
            <Cloud className="size-5" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <h3 className="text-sm font-semibold text-white">
              {t("platformAuthNoticeTitle")}
            </h3>
            <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/20 bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-sky-300">
              <LogIn className="size-3" />
              {t("platformAuthNoticeBadge")}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-zinc-400">
            {t("platformAuthNoticeDesc")}
          </p>
        </div>

        <ul className="mx-auto max-w-xl space-y-1.5 text-xs leading-relaxed text-zinc-500">
          <li>{t("platformAuthNoticePoint1")}</li>
          <li>{t("platformAuthNoticePoint2")}</li>
          <li>{t("platformAuthNoticePoint3")}</li>
          <li>{t("platformAuthNoticePoint4")}</li>
          <li>{t("platformAuthNoticePoint5")}</li>
        </ul>

        <details className="group rounded-xl border border-white/10 bg-black/20 text-left">
          <summary className="cursor-pointer px-3 py-2 text-center text-xs font-medium text-sky-300 hover:text-sky-200">
            {t("platformAuthNoticeSdkToggle")}
          </summary>
          <pre className="overflow-x-auto px-3 pb-3 text-[11px] leading-relaxed text-zinc-400">
            <code>{BASIC_SDK_SNIPPET}</code>
          </pre>
        </details>
        <details className="group rounded-xl border border-white/10 bg-black/20 text-left">
          <summary className="cursor-pointer px-3 py-2 text-center text-xs font-medium text-sky-300 hover:text-sky-200">
            {t("platformAuthNoticeMergeToggle")}
          </summary>
          <pre className="overflow-x-auto px-3 pb-3 text-[11px] leading-relaxed text-zinc-400">
            <code>{MERGE_SDK_SNIPPET}</code>
          </pre>
        </details>
        <details className="group rounded-xl border border-white/10 bg-black/20 text-left">
          <summary className="cursor-pointer px-3 py-2 text-center text-xs font-medium text-sky-300 hover:text-sky-200">
            {t("platformAuthNoticeImportToggle")}
          </summary>
          <pre className="overflow-x-auto px-3 pb-3 text-[11px] leading-relaxed text-zinc-400">
            <code>{IMPORT_SDK_SNIPPET}</code>
          </pre>
        </details>
      </div>
    </section>
  );
}
