"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Download, Share, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  dismissForOneDay,
  isDismissedRecently,
  isIosDevice,
  isMobileDevice,
  isStandaloneDisplay,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa";
import { cn } from "@/lib/utils";

type PwaInstallContextValue = {
  /** 是否已在 standalone／已安裝模式 */
  isStandalone: boolean;
  /** iOS Safari（無 beforeinstallprompt） */
  isIos: boolean;
  /** 手機／平板（自動橫幅只在此顯示） */
  isMobile: boolean;
  /** Chromium 可觸發原生安裝 */
  canNativeInstall: boolean;
  /** 選單／設定是否顯示安裝入口（已安裝則否） */
  showInstallEntry: boolean;
  /** 觸發安裝流程（原生 prompt 或 iOS 教學） */
  promptInstall: () => Promise<void>;
};

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);

export function usePwaInstall(): PwaInstallContextValue {
  const ctx = useContext(PwaInstallContext);
  if (!ctx) {
    throw new Error("usePwaInstall must be used within PwaInstallProvider");
  }
  return ctx;
}

/** 選單等可選使用：Provider 外回傳安全預設 */
export function usePwaInstallOptional(): PwaInstallContextValue | null {
  return useContext(PwaInstallContext);
}

type PwaInstallProviderProps = {
  children: ReactNode;
};

export function PwaInstallProvider({ children }: PwaInstallProviderProps) {
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [iosGuideOpen, setIosGuideOpen] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);

  useEffect(() => {
    const standalone = isStandaloneDisplay();
    const ios = isIosDevice();
    const mobile = isMobileDevice();
    setIsStandalone(standalone);
    setIsIos(ios);
    setIsMobile(mobile);

    if (standalone) return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    const onInstalled = () => {
      setDeferredPrompt(null);
      setBannerVisible(false);
      setIsStandalone(true);
    };
    window.addEventListener("appinstalled", onInstalled);

    let timer: number | undefined;
    if (mobile && !isDismissedRecently()) {
      timer = window.setTimeout(() => {
        if (!isStandaloneDisplay()) {
          setBannerVisible(true);
        }
      }, 2800);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (isStandaloneDisplay()) return;

    if (isIosDevice()) {
      setBannerVisible(false);
      setIosGuideOpen(true);
      return;
    }

    if (deferredPrompt) {
      await deferredPrompt.prompt();
      try {
        await deferredPrompt.userChoice;
      } catch {
        /* ignore */
      }
      setDeferredPrompt(null);
      setBannerVisible(false);
      dismissForOneDay();
      return;
    }

    setBannerVisible(false);
    setIosGuideOpen(true);
  }, [deferredPrompt]);

  const dismissBanner = useCallback(() => {
    setBannerVisible(false);
    dismissForOneDay();
  }, []);

  const canNativeInstall = Boolean(deferredPrompt);
  const showInstallEntry = !isStandalone;

  const value = useMemo<PwaInstallContextValue>(
    () => ({
      isStandalone,
      isIos,
      isMobile,
      canNativeInstall,
      showInstallEntry,
      promptInstall,
    }),
    [
      isStandalone,
      isIos,
      isMobile,
      canNativeInstall,
      showInstallEntry,
      promptInstall,
    ]
  );

  return (
    <PwaInstallContext.Provider value={value}>
      {children}
      <PwaInstallPrompt
        bannerVisible={bannerVisible && isMobile && !isStandalone}
        onInstall={() => void promptInstall()}
        onDismiss={dismissBanner}
        iosGuideOpen={iosGuideOpen}
        onCloseIosGuide={() => setIosGuideOpen(false)}
        isIos={isIos}
      />
    </PwaInstallContext.Provider>
  );
}

type PwaInstallPromptProps = {
  bannerVisible: boolean;
  onInstall: () => void;
  onDismiss: () => void;
  iosGuideOpen: boolean;
  onCloseIosGuide: () => void;
  isIos: boolean;
};

