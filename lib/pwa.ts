/** BeforeInstallPromptEvent — Chromium A2HS API（尚未進標準） */
export type BeforeInstallPromptEvent = Event & {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export const PWA_DISMISS_STORAGE_KEY = "rnf-pwa-dismissed-until";
export const PWA_DISMISS_MS = 24 * 60 * 60 * 1000;

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const mediaStandalone = window.matchMedia("(display-mode: standalone)").matches;
  const mediaFullscreen = window.matchMedia("(display-mode: fullscreen)").matches;
  const iosStandalone =
    "standalone" in window.navigator &&
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
  return mediaStandalone || mediaFullscreen || iosStandalone;
}

export function isIosDevice(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const iPadOS =
    window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1;
  return iOS || iPadOS;
}

export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  if (isIosDevice()) return true;
  if (/Android|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(window.navigator.userAgent)) {
    return true;
  }
  return window.matchMedia("(max-width: 768px) and (pointer: coarse)").matches;
}

export function isDismissedRecently(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(PWA_DISMISS_STORAGE_KEY);
    if (!raw) return false;
    const until = Number(raw);
    if (!Number.isFinite(until)) return false;
    return Date.now() < until;
  } catch {
    return false;
  }
}

export function dismissForOneDay(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      PWA_DISMISS_STORAGE_KEY,
      String(Date.now() + PWA_DISMISS_MS)
    );
  } catch {
    /* ignore quota / private mode */
  }
}
