import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PressureField } from "./PressureField";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("pressure field fallback", () => {
  it("hides the canvas and marks the fallback when WebGL2 is unavailable", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null as never);

    const { container } = render(<PressureField sources={[{ x: 0.5, y: 0.5, amp: 1 }]} />);
    const canvas = container.querySelector("canvas");

    expect(canvas).not.toBeNull();
    expect(canvas?.dataset.fallback).toBe("true");
    // The hiding itself is CSS: `data-[fallback=true]:hidden` in the component.
    expect(canvas?.getAttribute("aria-hidden")).toBe("true");
  });
});
