import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { interpolate, translate, type DictKey } from "@/i18n";
import { renderWithAppProviders } from "@/test/render-app";
import { PromoInspector } from "./PromoInspector";

const copy = (key: DictKey, values?: Record<string, string | number>) =>
  interpolate(translate("en", key), values);

describe("promo inspector modes", () => {
  it("opens on the balanced panels and reveals the rest by mode", () => {
    renderWithAppProviders(<PromoInspector />);

    expect(screen.getByText(copy("promoInspectorWhy"))).toBeInTheDocument();
    expect(screen.getByText(copy("promoInspectorSecurity"))).toBeInTheDocument();
    expect(screen.queryByText(copy("promoInspectorRuns"))).not.toBeInTheDocument();
    expect(screen.queryByText(copy("promoInspectorReviews"))).not.toBeInTheDocument();
    expect(screen.queryByText(copy("promoInspectorActivity"))).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: /^detailed/i }));
    expect(screen.getByText(copy("promoInspectorRuns"))).toBeInTheDocument();
    expect(screen.getByText(copy("promoInspectorCommits"))).toBeInTheDocument();
    expect(screen.queryByText(copy("promoInspectorReviews"))).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: /^full/i }));
    // The panel title carries the open-PR count: "Open reviews · 7".
    expect(screen.getByText(new RegExp(`^${copy("promoInspectorReviews")}`))).toBeInTheDocument();
    expect(screen.getByText(copy("promoInspectorActivity"))).toBeInTheDocument();
    // The caption under the trail is the sum of the bars, not a hand-typed number.
    expect(screen.getByText("85")).toBeInTheDocument();
  });
});
