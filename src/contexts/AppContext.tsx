import React, { createContext, useContext, useEffect, useMemo, useCallback, useState } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { dict, type DictKey } from '@/i18n/dictionaries';
import type { Theme, Language, UserSettings, UserSession, RateLimitInfo } from '@/types';

interface AppContextValue {
  settings: UserSettings;
  updateSettings: (partial: Partial<UserSettings>) => void;
  session: UserSession | null;
  setSession: (session: UserSession | null) => void;
  primaryRepo: string | null;
  setPrimaryRepo: (repo: string | null) => void;
  selectedRepos: string[];
  setSelectedRepos: (repos: string[]) => void;
  rateLimitInfo: RateLimitInfo | null;
  setRateLimitInfo: (info: RateLimitInfo | null) => void;
  t: (key: DictKey) => string;
  clearAll: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function detectLanguage(): Language {
  const nav = navigator.language?.toLowerCase() || 'en';
  if (nav.startsWith('pt')) return 'pt';
  if (nav.startsWith('es')) return 'es';
  return 'en';
}

function detectTheme(): Theme {
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
}

const defaultSettings: UserSettings = {
  theme: 'dark',
  lang: detectLanguage(),
  pollingInterval: 60,
  maxRepos: 10,
  rememberToken: false,
  notificationsEnabled: false,
  highlightMode: 'recent',
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings, clearSettings] = useLocalStorage<UserSettings>('gl_settings', defaultSettings);
  const [primaryRepo, setPrimaryRepo, clearPrimary] = useLocalStorage<string | null>('gl_primary_repo', null);
  const [selectedRepos, setSelectedRepos, clearSelected] = useLocalStorage<string[]>('gl_selected_repos', []);
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null);
  const session = null as UserSession | null;

  const setSession = useCallback((_newSession: UserSession | null) => {
    // Credentials are never stored in the browser in the snapshot architecture.
  }, []);

  const updateSettings = useCallback((partial: Partial<UserSettings>) => {
    setSettings(prev => ({ ...prev, ...partial }));
  }, [setSettings]);

  const t = useCallback((key: DictKey): string => {
    return dict[settings.lang]?.[key] || dict.en[key] || key;
  }, [settings.lang]);

  const clearAll = useCallback(() => {
    clearPrimary();
    clearSelected();
    clearSettings();
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('gl_cache_')) localStorage.removeItem(k);
    });
  }, [clearPrimary, clearSelected, clearSettings]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark', 'golden');
    root.classList.add(settings.theme);
  }, [settings.theme]);

  const value = useMemo(() => ({
    settings,
    updateSettings,
    session,
    setSession,
    primaryRepo,
    setPrimaryRepo,
    selectedRepos,
    setSelectedRepos,
    rateLimitInfo,
    setRateLimitInfo,
    t,
    clearAll,
  }), [
    settings, session, primaryRepo, selectedRepos, rateLimitInfo,
    setSession, setPrimaryRepo, setSelectedRepos, t, clearAll, updateSettings
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
