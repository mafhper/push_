import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { ConsoleLayout } from "@/components/console/ConsoleLayout";
import { renderWithAppProviders } from "@/test/render-app";
import { createRepo } from "@/test/factories";
import {
  SIDEBAR_COLLAPSE_AT,
  SIDEBAR_DEFAULT_WIDTH,
  SIDEBAR_KEYBOARD_STEP,
  SIDEBAR_LABEL_FULL_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  SIDEBAR_RAIL_WIDTH,
  clampSidebarWidth,
  sidebarLabelOpacity,
} from "@/components/console/sidebar-geometry";

// The children carry their own data needs; this suite is about the layout
// geometry and the divider, not about the queue or the dashboard.
vi.mock("@/components/console/TriageQueue", () => ({
  TriageQueue: (props: { compact?: boolean; labelOpacity?: number; railOpacity?: number }) => (
    <div
      data-testid="triage-queue"
      data-compact={String(props.compact)}
      data-label-opacity={props.labelOpacity}
      data-rail-opacity={props.railOpacity}
    />
  ),
}));
vi.mock("@/components/console/GlobalDashboard", () => ({ GlobalDashboard: () => null }));
vi.mock("@/components/console/Inspector", () => ({ Inspector: () => null }));

const repos = [
  { repo: createRepo({ id: 1, fullName: "acme/one" }), score: 90 },
  { repo: createRepo({ id: 2, fullName: "acme/two" }), score: 60 },
] as never[];

