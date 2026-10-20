/**
 * Motion decisions for the pressure field, kept out of the renderer so they can
 * be tested without a WebGL context.
 */

export const FIELD_DPR_CAP = 1.75;

export interface FieldMotionInput {
  reducedMotion: boolean;
  visible: boolean;
  documentHidden: boolean;
}

/** The field animates only when visible, on-screen and motion is welcome. */
export function shouldAnimateField(input: FieldMotionInput): boolean {
  return !input.reducedMotion && input.visible && !input.documentHidden;
}

export function fieldPixelRatio(devicePixelRatio: number | undefined): number {
  const ratio = typeof devicePixelRatio === "number" && Number.isFinite(devicePixelRatio) && devicePixelRatio > 0
    ? devicePixelRatio
    : 1;
  return Math.min(ratio, FIELD_DPR_CAP);
}
