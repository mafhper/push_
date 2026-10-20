/**
 * Theme boot script: anti-flash for the promo site and the app.
 *
 * It runs synchronously in `<head>`, before the stylesheet and the module
 * entry, so the first paint already carries the resolved theme. A module
 * script would be deferred and the flash would come back.
 *
 * This file is a deliberate mirror of `supportedThemes`, `normalizeTheme` and
 * `detectTheme` in `src/contexts/app-context.ts` — a classic script cannot
 * import the TypeScript module. Resolution order matches the app exactly:
 *
 *   1. `gl_settings.theme` when it names a supported theme;
 *   2. a stored-but-unknown theme resolves to dark (`normalizeTheme`);
 *   3. no stored settings at all follows the operating system;
 *   4. no `matchMedia` falls back to dark.
 *
 * `src/test/theme-boot.test.ts` runs this file against every supported theme,
 * so adding a theme without teaching the boot script fails there instead of
 * flashing on the next visit.
 */
(function () {
  var STORAGE_KEY = "gl_settings";
  var THEMES = [
    "dark",
    "light",
    "phosphor-green",
    "golden-matrix",
    "blue-calm",
    "green-ish",
    "brown-earth",
  ];
  var DARK = "dark";
  var root = document.documentElement;

  function normalize(value) {
    var normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
    return THEMES.indexOf(normalized) === -1 ? null : normalized;
  }

  function systemTheme() {
    if (typeof window.matchMedia !== "function") return DARK;
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : DARK;
  }

  var stored = null;
  var hasStoredSettings = false;

  try {
    var raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      hasStoredSettings = true;
      stored = JSON.parse(raw);
    }
  } catch (error) {
    // Private mode, quota, or unreadable JSON: behave like "nothing stored".
    hasStoredSettings = false;
    stored = null;
  }

  var theme = normalize(stored && stored.theme);
  if (!theme) theme = hasStoredSettings ? DARK : systemTheme();

  for (var i = 0; i < THEMES.length; i += 1) {
    root.classList.remove("theme-" + THEMES[i]);
  }
  root.classList.add("theme-" + theme);
  // Native widgets (scrollbars, form controls) follow the same decision.
  root.style.colorScheme = theme === "light" ? "light" : "dark";
})();
