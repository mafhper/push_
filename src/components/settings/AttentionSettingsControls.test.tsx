import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AttentionSettingsControls } from "./AttentionSettingsControls";
import { renderWithAppProviders } from "@/test/render-app";
import { createOverview } from "@/test/factories";
import type { OverviewRepoSnapshot } from "@/types";

function row(
  name: string,
  health: Pick<OverviewRepoSnapshot["health"], "dependabotOpenCount" | "dependabotCriticalCount">,
): OverviewRepoSnapshot {
  const base = createOverview().repos[0];
  return {
    ...base,
    repo: { ...base.repo, id: name.length, name, fullName: `acme/${name}` },
    health: {
      ...base.health,
      score: 100,
      status: "healthy",
      workflowSuccessRate: 100,
      failedRuns7d: 0,
      stalenessDays: 0,
      dependabotOpenCount: 0,
      dependabotCriticalCount: 0,
      ...health,
    },
    stats: { ...base.stats, openPullRequestCount: 0 },
  };
}

const criticalRow = row("critical", { dependabotOpenCount: 1, dependabotCriticalCount: 1 });
const warningRow = row("warning", { dependabotOpenCount: 1, dependabotCriticalCount: 0 });

function renderControls(repos: OverviewRepoSnapshot[] = [criticalRow, warningRow]) {
  return renderWithAppProviders(<AttentionSettingsControls repos={repos} />);
}

function storedAttention() {
  return JSON.parse(window.localStorage.getItem("gl_settings") ?? "{}").attention;
}

describe("AttentionSettingsControls", () => {
  it("opens with the default emphasis, a cap of five and the live preview", () => {
    renderControls();

    expect(screen.getByRole("switch", { name: "Critical alerts" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("switch", { name: "Failed runs" })).toHaveAttribute("aria-checked", "true");
    const cap = screen.getByRole("group", { name: "Alert cap" });
    expect(cap).toHaveTextContent("Up to 5");
    expect(screen.getByTestId("attention-preview")).toHaveTextContent("1 Critical · 1 Warning");
    expect(screen.getByText("Emphasis only: the queue order changes; the health score and its checks do not."))
      .toBeInTheDocument();
    // The cap starts at its ceiling: the step up is unavailable, the step down is not.
    expect(screen.getByRole("button", { name: "More" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Fewer" })).toBeEnabled();
  });

  it("toggles the critical emphasis, persists it and re-bands the preview", () => {
    renderControls();

    fireEvent.click(screen.getByRole("switch", { name: "Critical alerts" }));

    expect(screen.getByRole("switch", { name: "Critical alerts" })).toHaveAttribute("aria-checked", "false");
    // One critical folded into the ordinary pool is no longer in the critical band.
    expect(screen.getByTestId("attention-preview")).toHaveTextContent("0 Critical · 2 Warning");
    expect(storedAttention()).toEqual({ criticalAlerts: false, failedRuns: true, alertCap: 5 });
  });

  it("steps the alert cap down to zero and back, with the live value in the group", () => {
    renderControls();

    const fewer = screen.getByRole("button", { name: "Fewer" });
    for (let step = 0; step < 5; step += 1) fireEvent.click(fewer);

    expect(screen.getByRole("group", { name: "Alert cap" })).toHaveTextContent("Up to 0");
    expect(fewer).toBeDisabled();
    // A cap of zero removes the ordinary alerts from the charge; the critical
    // alert is charged apart and stays in the critical band.
    expect(screen.getByTestId("attention-preview")).toHaveTextContent("1 Critical · 0 Warning");
    expect(storedAttention()).toEqual({ criticalAlerts: true, failedRuns: true, alertCap: 0 });

    fireEvent.click(screen.getByRole("button", { name: "More" }));
    expect(screen.getByRole("group", { name: "Alert cap" })).toHaveTextContent("Up to 1");
    expect(screen.getByTestId("attention-preview")).toHaveTextContent("1 Critical · 1 Warning");
  });

  it("keeps the failed-runs preference independent of the critical one", () => {
    renderControls();

    fireEvent.click(screen.getByRole("switch", { name: "Failed runs" }));

    expect(screen.getByRole("switch", { name: "Failed runs" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("switch", { name: "Critical alerts" })).toHaveAttribute("aria-checked", "true");
    expect(storedAttention()).toEqual({ criticalAlerts: true, failedRuns: false, alertCap: 5 });
  });

  it("describes each control with the body text of its row", () => {
    renderControls();

    // The row body explains the consequence of the switch, so it belongs to the
    // control as a description - a screen reader hears name and effect.
    expect(screen.getByRole("switch", { name: "Critical alerts" }))
      .toHaveAccessibleDescription("Critical Dependabot alerts lead the order. The check keeps its own weight.");
    expect(screen.getByRole("switch", { name: "Failed runs" }))
      .toHaveAccessibleDescription("Recent failures and a low recent success rate move a repository up.");
    expect(screen.getByRole("group", { name: "Alert cap" }))
      .toHaveAccessibleDescription("Open alerts the order counts per repository. Critical alerts are counted apart.");
  });

  it("renders a zero preview without crashing when the snapshot is empty", () => {
    renderControls([]);

    expect(screen.getByTestId("attention-preview")).toHaveTextContent("0 Critical · 0 Warning");
  });
});
