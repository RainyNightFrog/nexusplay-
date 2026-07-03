"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Check,
  Gamepad2,
  Globe,
  Loader2,
  Monitor,
  Moon,
  Palette,
  RotateCcw,
  Sparkles,
  Sun,
  UserRound,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useAppSettings } from "@/components/settings/app-settings-provider";
import type { AppLanguage, AppTheme } from "@/lib/app-settings";
import {
  AccountShell,
  accountCardClassName,
  accountFieldClassName,
  accountLabelClassName,
  accountSectionTitleClassName,
  settingsToggleRowClassName,
} from "@/components/settings/account-shell";
import { cn } from "@/lib/utils";

function SettingsToggle({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label htmlFor={id} className={settingsToggleRowClassName}>
      <div className="min-w-0 flex-1 text-left">
        <p className="text-sm font-medium text-zinc-200">{label}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">{description}</p>
      </div>
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        disabled={disabled}
        className="shrink-0 border-white/20 data-checked:border-violet-500 data-checked:bg-violet-500"
      />
    </label>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { profile, loading } = useAuth();
  const { settings, ready, updateSettings, resetSettings } = useAppSettings();
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!profile) {
      router.replace("/auth?redirect=/settings");
    }
  }, [loading, profile, router]);

  function handleReset() {
    resetSettings();
    showToast("已恢復預設設定");
  }

  if (loading || !profile || !ready) {
    return (
      <div className="dark flex min-h-full items-center justify-center bg-zinc-950">
        <Loader2 className="size-8 animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <AccountShell
      title="設定"
      description="調整外觀、通知、遊戲體驗與無障礙選項——變更會立即儲存至本機"
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-6"
      >
        <div className={accountCardClassName}>
          <section className="space-y-5">
            <h2 className={accountSectionTitleClassName}>
              <Palette className="size-4 text-violet-400" />
              外觀與顯示
            </h2>

            <div className={accountFieldClassName}>
              <Label className={accountLabelClassName}>主題模式</Label>
              <Select
                value={settings.theme}
                onValueChange={(value) => {
                  if (value) updateSettings({ theme: value as AppTheme });
                }}
              >
                <SelectTrigger className="mx-auto w-full max-w-xs border-white/10 bg-white/5 text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-zinc-900 text-zinc-100">
                  <SelectItem value="dark">
                    <span className="flex items-center gap-2">
                      <Moon className="size-3.5" /> 深色
                    </span>
                  </SelectItem>
                  <SelectItem value="light">
                    <span className="flex items-center gap-2">
                      <Sun className="size-3.5" /> 淺色
                    </span>
                  </SelectItem>
                  <SelectItem value="system">
                    <span className="flex items-center gap-2">
                      <Monitor className="size-3.5" /> 跟隨系統
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <SettingsToggle
              id="compactLayout"
              label="精簡版面"
              description="縮小卡片間距，在相同螢幕顯示更多內容"
              checked={settings.compactLayout}
              onCheckedChange={(checked) => updateSettings({ compactLayout: checked })}
            />
          </section>
        </div>

        <div className={accountCardClassName}>
          <section className="space-y-5">
            <h2 className={accountSectionTitleClassName}>
              <Globe className="size-4 text-cyan-400" />
              語言
            </h2>

            <div className={accountFieldClassName}>
              <Label className={accountLabelClassName}>介面語言</Label>
              <Select
                value={settings.language}
                onValueChange={(value) => {
                  if (value) updateSettings({ language: value as AppLanguage });
                }}
              >
                <SelectTrigger className="mx-auto w-full max-w-xs border-white/10 bg-white/5 text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-zinc-900 text-zinc-100">
                  <SelectItem value="zh-Hant">繁體中文</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-zinc-600">
                部分頁面仍為繁中，完整多語系將於後續版本提供
              </p>
            </div>
          </section>
        </div>

        <div className={accountCardClassName}>
          <section className="space-y-4">
            <h2 className={accountSectionTitleClassName}>
              <Bell className="size-4 text-amber-400" />
              通知偏好
            </h2>

            <SettingsToggle
              id="forumReplyNotify"
              label="討論區回覆通知"
              description="有人回覆你的文章或留言時提醒"
              checked={settings.forumReplyNotify}
              onCheckedChange={(checked) =>
                updateSettings({ forumReplyNotify: checked })
              }
            />

            <SettingsToggle
              id="forumEmailDigest"
              label="每週討論摘要"
              description="以電子郵件接收關注遊戲的熱門討論摘要"
              checked={settings.forumEmailDigest}
              onCheckedChange={(checked) =>
                updateSettings({ forumEmailDigest: checked })
              }
            />
          </section>
        </div>

        <div className={accountCardClassName}>
          <section className="space-y-4">
            <h2 className={accountSectionTitleClassName}>
              <Gamepad2 className="size-4 text-emerald-400" />
              遊戲體驗
            </h2>

            <SettingsToggle
              id="gameAutoplay"
              label="自動載入遊戲"
              description="進入遊戲頁時立即開始載入，無需再按開始"
              checked={settings.gameAutoplay}
              onCheckedChange={(checked) => updateSettings({ gameAutoplay: checked })}
            />

            <SettingsToggle
              id="showMatureContent"
              label="顯示成人向標記內容"
              description="在瀏覽與推薦中顯示標記為成人向的遊戲"
              checked={settings.showMatureContent}
              onCheckedChange={(checked) =>
                updateSettings({ showMatureContent: checked })
              }
            />
          </section>
        </div>

        <div className={accountCardClassName}>
          <section className="space-y-4">
            <h2 className={accountSectionTitleClassName}>
              <Zap className="size-4 text-sky-400" />
              無障礙與效能
            </h2>

            <SettingsToggle
              id="reduceMotion"
              label="減少動態效果"
              description="降低頁面動畫與過渡效果，減輕暈動症不適"
              checked={settings.reduceMotion}
              onCheckedChange={(checked) => updateSettings({ reduceMotion: checked })}
            />
          </section>
        </div>

        <div className={cn(accountCardClassName, "border-dashed")}>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="text-center sm:text-left">
              <p className="flex items-center justify-center gap-2 text-sm font-medium text-white sm:justify-start">
                <Sparkles className="size-4 text-violet-400" />
                恢復預設
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                將所有系統設定還原為 NexusPlay 預設值
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              className="gap-2 border-white/10 bg-white/5 text-zinc-200 hover:border-rose-400/30 hover:text-rose-200"
            >
              <RotateCcw className="size-4" />
              重置設定
            </Button>
          </div>
        </div>

        <p className="flex items-center justify-center gap-2 text-xs text-zinc-600">
          <UserRound className="size-3.5" />
          頭像、暱稱與帳戶權限請至
          <Link href="/profile" className="text-cyan-400 hover:text-cyan-300">
            個人資料
          </Link>
        </p>
      </motion.div>

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
    </AccountShell>
  );
}
