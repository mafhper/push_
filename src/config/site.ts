export const SITE_NAME = "Push_";
export const SITE_TAGLINE = "A semantic command center for your public GitHub footprint.";
export const SITE_REPOSITORY_URL = "https://github.com/mafhper/push_";
export const SITE_BASE_URL = import.meta.env.BASE_URL;
export const LOCAL_RUNTIME_HOSTS = new Set(["localhost", "127.0.0.1"]);

export const PROMO_ROUTES = [
  { href: "/", labelKey: "home" },
  { href: "/technology", labelKey: "technology" },
  { href: "/faq", labelKey: "faq" },
  { href: "/about", labelKey: "about" },
] as const;

export const APP_ROUTES = [
  { href: "/app", labelKey: "dashboard", metaKey: "overview" },
  { href: "/app/alerts", labelKey: "alerts", metaKey: "attention" },
  { href: "/app/settings", labelKey: "settings", metaKey: "control" },
] as const;

export const LOCAL_SYNC_DOC = [
  "runbookStep1",
  "runbookStep2",
  "runbookStep3",
  "runbookStep4",
] as const;

export function isLocalSecureRuntime() {
  if (typeof window === "undefined") return false;
  return import.meta.env.DEV && LOCAL_RUNTIME_HOSTS.has(window.location.hostname);
}
