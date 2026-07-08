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
import {
  APP_SETTINGS_STORAGE_KEY,
  applyAppSettings,
  DEFAULT_APP_SETTINGS,
  parseAppSettings,
  readAppSettingsRaw,
  type AppSettings,
} from "@/lib/app-settings";

type AppSettingsContextValue = {
  settings: AppSettings;
  ready: boolean;
  updateSettings: (patch: Partial<AppSettings>) => void;
  resetSettings: () => void;
};

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = parseAppSettings(readAppSettingsRaw());
    setSettings(stored);
    applyAppSettings(stored);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    applyAppSettings(settings);
    window.localStorage.setItem(
      APP_SETTINGS_STORAGE_KEY,
      JSON.stringify(settings)
    );
  }, [settings, ready]);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings({ ...DEFAULT_APP_SETTINGS });
  }, []);

  const value = useMemo(
    () => ({ settings, ready, updateSettings, resetSettings }),
    [settings, ready, updateSettings, resetSettings]
  );

  return (
    <AppSettingsContext.Provider value={value}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error("useAppSettings must be used within AppSettingsProvider");
  }
  return context;
}
