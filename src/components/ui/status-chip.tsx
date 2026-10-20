import type { HTMLAttributes, PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

/**
 * A status reading on a tinted chip: the **text is neutral** and the **hue
 * lives on the dot**.
 *
 * The previous pattern — `bg-critical/10 text-critical` — put a saturated hue
 * on its own tint. Measured in the browser across the seven themes, the /10
 * label spans 3.10–8.38:1, so it fails AA wherever the tint sits close to the
 * hue's lightness (warning in the light theme is 3.10). Neutral `foreground` on
 * the same tints spans 9.84–16.23:1, and the dot spans 3.10–8.38:1 as a
 * non-text indicator (1.4.11).
 *
 * `tone` is a *hue plus its tint*, not a semantic claim: `primary` exists
 * because the app already renders count/quantity chips in the accent colour,
 * and `destructive` because it is the alias the repository surfaces use.
 *
 * Warning is the tight tone: its dot on `bg-warning/10` over `surface-2` in the
 * light theme measures 3.10:1. Do not raise a warning chip to `/15` or `/20` —
 * the dot drops to 2.93 and 2.77 and stops identifying the status.
 *
 * Not for selection states or buttons: an active tab or an action button is
 * identified by its affordance, not by a status dot, and those keep their own
 * accent classes.
 */
export type StatusTone =
  | "success"
  | "warning"
  | "critical"
  | "destructive"
  | "info"
  | "primary"
  | "neutral";

const TONE: Record<StatusTone, { tint: string; dot: string }> = {
  success: { tint: "bg-success/10", dot: "bg-success" },
  warning: { tint: "bg-warning/10", dot: "bg-warning" },
  critical: { tint: "bg-critical/10", dot: "bg-critical" },
  destructive: { tint: "bg-destructive/10", dot: "bg-destructive" },
  info: { tint: "bg-info/10", dot: "bg-info" },
  primary: { tint: "bg-primary/10", dot: "bg-primary" },
  neutral: { tint: "bg-surface-3", dot: "bg-foreground-subtle" },
};

export function StatusChip({
  tone,
  children,
  className,
  ...rest
}: PropsWithChildren<{ tone: StatusTone } & Omit<HTMLAttributes<HTMLSpanElement>, "className" | "children"> & { className?: string }>) {
  return (
    <span
      {...rest}
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-foreground",
        TONE[tone].tint,
        className,
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", TONE[tone].dot)} />
      {children}
    </span>
  );
}
