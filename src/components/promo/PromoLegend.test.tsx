import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { interpolate, translate, type DictKey } from "@/i18n";
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
    renderWithAppProviders(<PromoLegend handle={INITIAL_HANDLE_PREVIEW} />);

    expect(screen.getByText(copy("promoHeroLegendCritical", { threshold: SCORE_THRESHOLDS.critical }))).toBeInTheDocument();
    expect(screen.getByText(copy("promoHeroLegendWarning", { threshold: SCORE_THRESHOLDS.warning }))).toBeInTheDocument();
    expect(screen.getByText(copy("promoHeroLegendHealthy"))).toBeInTheDocument();
    expect(screen.getByText(copy("promoHeroLegendInterval"))).toBeInTheDocument();
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
