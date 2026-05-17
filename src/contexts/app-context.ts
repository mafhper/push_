import { createContext } from "react";
import type { DictKey } from "@/i18n";
import { detectBrowserLanguage } from "@/i18n";
import type { Language, RateLimitInfo, Theme, UserSession, UserSettings } from "@/types";

export const supportedThemes = [
  "dark",
  "light",
  "phosphor-green",
  "golden-matrix",
  "blue-calm",
  "green-ish",
  "brown-earth",
] as const satisfies readonly Theme[];

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
  t: (key: DictKey, values?: Record<string, string | number>) => string;
  clearAll: () => void;
}

export function detectLanguage(): Language {
  return detectBrowserLanguage();
}

export function detectTheme(): Theme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "dark";
  }

  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function normalizeTheme(value?: string | null): Theme {
  const normalized = value?.trim().toLowerCase() ?? "";
  return supportedThemes.includes(normalized as Theme) ? normalized as Theme : "dark";
}

export const defaultSettings: UserSettings = {
  theme: detectTheme(),
  lang: detectLanguage(),
  dashboardDensity: "balanced",
  sidebarMode: "expanded",
  dataDetailMode: "balanced",
  repoDetailModes: {},
  pollingInterval: 300,
  notificationsEnabled: false,
  highlightMode: "primary",
};

export const AppContext = createContext<AppContextValue | null>(null);
