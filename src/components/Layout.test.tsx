import { screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import { SITE_REPOSITORY_URL } from "@/config/site";
import { PromoLayout } from "@/components/Layout";
import { interpolate, translate, type DictKey } from "@/i18n";
import { renderWithAppProviders } from "@/test/render-app";

const copy = (key: DictKey) => interpolate(translate("en", key));

function renderPromoLayout() {
  return renderWithAppProviders(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route element={<PromoLayout />}>
          <Route path="/" element={<p>promo home</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

/**
 * The footer lives in `PromoLayout`, the component both runtimes mount for `/`
 * (PublicApp on Pages, LocalApp on localhost/desktop-web): one implementation,
 * one theme switch, no per-runtime copy to drift.
 */
describe("promo footer", () => {
  it("lists the secondary destinations and the theme switch", () => {
    renderPromoLayout();

    const footer = screen.getByRole("contentinfo");
    const nav = within(footer).getByRole("navigation", { name: copy("promoFooterNav") });

    expect(within(nav).getByRole("link", { name: copy("dashboard") })).toHaveAttribute("href", "/app");
    expect(within(nav).getByRole("link", { name: copy("promoDownloadKicker") })).toHaveAttribute("href", "#download");

    const source = within(nav).getByRole("link", { name: copy("promoVisitGitHub") });
    expect(source).toHaveAttribute("href", SITE_REPOSITORY_URL);
    expect(source).toHaveAttribute("target", "_blank");
    expect(source).toHaveAttribute("rel", "noopener noreferrer");

    expect(within(footer).getByRole("button", { name: copy("promoThemeSwitchToLight") })).toBeInTheDocument();
  });

  it("sits below the routed content, not inside the sticky header", () => {
    const { container } = renderPromoLayout();

    expect(within(container).getByText("promo home")).toBeInTheDocument();
    expect(screen.getByRole("banner")).not.toContainElement(screen.getByRole("contentinfo"));
  });
});
