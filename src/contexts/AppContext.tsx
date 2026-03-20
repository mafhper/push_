import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { dict, type DictKey } from '@/i18n/dictionaries';
import type { RateLimitInfo, UserSession, UserSettings } from '@/types';
import { AppContext, defaultSettings, type AppContextValue } from '@/contexts/app-context';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings, clearSettings] = useLocalStorage<UserSettings>('gl_settings', defaultSettings);
  const [sessionState, setSessionState] = useState<UserSession | null>(null);
  const [primaryRepo, setPrimaryRepo, clearPrimary] = useLocalStorage<string | null>('gl_primary_repo', null);
  const [selectedRepos, setSelectedRepos, clearSelected] = useLocalStorage<string[]>('gl_selected_repos', []);
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null);

  const updateSettings = useCallback((partial: Partial<UserSettings>) => {
    setSettings(prev => ({ ...prev, ...partial }));
  }, [setSettings]);

  const t = useCallback((key: DictKey): string => {
    return dict[settings.lang]?.[key] || dict.en[key] || key;
  }, [settings.lang]);

  const setSession = useCallback((session: UserSession | null) => {
    setSessionState(session);
  }, []);

  const clearAll = useCallback(() => {
    setSession(null);
    clearPrimary();
    clearSelected();
    clearSettings();
    Object.keys(localStorage).forEach(k => {
      if ((k.startsWith('gl_') && k.includes('session')) || k.startsWith('gl_cache_')) {
        localStorage.removeItem(k);
      }
    });
  }, [clearPrimary, clearSelected, clearSettings, setSession]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('terminal', 'contrast');
    root.classList.add(settings.theme);
  }, [settings.theme]);

  useEffect(() => {
    // Clear legacy persisted sessions from older iterations of the app.
    Object.keys(window.localStorage).forEach((key) => {
      if (key.startsWith('gl_') && key.includes('session')) {
        window.localStorage.removeItem(key);
      }
    });
  }, []);

  const value = useMemo(() => ({
    settings,
    updateSettings,
    session: sessionState,
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
    settings, sessionState, primaryRepo, selectedRepos, rateLimitInfo,
    setSession, setPrimaryRepo, setSelectedRepos, t, clearAll, updateSettings
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
