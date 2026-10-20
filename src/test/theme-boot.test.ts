import { afterEach, describe, expect, it } from "vitest";
import { supportedThemes } from "@/contexts/app-context";
import type { Theme } from "@/types";
import themeInitSource from "../../public/theme-init.js?raw";
import indexHtml from "../../index.html?raw";

/**
 * The anti-flash contract.
 *
 * `public/theme-init.js` runs synchronously in `<head>`, before the stylesheet
 * and the app module, so the first paint already carries the right theme. It is
 * a deliberate mirror of `normalizeTheme` / `detectTheme` in
 * `src/contexts/app-context.ts`: a classic script cannot import the TypeScript
 * module, and a module script would be deferred (which is exactly the flash).
 *
 * The tests execute the real file against the same storage key both runtimes
 * use, so adding a theme to `supportedThemes` without teaching the boot script
 * fails here instead of flashing on the next visit.
 */

const originalMatchMedia = window.matchMedia;

type SystemPreference = "light" | "dark" | "unavailable";

function setSystemPreference(preference: SystemPreference): void {
  if (preference === "unavailable") {
    window.matchMedia = undefined as unknown as typeof window.matchMedia;
    return;
  }

  window.matchMedia = ((query: string) => ({
    matches: preference === "light" && query === "(prefers-color-scheme: light)",
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

function runBootScript(): HTMLElement {
  new Function(themeInitSource)();
  return document.documentElement;
}

function storedSettings(value: unknown): void {
  window.localStorage.setItem("gl_settings", JSON.stringify(value));
}

afterEach(() => {
  window.matchMedia = originalMatchMedia;
  document.documentElement.className = "";
  document.documentElement.removeAttribute("style");
});

describe("theme boot script", () => {
  it.each(supportedThemes)("applies the stored %s theme before the app boots", (theme: Theme) => {
    storedSettings({ theme });
    setSystemPreference(theme === "light" ? "dark" : "light");

    const root = runBootScript();

    expect(root.classList.contains(`theme-${theme}`)).toBe(true);
    expect(root.style.colorScheme).toBe(theme === "light" ? "light" : "dark");
  });

  it("applies exactly one theme class, so a stale class never survives the boot", () => {
    document.documentElement.className = "theme-light app-shell-active";
    storedSettings({ theme: "dark" });
    setSystemPreference("light");

    const root = runBootScript();
    const themeClasses = [...root.classList].filter((name) => name.startsWith("theme-"));

    expect(themeClasses).toEqual(["theme-dark"]);
    expect(root.classList.contains("app-shell-active")).toBe(true);
  });

  it("follows the operating system when nothing was ever chosen", () => {
    setSystemPreference("light");
    expect(runBootScript().classList.contains("theme-light")).toBe(true);

    setSystemPreference("dark");
    expect(runBootScript().classList.contains("theme-dark")).toBe(true);
  });

  it("treats a stored but unknown theme like normalizeTheme does: dark", () => {
    storedSettings({ theme: "terminal" });
    setSystemPreference("light");

    expect(runBootScript().classList.contains("theme-dark")).toBe(true);
  });

  it("treats unreadable settings like absent settings and falls back to the system", () => {
    window.localStorage.setItem("gl_settings", "{not json");
    setSystemPreference("light");

    expect(runBootScript().classList.contains("theme-light")).toBe(true);
  });

  it("falls back to dark when the browser exposes no matchMedia", () => {
    setSystemPreference("unavailable");

    expect(runBootScript().classList.contains("theme-dark")).toBe(true);
  });
});

describe("index.html gates the boot script before the app", () => {
  it("loads the boot script synchronously and before the module entry", () => {
    const bootTag = /<script\b[^>]*src="\/theme-init\.js"[^>]*>/i.exec(indexHtml)?.[0] ?? "";
    const moduleIndex = indexHtml.indexOf("/src/main.tsx");
    const bootIndex = indexHtml.indexOf("/theme-init.js");

    expect(bootTag).not.toBe("");
    expect(bootTag).not.toMatch(/\b(?:type="module"|defer|async)\b/i);
    expect(bootIndex).toBeGreaterThan(-1);
    expect(bootIndex).toBeLessThan(moduleIndex);
  });

  it("declares a light/dark color scheme so native widgets match the theme", () => {
    expect(indexHtml).toMatch(/<meta\s+name="color-scheme"\s+content="light dark"\s*\/?>/i);
  });
});