function PwaInstallPrompt({
  bannerVisible,
  onInstall,
  onDismiss,
  iosGuideOpen,
  onCloseIosGuide,
  isIos,
}: PwaInstallPromptProps) {
  const t = useTranslations("pwa");

  return (
    <>
      <AnimatePresence>
        {bannerVisible && (
          <motion.div
            role="dialog"
            aria-label={t("install_title")}
            initial={{ opacity: 0, y: 48 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 32 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="pwa-install-banner fixed inset-x-3 z-[60] mx-auto max-w-md bottom-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-auto md:hidden"
          >
            <div
              className={cn(
                "relative overflow-hidden rounded-2xl border border-cyan-400/35",
                "bg-zinc-950/95 p-4 shadow-[0_0_40px_-8px_rgba(34,211,238,0.45)]",
                "ring-1 ring-violet-500/20 backdrop-blur-xl"
              )}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -right-8 -top-10 size-32 rounded-full bg-cyan-500/20 blur-3xl"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-10 -left-6 size-28 rounded-full bg-violet-600/25 blur-3xl"
              />

              <button
                type="button"
                onClick={onDismiss}
                className="absolute right-2 top-2 rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/5 hover:text-zinc-200"
                aria-label={t("banner_close")}
              >
                <X className="size-4" />
              </button>

              <div className="relative flex gap-3 pr-6">
                <div
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-xl",
                    "border border-cyan-400/30 bg-gradient-to-br from-cyan-500/25 to-violet-600/30",
                    "shadow-lg shadow-cyan-500/20"
                  )}
                >
                  <Smartphone className="size-5 text-cyan-300" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-sm font-semibold tracking-wide text-white">
                    {t("banner_headline")}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                    {t("install_desc")}
                  </p>
                </div>
              </div>

              <div className="relative mt-3.5 flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={onInstall}
                  className={cn(
                    "flex-1 gap-1.5 border-0 bg-gradient-to-r from-cyan-500 to-violet-600",
                    "text-white shadow-md shadow-cyan-500/25 hover:from-cyan-400 hover:to-violet-500"
                  )}
                >
                  <Download className="size-3.5" />
                  {t("install_cta")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onDismiss}
                  className="border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white"
                >
                  {t("install_later")}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {iosGuideOpen && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              aria-label={t("banner_close")}
              onClick={onCloseIosGuide}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="pwa-ios-guide-title"
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 360, damping: 28 }}
              className={cn(
                "relative w-full max-w-sm overflow-hidden rounded-2xl",
                "border border-cyan-400/40 bg-zinc-950 p-5",
                "shadow-[0_0_60px_-12px_rgba(139,92,246,0.55)] ring-1 ring-violet-500/25"
              )}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-cyan-500/15 to-transparent"
              />

              <div className="relative flex items-start gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-violet-400/35 bg-violet-500/15">
                  <Share className="size-5 text-violet-300" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <h2
                    id="pwa-ios-guide-title"
                    className="text-base font-bold text-white"
                  >
                    {isIos ? t("ios_title") : t("install_title")}
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                    {isIos ? t("ios_desc") : t("manual_desc")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onCloseIosGuide}
                  className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
                  aria-label={t("banner_close")}
                >
                  <X className="size-4" />
                </button>
              </div>

              <ol className="relative mt-5 space-y-3 text-left">
                {(isIos
                  ? (["ios_step1", "ios_step2", "ios_step3"] as const)
                  : (["manual_step1", "manual_step2", "manual_step3"] as const)
                ).map((key, index) => (
                  <li
                    key={key}
                    className={cn(
                      "flex gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-lg",
                        "bg-gradient-to-br from-cyan-500/30 to-violet-600/40",
                        "text-xs font-bold text-cyan-100"
                      )}
                    >
                      {index + 1}
                    </span>
                    <p className="text-sm leading-snug text-zinc-200">
                      {t(key)}
                    </p>
                  </li>
                ))}
              </ol>

              <Button
                type="button"
                onClick={onCloseIosGuide}
                className={cn(
                  "mt-5 w-full border-0 bg-gradient-to-r from-cyan-500 to-violet-600",
                  "text-white shadow-md shadow-violet-500/25"
                )}
              >
                {t("ios_got_it")}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export { PwaInstallPrompt };
