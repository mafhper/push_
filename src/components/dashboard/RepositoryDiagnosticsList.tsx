import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { StatusPill } from "@/components/site/TerminalPrimitives";
import { useApp } from "@/contexts/useApp";
import { cn } from "@/lib/utils";

type DiagnosticsTone = "success" | "warning" | "critical" | "neutral";

export interface DiagnosticsSignal {
  label: string;
  value: string;
  tone?: DiagnosticsTone;
}

export interface DiagnosticsRow {
  id: string;
  route: string;
  rank: number;
  name: string;
  owner: string;
  defaultBranch: string;
  description?: string | null;
  statusLabel: string;
  statusTone: DiagnosticsTone;
  activityLabel: string;
  summaryLabel: string;
  signals: DiagnosticsSignal[];
}

export function RepositoryDiagnosticsList({
  items,
  title,
  body,
}: {
  items: DiagnosticsRow[];
  title?: string;
  body?: string;
}) {
  const { t } = useApp();
  const attentionCount = items.filter((item) => item.statusTone !== "success").length;
  const calmCount = items.length - attentionCount;
  const resolvedTitle = title ?? t("fleetQueueTitle");
  const resolvedBody = body ?? t("fleetQueueBody");

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_11rem_11rem]">
        <div className="rounded-[1.6rem] ops-surface-soft px-5 py-4">
          <p className="terminal-label">{resolvedTitle}</p>
          <p className="mt-2 text-sm text-muted-foreground">{resolvedBody}</p>
        </div>
        <SummaryTile label={t("needsAction")} value={attentionCount} tone={attentionCount > 0 ? "warning" : "success"} />
        <SummaryTile label={t("stable")} value={calmCount} tone="neutral" />
      </div>

      <div className="space-y-2.5">
        {items.map((item) => (
          <Link
            key={item.id}
            to={item.route}
            className={cn(
              "block rounded-[1.6rem] px-4 py-4 transition-all",
              item.statusTone === "critical"
                ? "ops-surface-deep shadow-[inset_0_0_0_1px_rgba(244,122,97,0.14)] hover:shadow-[inset_0_0_0_1px_rgba(244,122,97,0.22)]"
                : item.statusTone === "warning"
                  ? "ops-surface-deep shadow-[inset_0_0_0_1px_rgba(175,141,17,0.14)] hover:shadow-[inset_0_0_0_1px_rgba(175,141,17,0.22)]"
                  : "ops-surface-deep shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] hover:bg-white/[0.03]",
            )}
          >
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(20rem,1fr)_9rem] xl:items-start">
              <div className="min-w-0 space-y-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-foreground/34">
                      #{String(item.rank).padStart(2, "0")}
                    </span>
                    <StatusPill tone={item.statusTone}>{item.statusLabel}</StatusPill>
                  </div>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <p className="min-w-0 text-base font-semibold text-foreground">{item.name}</p>
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/44">
                      {item.defaultBranch} / {item.owner}
                    </span>
                  </div>
                </div>
                <p className="max-w-[68ch] text-sm leading-6 text-muted-foreground">
                  {item.description || item.summaryLabel}
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-4">
                <SignalPill label={t("summary")} value={item.summaryLabel} tone={item.statusTone} />
                {item.signals.map((signal) => (
                  <SignalPill key={`${item.id}-${signal.label}`} label={signal.label} value={signal.value} tone={signal.tone ?? "neutral"} />
                ))}
              </div>

              <div className="flex items-center justify-between gap-4 xl:block xl:text-right">
                <div>
                  <p className="terminal-label">{t("lastMovementLabel")}</p>
                  <p className="mt-2 text-sm font-semibold text-foreground/78">{item.activityLabel}</p>
                </div>
                <span className="mt-0 inline-flex items-center gap-2 text-sm font-semibold text-primary xl:mt-3 xl:justify-end">
                  {t("openDetail")}
                  <ArrowRight size={14} />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  tone?: DiagnosticsTone;
}) {
  return (
    <div className="rounded-[1.6rem] ops-surface-soft px-5 py-4">
      <p className="terminal-label">{label}</p>
      <p
        className={cn(
          "mt-3 text-3xl font-black tracking-tight text-foreground",
          tone === "success" && "text-primary",
          tone === "warning" && "text-secondary",
          tone === "critical" && "text-destructive",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function SignalPill({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: DiagnosticsTone;
}) {
  return (
    <div
      className={cn(
        "rounded-[1.15rem] px-3 py-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]",
        tone === "success" && "bg-primary/[0.08] text-primary",
        tone === "warning" && "bg-secondary/[0.08] text-secondary",
        tone === "critical" && "bg-destructive/[0.08] text-destructive",
        tone === "neutral" && "bg-white/[0.03] text-foreground/72",
      )}
    >
      <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-current/65">{label}</p>
      <p className="mt-1 text-sm font-semibold leading-5 text-foreground">{value}</p>
    </div>
  );
}
