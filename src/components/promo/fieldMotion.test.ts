import { describe, expect, it } from "vitest";
import { FIELD_DPR_CAP, fieldPixelRatio, shouldAnimateField } from "./fieldMotion";

describe("pressure field motion", () => {
  it("animates only when visible, on-screen and motion is allowed", () => {
    expect(shouldAnimateField({ reducedMotion: false, visible: true, documentHidden: false })).toBe(true);
  });

  it("freezes under reduced motion", () => {
    expect(shouldAnimateField({ reducedMotion: true, visible: true, documentHidden: false })).toBe(false);
  });

  it("freezes while the hero is off-screen", () => {
    expect(shouldAnimateField({ reducedMotion: false, visible: false, documentHidden: false })).toBe(false);
  });

  it("freezes in a hidden tab", () => {
    expect(shouldAnimateField({ reducedMotion: false, visible: true, documentHidden: true })).toBe(false);
  });

  it("caps the device pixel ratio at 1.75", () => {
    expect(FIELD_DPR_CAP).toBe(1.75);
    expect(fieldPixelRatio(3)).toBe(1.75);
    expect(fieldPixelRatio(1.5)).toBe(1.5);
    expect(fieldPixelRatio(1)).toBe(1);
    expect(fieldPixelRatio(Number.NaN)).toBe(1);
    expect(fieldPixelRatio(0)).toBe(1);
    expect(fieldPixelRatio(undefined)).toBe(1);
  });
});
