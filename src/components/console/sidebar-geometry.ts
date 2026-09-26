/**
 * Geometry of the repository list (the console sidebar) and its divider.
 *
 * The list is resizable: the user drags the divider on its right edge and the
 * width follows the pointer. Dragging below `SIDEBAR_COLLAPSE_AT` collapses the
 * list into the icon rail, and dragging it back out expands it again, so the
 * collapse is a natural end of the gesture instead of a separate mode.
 *
 * The values are pixels on purpose: the drag has to map 1:1 to the pointer, and
 * a rem-based grid cannot do that across font sizes.
 */

/** Width of the collapsed icon rail. Matches the historical `5.25rem` rail. */
export const SIDEBAR_RAIL_WIDTH = 84;

/** Width used until the user resizes for the first time (`24rem`). */
export const SIDEBAR_DEFAULT_WIDTH = 384;

/** Below this, the list is not worth showing expanded. */
export const SIDEBAR_MIN_WIDTH = 240;

/** Above this, the inspector loses too much room. */
export const SIDEBAR_MAX_WIDTH = 640;

/**
 * Drag threshold that collapses the list into the rail. Deliberately below
 * `SIDEBAR_MIN_WIDTH`: the last stretch of the gesture feels like the list
 * shrinking away, and coming back out is a single gesture in reverse.
 */
export const SIDEBAR_COLLAPSE_AT = 208;

/** Keyboard step, in pixels. */
export const SIDEBAR_KEYBOARD_STEP = 16;

/**
 * Width at which the labels are fully readable again while widening.
 *
 * Together with `SIDEBAR_COLLAPSE_AT` this defines the fade band: 92px of
 * travel. The text never has to be squeezed to fit, it fades out over that
 * stretch, and the rail takes over an already invisible text layer. The band
 * is wide on purpose — a short one reads as a blink instead of a transition.
 */
export const SIDEBAR_LABEL_FULL_WIDTH = 300;

/**
 * Opacity of the text layer for a given live width: `1` while the list is
 * comfortably wide, `0` once it reaches the collapse threshold.
 */
export function sidebarLabelOpacity(width: number): number {
  if (!Number.isFinite(width)) return 1;
  if (width <= SIDEBAR_COLLAPSE_AT) return 0;
  if (width >= SIDEBAR_LABEL_FULL_WIDTH) return 1;
  return (width - SIDEBAR_COLLAPSE_AT) / (SIDEBAR_LABEL_FULL_WIDTH - SIDEBAR_COLLAPSE_AT);
}

/** Keeps a stored or dragged width inside the supported range. */
export function clampSidebarWidth(value: number): number {
  if (!Number.isFinite(value)) return SIDEBAR_DEFAULT_WIDTH;
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, Math.round(value)));
}
