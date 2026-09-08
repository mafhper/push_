import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { type DictKey, interpolate, resolveLanguage, translate } from '@/i18n';
import { diagnoseToken, validateToken } from '@/services/github';
import { clearGithubToken, loadGithubToken } from '@/services/secure-storage';
import { clearIdentity, loadIdentity } from '@/services/presentation-identity';
import { removePersistedQueryCache } from '@/services/query-persistence';
import { bootMark } from '@/services/startup-metrics';
import { isTauriRuntime } from '@/config/site';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type { RateLimitInfo, SessionStatus, UserSession, UserSettings, Theme } from '@/types';
import { AppContext, defaultSettings, normalizeTheme, type AppContextValue } from '@/contexts/app-context';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings, clearSettings] = useLocalStorage<UserSettings>('gl_settings', defaultSettings);
  const [sessionState, setSessionState] = useState<UserSession | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('loading');
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

  const logout = useCallback(() => {
    setSessionState(null);
    setSessionStatus('anonymous');
    clearIdentity();
    void clearGithubToken();
    void removePersistedQueryCache();
  }, []);

  const clearAll = useCallback(() => {
    setSessionState(null);
    setSessionStatus('anonymous');
    clearPrimary();
    clearSelected();
    clearSettings();
    clearIdentity();
    Object.keys(localStorage).forEach(k => {
      if ((k.startsWith('gl_') && k.includes('session')) || k.startsWith('gl_cache_')) {
        localStorage.removeItem(k);
      }
    });
    void removePersistedQueryCache();
  }, [clearPrimary, clearSelected, clearSettings]);

  useEffect(() => {
    if (normalizedSettings.theme !== settings.theme || normalizedSettings.lang !== settings.lang) {
      setSettings(normalizedSettings);
    }
  }, [normalizedSettings, setSettings, settings.lang, settings.theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-dark', 'theme-light', 'theme-phosphor-green', 'theme-golden-matrix', 'theme-blue-calm', 'theme-green-ish', 'theme-brown-earth');
    root.classList.add(`theme-${normalizedSettings.theme}`);
    root.style.colorScheme = normalizedSettings.theme === 'light' ? 'light' : 'dark';
  }, [normalizedSettings.theme]);

  useEffect(() => {
    if (!isTauriRuntime()) return;

    const isNeutral = (theme: Theme): boolean => theme === 'light' || theme === 'dark';
    const followSystem = (system: unknown): void => {
      setSettings(prev => {
        const theme = normalizeTheme(prev.theme);
        if (!isNeutral(theme)) return prev;
        const next: Theme = system === 'light' ? 'light' : 'dark';
        return next === theme ? prev : { ...prev, theme: next };
      });
    };

    let disposed = false;
    let unlisten: (() => void) | undefined;

    (async () => {
      if (disposed) return;
      const windowApi = getCurrentWindow();
      try {
        followSystem(await windowApi.theme());
      } catch { /* SO sem preferência: mantém o atual */ }
      windowApi.onThemeChanged(({ payload }) => followSystem(payload)).then(fn => { if (!disposed) unlisten = fn; });
    })();

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [setSettings]);

  useEffect(() => {
    document.documentElement.lang = normalizedSettings.lang;
  }, [normalizedSettings.lang]);

  useEffect(() => {
    // Clear legacy persisted sessions from older iterations of the app.
    Object.keys(window.localStorage).forEach((key) => {
      if (key.startsWith('gl_') && key.includes('session')) {
        window.localStorage.removeItem(key);
      }
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function restoreSession() {
      const storedToken = await loadGithubToken();
      if (cancelled) return;

      if (!storedToken) {
        setSessionStatus('anonymous');
        bootMark('session-loaded');
        return;
      }

      const identity = loadIdentity();
      if (!cancelled) {
        setSession({ token: storedToken, username: identity?.username ?? '', avatarUrl: identity?.avatarUrl ?? '' });
        setSessionStatus('authenticated');
        bootMark('session-loaded');
      }

      const viewer = await validateToken(storedToken);
      if (cancelled) return;
      if (!viewer || !viewer.login) {
        await clearGithubToken();
        if (cancelled) return;
        setSessionState(null);
        setSessionStatus('invalid');
        return;
      }

      const diagnostics = await diagnoseToken(storedToken);
      if (!cancelled) {
        setSession({ token: storedToken, username: viewer.login, avatarUrl: viewer.avatarUrl, diagnostics });
      }
    }
    void restoreSession();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(() => ({
    settings: normalizedSettings,
    updateSettings,
    session: sessionState,
    setSession,
    sessionStatus,
    logout,
    primaryRepo,
    setPrimaryRepo,
    selectedRepos,
    setSelectedRepos,
    rateLimitInfo,
    setRateLimitInfo,
    t,
    clearAll,
  }), [
    normalizedSettings, sessionState, sessionStatus, primaryRepo, selectedRepos, rateLimitInfo,
    setSession, setPrimaryRepo, setSelectedRepos, t, clearAll, updateSettings, logout
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