function setViewport(canExpand: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: canExpand,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

function queue() {
  return screen.getByTestId("triage-queue");
}

function renderLayout() {
  return renderWithAppProviders(
    <MemoryRouter initialEntries={["/app"]}>
      <ConsoleLayout repos={repos} />
    </MemoryRouter>,
  );
}

function readStoredWidth(): number | undefined {
  const raw = window.localStorage.getItem("gl_settings");
  if (!raw) return undefined;
  return JSON.parse(raw).sidebarWidth as number | undefined;
}

function shell() {
  return screen.getByTestId("triage-queue").closest("div.grid") as HTMLElement;
}

function divider() {
  return screen.getByRole("separator", { name: "Resize repository list" });
}

function dragBy(offsetX: number) {
  dragWithoutReleasing(offsetX);
  const target = divider();
  fireEvent.pointerUp(target, { pointerId: 1, clientX: offsetX });
}

function dragWithoutReleasing(offsetX: number) {
  // jsdom reports a zero rect for the divider, so the gesture origin is x = 0
  // and the resulting width is `startWidth + offsetX`. A real browser uses the
  // divider's own left edge, which is what makes the drag track the pointer 1:1.
  const target = divider();
  fireEvent.pointerDown(target, { button: 0, pointerId: 1, clientX: 0 });
  fireEvent.pointerMove(target, { pointerId: 1, clientX: offsetX });
}

describe("sidebar geometry", () => {
  it("clamps into the supported range and survives junk", () => {
    expect(clampSidebarWidth(10)).toBe(SIDEBAR_MIN_WIDTH);
    expect(clampSidebarWidth(5000)).toBe(SIDEBAR_MAX_WIDTH);
    expect(clampSidebarWidth(400)).toBe(400);
    expect(clampSidebarWidth(Number.NaN)).toBe(SIDEBAR_DEFAULT_WIDTH);
  });

  it("fades the labels out over the last stretch, reaching zero at the collapse", () => {
    expect(sidebarLabelOpacity(SIDEBAR_LABEL_FULL_WIDTH)).toBe(1);
    expect(sidebarLabelOpacity(SIDEBAR_DEFAULT_WIDTH)).toBe(1);
    // Never negative, never above one.
    expect(sidebarLabelOpacity(0)).toBe(0);
    expect(sidebarLabelOpacity(SIDEBAR_COLLAPSE_AT)).toBe(0);
    expect(sidebarLabelOpacity(SIDEBAR_COLLAPSE_AT - 50)).toBe(0);
    expect(sidebarLabelOpacity(SIDEBAR_MAX_WIDTH + 500)).toBe(1);
    expect(Number.NaN).toBeNaN();
    expect(sidebarLabelOpacity(Number.NaN)).toBe(1);

    // Monotonic: the narrower the list, the fainter the text.
    const band = [SIDEBAR_COLLAPSE_AT, 220, 240, 260, SIDEBAR_LABEL_FULL_WIDTH]
      .map(sidebarLabelOpacity);
    for (let index = 1; index < band.length; index += 1) {
      expect(band[index]).toBeGreaterThanOrEqual(band[index - 1]);
    }
  });
});

describe("ConsoleLayout resizable repository list", () => {
  beforeEach(() => {
    setViewport(true);
  });

  it("starts on the default width and stores nothing until the user resizes", () => {
    renderLayout();
    expect(shell()).toHaveAttribute("data-sidebar-width", String(SIDEBAR_DEFAULT_WIDTH));
    expect(readStoredWidth()).toBeUndefined();
  });

  it("follows the pointer while dragging and commits the width on release", () => {
    renderLayout();
    dragBy(80);

    expect(shell()).toHaveAttribute("data-sidebar-width", String(SIDEBAR_DEFAULT_WIDTH + 80));
    expect(readStoredWidth()).toBe(SIDEBAR_DEFAULT_WIDTH + 80);
  });

  it("fades the text out and turns into the rail during the gesture, not after the release", () => {
    renderLayout();
    // Wide: everything readable.
    expect(queue()).toHaveAttribute("data-compact", "false");
    expect(queue()).toHaveAttribute("data-label-opacity", "1");

    // Inside the fade band: the text is dimming but the layout is still the
    // expanded one, so nothing has been squeezed or wrapped yet.
    dragWithoutReleasing(240 - SIDEBAR_DEFAULT_WIDTH);
    const midway = Number(queue().getAttribute("data-label-opacity"));
    expect(midway).toBeGreaterThan(0);
    expect(midway).toBeLessThan(1);
    expect(queue()).toHaveAttribute("data-compact", "false");
    expect(shell()).toHaveAttribute("data-sidebar-width", "240");

    // Past the collapse threshold, still holding the pointer: the rail is already
    // there and the text is gone. This is the "squeezed then snaps" moment.
    fireEvent.pointerMove(divider(), { pointerId: 1, clientX: 240 - SIDEBAR_DEFAULT_WIDTH - 40 });
    expect(queue()).toHaveAttribute("data-label-opacity", "0");
    expect(queue()).toHaveAttribute("data-rail-opacity", "1");
    expect(queue()).toHaveAttribute("data-compact", "true");
    expect(shell()).toHaveAttribute("data-sidebar-width", String(SIDEBAR_RAIL_WIDTH));
  });

  it("clamps the committed width to the maximum", () => {
    renderLayout();
    dragBy(SIDEBAR_MAX_WIDTH);
    expect(shell()).toHaveAttribute("data-sidebar-width", String(SIDEBAR_MAX_WIDTH));
    expect(readStoredWidth()).toBe(SIDEBAR_MAX_WIDTH);
  });

  it("collapses into the rail when dragged below the threshold, and expands when dragged back", () => {
    renderLayout();
    dragBy(-(SIDEBAR_DEFAULT_WIDTH - SIDEBAR_COLLAPSE_AT) - 40);
    expect(shell()).toHaveAttribute("data-sidebar-width", String(SIDEBAR_RAIL_WIDTH));
    // Collapsing is not a width choice: the last expanded width is kept.
    expect(readStoredWidth()).toBeUndefined();

    dragBy(SIDEBAR_MIN_WIDTH);
    expect(shell()).toHaveAttribute("data-sidebar-width", String(SIDEBAR_MIN_WIDTH));
    expect(readStoredWidth()).toBe(SIDEBAR_MIN_WIDTH);
  });

  it("restores the committed width on the next render", () => {
    const first = renderLayout();
    dragBy(500 - SIDEBAR_DEFAULT_WIDTH);
    expect(readStoredWidth()).toBe(500);
    first.unmount();

    renderLayout();
    expect(shell()).toHaveAttribute("data-sidebar-width", "500");
  });

  it("is reachable by keyboard: arrows nudge, Home collapses, End widens", () => {
    renderLayout();
    const target = divider();
    expect(target).toHaveAttribute("aria-valuenow", String(SIDEBAR_DEFAULT_WIDTH));
    expect(target).toHaveAttribute("aria-valuemin", String(SIDEBAR_RAIL_WIDTH));
    expect(target).toHaveAttribute("aria-valuemax", String(SIDEBAR_MAX_WIDTH));

    fireEvent.keyDown(target, { key: "ArrowRight" });
    expect(shell()).toHaveAttribute("data-sidebar-width", String(SIDEBAR_DEFAULT_WIDTH + SIDEBAR_KEYBOARD_STEP));

    fireEvent.keyDown(target, { key: "ArrowLeft" });
    expect(shell()).toHaveAttribute("data-sidebar-width", String(SIDEBAR_DEFAULT_WIDTH));

    fireEvent.keyDown(target, { key: "End" });
    expect(shell()).toHaveAttribute("data-sidebar-width", String(SIDEBAR_MAX_WIDTH));
    expect(readStoredWidth()).toBe(SIDEBAR_MAX_WIDTH);

    fireEvent.keyDown(target, { key: "Home" });
    expect(shell()).toHaveAttribute("data-sidebar-width", String(SIDEBAR_RAIL_WIDTH));
  });

  it("collapses from the keyboard when it reaches the minimum, and expands again", () => {
    renderLayout();
    const target = divider();
    for (let step = 0; step < 20; step += 1) fireEvent.keyDown(target, { key: "ArrowLeft" });
    expect(shell()).toHaveAttribute("data-sidebar-width", String(SIDEBAR_RAIL_WIDTH));
    // The collapse is durable: it lives in the settings, not in a drag state.
    expect(JSON.parse(window.localStorage.getItem("gl_settings") ?? "{}").sidebarMode).toBe("compact");

    // From the rail, the first press restores the last expanded width.
    fireEvent.keyDown(target, { key: "ArrowRight" });
    expect(shell()).toHaveAttribute("data-sidebar-width", String(SIDEBAR_MIN_WIDTH));

    // And the next press widens it one step from there.
    fireEvent.keyDown(target, { key: "ArrowRight" });
    expect(shell()).toHaveAttribute("data-sidebar-width", String(SIDEBAR_MIN_WIDTH + SIDEBAR_KEYBOARD_STEP));

    // Left is a no-op on the rail: it must not bounce back open.
    for (let step = 0; step < 5; step += 1) fireEvent.keyDown(target, { key: "ArrowRight" });
    const widened = Number(shell().getAttribute("data-sidebar-width"));
    for (let step = 0; step < 5; step += 1) fireEvent.keyDown(target, { key: "ArrowLeft" });
    expect(Number(shell().getAttribute("data-sidebar-width"))).toBeLessThanOrEqual(widened);
  });

  it("has no divider below the expanded breakpoint", () => {
    setViewport(false);
    renderLayout();
    expect(screen.queryByRole("separator")).not.toBeInTheDocument();
  });
});
