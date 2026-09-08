import { isTauriRuntime } from "@/config/site";

const MARK_PREFIX = "push:";

const MARKS = [
  "boot-start",
  "cache-hydrated",
  "shell-ready",
  "window-visible",
  "session-loaded",
  "dashboard-painted",
  "dashboard-fresh",
] as const;

export type StartupMark = (typeof MARKS)[number];

const enabled = typeof window !== "undefined" && (import.meta.env.DEV || isTauriRuntime());

export function bootMark(name: StartupMark) {
  if (!enabled) return;
  try {
    performance.mark(`${MARK_PREFIX}${name}`);
  } catch {
    /* instrumentation is best-effort */
  }
}

function measure(name: string, from: StartupMark, to: StartupMark) {
  try {
    return performance.measure(`${MARK_PREFIX}${name}`, `${MARK_PREFIX}${from}`, `${MARK_PREFIX}${to}`).duration;
  } catch {
    return null;
  }
}

export function logStartupReport() {
  if (!enabled) return;
  const rows: Array<{ measure: string; ms: string }> = [];
  const push = (name: string, from: StartupMark, to: StartupMark) => {
    const duration = measure(name, from, to);
    if (duration !== null) rows.push({ measure: name, ms: `${duration.toFixed(1)} ms` });
  };

  push("boot → cache hydrated", "boot-start", "cache-hydrated");
  push("boot → shell", "boot-start", "shell-ready");
  push("boot → window visible", "boot-start", "window-visible");
  push("boot → session loaded", "boot-start", "session-loaded");
  push("boot → dashboard painted", "boot-start", "dashboard-painted");
  push("boot → fresh data", "boot-start", "dashboard-fresh");
  push("cache hydrated → window visible", "cache-hydrated", "window-visible");
  push("window visible → dashboard painted", "window-visible", "dashboard-painted");

  console.debug(
    `%c[push_ boot] startup report`,
    "color:#4ade80;font-weight:bold",
    rows.length
      ? `\n${["measure", "duration"].join("\t")}\n${rows.map(r => `${r.measure}\t${r.ms}`).join("\n")}`
      : "no timing data",
  );
}