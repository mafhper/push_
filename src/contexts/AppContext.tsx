import React, { createContext, useContext, useEffect, useMemo, useCallback, useState } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useSessionStorage } from '@/hooks/useSessionStorage';
import { dict, type DictKey } from '@/i18n/dictionaries';
import { obfuscateToken, deobfuscateToken } from '@/lib/utils';
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
  theme: detectTheme(),
  lang: detectLanguage(),
  pollingInterval: 60,
  maxRepos: 10,
  rememberToken: true,
  notificationsEnabled: false,
  highlightMode: 'primary',
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings, clearSettings] = useLocalStorage<UserSettings>('gl_settings', defaultSettings);
  
  // Storage for sessions: we use two hooks but only one is active based on settings.rememberToken
  // We store obfuscated token in persistent storage
  const [persistentSessionRaw, setPersistentSessionRaw, clearPersistentSession] = useLocalStorage<UserSession | null>('gl_session', null);
  const [temporarySession, setTemporarySession, clearTemporarySession] = useSessionStorage<UserSession | null>('gl_session_temp', null);
  
  const [primaryRepo, setPrimaryRepo, clearPrimary] = useLocalStorage<string | null>('gl_primary_repo', null);
  const [selectedRepos, setSelectedRepos, clearSelected] = useLocalStorage<string[]>('gl_selected_repos', []);
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null);

  // De-obfuscate persistent session on read
  const persistentSession = useMemo(() => {
    if (!persistentSessionRaw) return null;
    return {
      ...persistentSessionRaw,
      token: deobfuscateToken(persistentSessionRaw.token)
    };
  }, [persistentSessionRaw]);

  // Determine active session based on settings
  const session = useMemo(() => {
    return settings.rememberToken ? persistentSession : temporarySession;
  }, [settings.rememberToken, persistentSession, temporarySession]);

  const setSession = useCallback((newSession: UserSession | null) => {
    if (settings.rememberToken) {
      if (newSession) {
        setPersistentSessionRaw({
          ...newSession,
          token: obfuscateToken(newSession.token)
        });
      } else {
        setPersistentSessionRaw(null);
      }
      clearTemporarySession();
    } else {
      setTemporarySession(newSession);
      clearPersistentSession();
    }
  }, [settings.rememberToken, setPersistentSessionRaw, setTemporarySession, clearPersistentSession, clearTemporarySession]);

  const clearSession = useCallback(() => {
    clearPersistentSession();
    clearTemporarySession();
  }, [clearPersistentSession, clearTemporarySession]);

  // Migration / Sync logic
  useEffect(() => {
    if (!settings.rememberToken && persistentSession) {
      // If user opted out of remembering, move session to temp if it exists in persistent
      if (!temporarySession) setTemporarySession(persistentSession);
      clearPersistentSession();
    }
  }, [settings.rememberToken, persistentSession, temporarySession, setTemporarySession, clearPersistentSession]);

  const updateSettings = useCallback((partial: Partial<UserSettings>) => {
    setSettings(prev => ({ ...prev, ...partial }));
  }, [setSettings]);

  const t = useCallback((key: DictKey): string => {
    return dict[settings.lang]?.[key] || dict.en[key] || key;
  }, [settings.lang]);

  const clearAll = useCallback(() => {
    clearSession();
    clearPrimary();
    clearSelected();
    clearSettings();
    // Clear cached data
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('gl_cache_')) localStorage.removeItem(k);
    });
  }, [clearSession, clearPrimary, clearSelected, clearSettings]);

  // Apply theme class
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
