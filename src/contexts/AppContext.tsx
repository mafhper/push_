import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { type DictKey, interpolate, resolveLanguage, translate } from '@/i18n';
import type { RateLimitInfo, UserSession, UserSettings } from '@/types';
import { AppContext, defaultSettings, normalizeTheme, type AppContextValue } from '@/contexts/app-context';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings, clearSettings] = useLocalStorage<UserSettings>('gl_settings', defaultSettings);
  const [sessionState, setSessionState] = useState<UserSession | null>(null);
  const [primaryRepo, setPrimaryRepo, clearPrimary] = useLocalStorage<string | null>('gl_primary_repo', null);
  const [selectedRepos, setSelectedRepos, clearSelected] = useLocalStorage<string[]>('gl_selected_repos', []);
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null);
  const normalizedSettings = useMemo<UserSettings>(() => ({
    ...settings,
    theme: normalizeTheme(settings.theme),
    lang: resolveLanguage(settings.lang),
  }), [settings]);

  const updateSettings = useCallback((partial: Partial<UserSettings>) => {
    setSettings(prev => ({
      ...prev,
      ...partial,
      theme: partial.theme ? normalizeTheme(partial.theme) : normalizeTheme(prev.theme),
      lang: partial.lang ? resolveLanguage(partial.lang) : resolveLanguage(prev.lang),
    }));
  }, [setSettings]);

  const t = useCallback((key: DictKey, values?: Record<string, string | number>): string => {
    const message = translate(normalizedSettings.lang, key);
    return interpolate(message, values);
  }, [normalizedSettings.lang]);

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
    if (normalizedSettings.theme !== settings.theme || normalizedSettings.lang !== settings.lang) {
      setSettings(normalizedSettings);
    }
  }, [normalizedSettings, setSettings, settings.lang, settings.theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-dark', 'theme-light');
    root.classList.add(`theme-${normalizedSettings.theme}`);
    root.style.colorScheme = normalizedSettings.theme;
  }, [normalizedSettings.theme]);

  useEffect(() => {
    // Clear legacy persisted sessions from older iterations of the app.
    Object.keys(window.localStorage).forEach((key) => {
      if (key.startsWith('gl_') && key.includes('session')) {
        window.localStorage.removeItem(key);
      }
    });
  }, []);

  const value = useMemo(() => ({
    settings: normalizedSettings,
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
    normalizedSettings, sessionState, primaryRepo, selectedRepos, rateLimitInfo,
    setSession, setPrimaryRepo, setSelectedRepos, t, clearAll, updateSettings
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
