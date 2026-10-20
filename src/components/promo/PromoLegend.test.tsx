import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { interpolate, translate, type DictKey, type Language } from "@/i18n";
import { renderWithAppProviders } from "@/test/render-app";
import { PromoLegend } from "./PromoHero";
import { SCORE_THRESHOLDS } from "./promoFleet";
import { INITIAL_HANDLE_PREVIEW, applyHandlePreview } from "./promoHandle";

/** Spelled from char codes: see the owner rule in PromoQueueCard.test.tsx. */
const FORBIDDEN_OWNER = String.fromCharCode(109, 97, 102, 104, 112, 101, 114);

const copy = (key: DictKey, values?: Record<string, string | number>) =>
  interpolate(translate("en", key), values);

describe("promo hero legend", () => {
  it("states the thresholds the queue uses", () => {
    const { container } = renderWithAppProviders(<PromoLegend handle={INITIAL_HANDLE_PREVIEW} />);
    const text = container.textContent ?? "";

    expect(text).toContain(copy("promoHeroLegendCritical", { threshold: SCORE_THRESHOLDS.critical }));
    expect(text).toContain(copy("promoHeroLegendWarning", { threshold: SCORE_THRESHOLDS.warning }));
    expect(text).toContain(copy("promoHeroLegendHealthy"));
    expect(text).toContain(copy("promoHeroLegendInterval"));
  });

  it("marks the default queue as a sample and names the applied handle", () => {
    renderWithAppProviders(<PromoLegend handle={INITIAL_HANDLE_PREVIEW} />);

    expect(screen.getByText(copy("promoHeroLegendSample", { handle: "acme" }))).toBeInTheDocument();
  });

  it("switches to a preview label once a handle is applied", () => {
    const applied = applyHandlePreview(INITIAL_HANDLE_PREVIEW, "octocat");
    renderWithAppProviders(<PromoLegend handle={applied} />);

    expect(screen.getByText(copy("promoHeroLegendPreview", { handle: "octocat" }))).toBeInTheDocument();
  });

  it("never names the owner account", () => {
    const { container } = renderWithAppProviders(<PromoLegend handle={INITIAL_HANDLE_PREVIEW} />);
    expect(container.textContent?.toLowerCase()).not.toContain(FORBIDDEN_OWNER);
  });
});

const LEGEND_COPY: Array<{ key: DictKey; threshold?: number }> = [
  { key: "promoHeroLegendTitle" },
  { key: "promoHeroLegendInterval" },
  { key: "promoHeroLegendCritical", threshold: SCORE_THRESHOLDS.critical },
  { key: "promoHeroLegendWarning", threshold: SCORE_THRESHOLDS.warning },
  { key: "promoHeroLegendHealthy" },
];
const LANGUAGES: Language[] = ["en", "pt-BR", "es"];

/** Renders the real module: the shorthand has to survive the split the component performs. */
function renderLegend(language: Language) {
  window.localStorage.setItem("gl_settings", JSON.stringify({ lang: language }));
  return renderWithAppProviders(<PromoLegend handle={INITIAL_HANDLE_PREVIEW} />);
}

describe("promo hero legend copy contract", () => {
  it.each(LEGEND_COPY)("keeps the $key shorthand before the middle dot", ({ key, threshold }) => {
    for (const language of LANGUAGES) {
      const where = `${key} (${language})`;
      const full = interpolate(
        translate(language, key),
        threshold === undefined ? undefined : { threshold },
      );
      const shorthand = full.split(" · ")[0];

      const { unmount } = renderLegend(language);
      expect(shorthand.trim().length, where).toBeGreaterThan(0);
      expect(shorthand, where).not.toContain("·");
      expect(screen.getByText(shorthand), where).toBeInTheDocument();
      if (threshold !== undefined) {
        expect(shorthand, where).toContain(String(threshold));
      }
      unmount();
    }
  });
});
