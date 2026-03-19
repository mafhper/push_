import { createContext } from "react";
import type { DictKey } from "@/i18n/dictionaries";
import type { Language, RateLimitInfo, Theme, UserSession, UserSettings } from "@/types";

export interface AppContextValue {
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

export function detectLanguage(): Language {
  const nav = navigator.language?.toLowerCase() || "en";
  if (nav.startsWith("pt")) return "pt";
  if (nav.startsWith("es")) return "es";
  return "en";
}

export function detectTheme(): Theme {
  return "terminal";
}

export const defaultSettings: UserSettings = {
  theme: detectTheme(),
  lang: detectLanguage(),
  dashboardDensity: "balanced",
  pollingInterval: 300,
  notificationsEnabled: false,
  highlightMode: "primary",
};

export const AppContext = createContext<AppContextValue | null>(null);
