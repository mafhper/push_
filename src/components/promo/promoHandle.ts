import { PROMO_SAMPLE_HANDLE } from "./promoFleet";

/**
 * The `@handle` field on the promo queue card.
 *
 * It is a preview control: it relabels sample rows, it never resolves the
 * account and it never reaches GitHub. Validation is the public GitHub handle
 * rule (1–39 characters, alphanumeric or hyphen, no leading/trailing hyphen).
 */

export const GITHUB_HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/i;

export function normalizeHandle(raw: string): string {
  return String(raw ?? "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase();
}

export function isValidHandle(value: string): boolean {
  return GITHUB_HANDLE_PATTERN.test(value);
}

export interface HandlePreviewState {
  /** What the user has typed so far. */
  raw: string;
  /** The prefix the queue is currently labelled with. */
  applied: string;
  /** Last submission was rejected; `applied` was kept. */
  error: boolean;
  /** `applied` is the bundled sample fleet rather than a typed handle. */
  sample: boolean;
}

export const INITIAL_HANDLE_PREVIEW: HandlePreviewState = {
  raw: "",
  applied: PROMO_SAMPLE_HANDLE,
  error: false,
  sample: true,
};

/** Typing clears the previous rejection but never changes the applied prefix. */
export function editHandlePreview(state: HandlePreviewState, raw: string): HandlePreviewState {
  return { ...state, raw, error: false };
}

/**
 * Empty input restores the sample fleet; a valid handle relabels the queue; an
 * invalid one keeps the last applied prefix and raises the error state.
 */
export function applyHandlePreview(state: HandlePreviewState, raw: string): HandlePreviewState {
  const value = normalizeHandle(raw);

  if (!value) {
    return { raw, applied: PROMO_SAMPLE_HANDLE, error: false, sample: true };
  }

  if (!isValidHandle(value)) {
    return { ...state, raw, error: true };
  }

  return { raw, applied: value, error: false, sample: false };
}
