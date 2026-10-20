/**
 * Sample rows for the inspector mock.
 *
 * These are fake GitHub records drawn inside a product screenshot: workflow
 * file names, branch names, commit subjects and pull-request titles. They are
 * data, not UI copy, so they stay in English in every locale — the same
 * exception the fleet names in `promoFleet.ts` already follow. Anything the
 * reader treats as a label ("Workflow runs", "Recent commits", the activity
 * captions) lives in the dictionary instead.
 */

export interface SampleRun {
  workflow: string;
  ref: string;
  ok: boolean;
  duration: string;
  when: string;
}

export const SAMPLE_RUNS: SampleRun[] = [
  { workflow: "ci.yml", ref: "main", ok: true, duration: "1m 48s", when: "2m" },
  { workflow: "pages.yml", ref: "main", ok: true, duration: "54s", when: "6m" },
  { workflow: "lint.yml", ref: "feat/pressure-legend", ok: false, duration: "22s", when: "3h" },
  { workflow: "ci.yml", ref: "deps/vite-8", ok: true, duration: "1m 51s", when: "1d" },
];

/** `[short hash, subject, age]` */
export const SAMPLE_COMMITS: [string, string, string][] = [
  ["a4f9c12", "fix: debounce chart resize on hi-dpi", "38m"],
  ["7be03d1", "feat: pressure legend on the queue", "5h"],
  ["0c2e8aa", "chore(deps): bump vite to 8.3", "1d"],
  ["e91b4f0", "docs: shortcut table in README", "2d"],
];

/** `[number, title, state, age]` */
export const SAMPLE_REVIEWS: [string, string, string, string][] = [
  ["#412", "Checkout retry budget", "review requested", "3d"],
  ["#409", "Bump vite to 8.3", "dependabot", "4d"],
  ["#404", "Export queue as CSV", "changes requested", "9d"],
  ["#398", "Keyboard map for the inspector", "draft", "16d"],
];

/** One bar per day, oldest first. */
export const SAMPLE_TRAIL = [3, 5, 2, 6, 4, 8, 7, 3, 9, 6, 5, 11, 7, 9];

export const SAMPLE_TRAIL_PEAK = Math.max(...SAMPLE_TRAIL);

/** The caption under the trail; derived so it cannot drift from the bars. */
export const SAMPLE_TRAIL_TOTAL = SAMPLE_TRAIL.reduce((sum, value) => sum + value, 0);
