import { Link } from "react-router";
import { TriangleAlert } from "lucide-react";
import { useApp } from "@/contexts/useApp";
import { cn } from "@/lib/utils";
import {
  QUOTA_FAMILY_LABEL_KEYS,
  QUOTA_STATUS_LABEL_KEYS,
  isQuotaAlert,
} from "@/quotas";
import type { QuotaPressure, QuotaStatus } from "@/quotas";

/**
 * The quota pill and the quota alert line.
 *
 * Both receive a `QuotaPressure` (status + percentage) that `@/quotas` already
 * classified. Nothing here divides by a limit, compares against 80/90 or knows
 * which family is worst: the surface renders a reading it was handed, which is
 * what keeps the frame, the overview line and the health penalty on the same
 * band.
 */

const PILL_TONE: Record<QuotaStatus, string> = {
  normal: "border-success/25 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  critical: "border-critical/25 bg-critical/10 text-critical",
  exceeded: "border-critical/40 bg-critical/15 text-critical",
  unknown: "border-border/60 bg-surface-3 text-foreground-subtle",
};

const DOT_TONE: Record<QuotaStatus, string> = {
  normal: "bg-success",
  warning: "bg-warning",
  critical: "bg-critical",
  exceeded: "bg-critical",
  unknown: "bg-foreground-subtle",
};

const LINE_TONE: Record<QuotaStatus, string> = {
  normal: "border-border/60 bg-surface-1/60 text-foreground-subtle",
  warning: "border-warning/25 bg-warning/5 text-warning",
  critical: "border-critical/25 bg-critical/5 text-critical",
  exceeded: "border-critical/35 bg-critical/8 text-critical",
  unknown: "border-border/60 bg-surface-1/60 text-foreground-subtle",
};

const FOCUS_RING =
  "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * Truncated instead of rounded: a reading of 79.9% must never print "80%"
 * under a success tone, so the displayed number stays inside its own band.
 */
function displayPercent(percent: number): number {
  return Math.max(0, Math.floor(percent));
}

export function QuotaPressurePill({ pressure, className }: { pressure: QuotaPressure; className?: string }) {
  const { t } = useApp();
  const isAccount = pressure.source === "account";
  const percent = displayPercent(pressure.percent);
  const statusLabel = t(QUOTA_STATUS_LABEL_KEYS[pressure.status]);
  const aria = isAccount
    ? t("quotaPillAria", { status: statusLabel, percent })
    : t("quotaRatePillAria", { status: statusLabel, percent });

  const content = (
    <>
      <span aria-hidden="true" className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOT_TONE[pressure.status])} />
      <span className="truncate font-mono text-[10px] uppercase tracking-[0.18em] opacity-70">
        {isAccount ? t("quotaPillLabel") : t("quotaRatePillLabel")}
      </span>
      <span className="font-mono text-[11px] font-semibold tabular-nums">{percent}%</span>
    </>
  );

  const classes = cn(
    "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1",
    PILL_TONE[pressure.status],
    className,
  );

  // Only the account reading has a destination; the API window is informational
  // and must not become a control that looks focusable but goes nowhere. Its
  // accessible sentence lives in an sr-only node because a bare span has no
  // role for `aria-label` to name reliably.
  if (!isAccount) {
    return (
      <span title={aria} className={classes}>
        <span className="sr-only">{aria}</span>
        <span aria-hidden="true" className="contents">
          {content}
        </span>
      </span>
    );
  }

  return (
    <Link
      to="/app/settings#settings-quotas"
      aria-label={aria}
      title={aria}
      className={cn(classes, "transition-colors hover:brightness-110", FOCUS_RING)}
    >
      {content}
    </Link>
  );
}

/**
 * The alert row under Fleet Overview.
 *
 * Warning, critical and exceeded render; normal and unknown render nothing at
 * all — the steady state is silence, not a green banner repeating the pill.
 * The row wraps instead of scrolling, so 360px keeps the whole sentence.
 */
export function QuotaAlertLine({
  pressure,
  className,
}: {
  pressure: QuotaPressure | null | undefined;
  className?: string;
}) {
  const { t } = useApp();

  if (!pressure || !isQuotaAlert(pressure.status) || pressure.threshold === null || pressure.alerting.length === 0) {
    return null;
  }

  const threshold = pressure.threshold;
  const families = pressure.alerting.map((family) => t(QUOTA_FAMILY_LABEL_KEYS[family.id])).join(", ");
  const title = t("quotaAlertBannerTitle");
  const body = t("quotaAlertBannerBody", { threshold, families });

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-wrap items-start gap-x-3 gap-y-1 rounded-xl border px-4 py-2.5 text-[12px] leading-5",
        LINE_TONE[pressure.status],
        className,
      )}
    >
      <TriangleAlert size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
      <p className="min-w-0 flex-1 break-words">
        <span className="font-semibold">{title}</span> <span className="opacity-80">{body}</span>
      </p>
      <Link
        to="/app/settings#settings-quotas"
        className={cn("shrink-0 font-semibold underline-offset-2 hover:underline", FOCUS_RING)}
      >
        {t("quotaAlertBannerLink")}
      </Link>
    </div>
  );
}
