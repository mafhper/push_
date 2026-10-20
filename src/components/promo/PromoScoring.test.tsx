import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { interpolate, translate, type DictKey } from "@/i18n";
import { renderWithAppProviders } from "@/test/render-app";
import { PromoScoring } from "./PromoScoring";

const copy = (key: DictKey, values?: Record<string, string | number>) =>
  interpolate(translate("en", key), values);

const liveScore = () => document.querySelector("p[aria-live='polite']")?.textContent;

describe("promo scoring", () => {
  it("ranks the demo repository among the seven sample ones", () => {
    renderWithAppProviders(<PromoScoring />);

    // Defaults: failed main (60) + two PRs (2 × 15) = 90. Eight entries, and 90
    // sits below 145 and 115 but above the next fleet score (75).
    expect(liveScore()).toBe("90");
    expect(screen.getByText(copy("promoScoreRank", { rank: 3, total: 8 }))).toBeInTheDocument();
  });

  it("moves the rank when a heavier signal is switched on", () => {
    renderWithAppProviders(<PromoScoring />);

    // Adding the critical alert (100) takes the demo repository to 190, above
    // the highest sample score (145).
    fireEvent.click(screen.getByRole("switch", { name: copy("promoScoreCriticalAlert") }));

    expect(liveScore()).toBe("190");
    expect(screen.getByText(copy("promoScoreRank", { rank: 1, total: 8 }))).toBeInTheDocument();
  });
});
