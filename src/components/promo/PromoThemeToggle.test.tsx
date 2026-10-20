import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { interpolate, translate, type DictKey, type Language } from "@/i18n";
import { renderWithAppProviders } from "@/test/render-app";
import { PromoThemeToggle } from "./PromoThemeToggle";

/**
 * The promo footer switch: the only theme control outside `/app`.
 *
 * It edits `gl_settings.theme` — the same key the app reads — and only ever
 * moves between the neutral pair. Every assertion below is about observable
 * behaviour: the accessible name (the destination), `aria-pressed` (the light
 * member of the pair), the class on `<html>` and the persisted settings.
 */

const copy = (key: DictKey, values?: Record<string, string | number>) =>
  interpolate(translate("en", key), values);

function persist(settings: Record<string, unknown>): void {
  window.localStorage.setItem("gl_settings", JSON.stringify(settings));
}

function storedSettings(): Record<string, unknown> | null {
  const raw = window.localStorage.getItem("gl_settings");
  return raw ? JSON.parse(raw) : null;
}

function destinationButton(key: DictKey) {
  return screen.getByRole("button", { name: copy(key) });
}

describe("promo theme toggle", () => {
  it("detects the current theme without writing a settings key of its own", () => {
    renderWithAppProviders(<PromoThemeToggle />);

    expect(destinationButton("promoThemeSwitchToLight")).toHaveAttribute("aria-pressed", "false");
    expect(window.localStorage.length).toBe(0);
  });

  it("restores a stored light theme on mount", () => {
    persist({ theme: "light" });
    renderWithAppProviders(<PromoThemeToggle />);

    expect(destinationButton("promoThemeSwitchToDark")).toHaveAttribute("aria-pressed", "true");
  });

  it("goes dark -> light -> dark and persists each step in gl_settings", () => {
    renderWithAppProviders(<PromoThemeToggle />);

    fireEvent.click(destinationButton("promoThemeSwitchToLight"));

    expect(storedSettings()?.theme).toBe("light");
    expect(document.documentElement.classList.contains("theme-light")).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe("light");
    expect(destinationButton("promoThemeSwitchToDark")).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(destinationButton("promoThemeSwitchToDark"));

    expect(storedSettings()?.theme).toBe("dark");
    expect(document.documentElement.classList.contains("theme-dark")).toBe(true);
    expect(document.documentElement.classList.contains("theme-light")).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(destinationButton("promoThemeSwitchToLight")).toHaveAttribute("aria-pressed", "false");

    // One key, the same one the app reads: no `gl_theme` side storage.
    expect(window.localStorage.length).toBe(1);
    expect(window.localStorage.key(0)).toBe("gl_settings");
  });

  it("leaves an accent theme for light and comes back to neutral dark", () => {
    persist({ theme: "phosphor-green" });
    renderWithAppProviders(<PromoThemeToggle />);

    expect(destinationButton("promoThemeSwitchToLight")).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(destinationButton("promoThemeSwitchToLight"));
    expect(storedSettings()?.theme).toBe("light");
    expect(document.documentElement.classList.contains("theme-phosphor-green")).toBe(false);
    expect(document.documentElement.classList.contains("theme-light")).toBe(true);

    fireEvent.click(destinationButton("promoThemeSwitchToDark"));
    expect(storedSettings()?.theme).toBe("dark");
    expect(document.documentElement.classList.contains("theme-dark")).toBe(true);
  });

  const LANGUAGES: Language[] = ["en", "pt-BR", "es"];

  it("shows only the icon and keeps the destination in aria-label and title", () => {
    renderWithAppProviders(<PromoThemeToggle />);

    const button = destinationButton("promoThemeSwitchToLight");

    expect(button).toHaveAttribute("title", copy("promoThemeSwitchToLight"));
    expect(button.textContent).toBe("");
    expect(button.querySelector("svg")).not.toBeNull();
  });

  it.each(LANGUAGES)("names the destination in %s", (language) => {
    persist({ theme: "dark", lang: language });
    renderWithAppProviders(<PromoThemeToggle />);

    expect(
      screen.getByRole("button", { name: translate(language, "promoThemeSwitchToLight") }),
    ).toBeInTheDocument();
  });
});
