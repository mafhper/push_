import { useState } from "react";
import { AlertTriangle, Check, ChevronDown, ChevronRight, ExternalLink, HelpCircle, Minus, XCircle } from "lucide-react";
import { StatusPill } from "@/components/site/TerminalPrimitives";
import { useApp } from "@/contexts/useApp";
import type { DictKey } from "@/i18n";
import type { HealthCategoryResult, HealthCheck, HealthCheckStatus, HealthReport } from "@/health";
import type { DataDetailMode } from "@/types";
import { cn } from "@/lib/utils";

type TFunction = (key: DictKey, values?: Record<string, string | number>) => string;

const CATEGORY_LABEL_KEYS: Partial<Record<HealthCategoryResult["category"], DictKey>> = {
  governance: "healthCatGovernance",
  ci: "healthCatCi",
  security: "healthCatSecurity",
  dependencies: "healthCatDependencies",
  release: "healthCatRelease",
  deployment: "healthCatDeployment",
  hygiene: "healthCatHygiene",
};

const STATUS_TEXT_KEYS: Record<Exclude<HealthCheckStatus, "not_applicable">, DictKey> = {
  pass: "healthStatusPass",
  warning: "healthStatusWarning",
  fail: "healthStatusFail",
  unknown: "healthStatusUnknown",
};

function reportTone(status: HealthReport["status"]): "success" | "warning" | "critical" {
  if (status === "healthy") return "success";
  if (status === "warning") return "warning";
  return "critical";
}

function StatusGlyph({ status, size = 15, className }: { status: HealthCheckStatus; size?: number; className?: string }) {
  if (status === "pass") return <Check size={size} className={className} />;
  if (status === "warning") return <AlertTriangle size={size} className={className} />;
  if (status === "fail") return <XCircle size={size} className={className} />;
  if (status === "not_applicable") return <Minus size={size} className={className} />;
  return <HelpCircle size={size} className={className} />;
}

function statusIconTone(status: HealthCheckStatus): string {
  if (status === "pass") return "text-primary";
  if (status === "warning") return "text-secondary";
  if (status === "fail") return "text-destructive";
  return "text-foreground/35";
}

function checkPillTone(status: HealthCheckStatus): "success" | "warning" | "critical" | "neutral" {
  if (status === "pass") return "success";
  if (status === "warning") return "warning";
  if (status === "fail") return "critical";
  return "neutral";
}

function fmtScore(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function summaryCounts(report: HealthReport) {
  let passed = 0;
  let attention = 0;
  let notVerified = 0;
  let notApplicable = 0;
  for (const category of report.categories) {
    for (const check of category.checks) {
      if (check.status === "pass") passed += 1;
      else if (check.status === "warning" || check.status === "fail") attention += 1;
      else if (check.status === "unknown") notVerified += 1;
      else if (check.status === "not_applicable") notApplicable += 1;
    }
  }
  return { passed, attention, notVerified, notApplicable };
}

export function RepositoryHealthSection({ report, mode }: { report: HealthReport; mode: DataDetailMode }) {
  const { t } = useApp();
  const [drillIn, setDrillIn] = useState(false);
  const effectiveMode = drillIn ? "detailed" : mode;
  const counts = summaryCounts(report);
  const attentionChecks = report.categories
    .flatMap((category) => category.checks)
    .filter((check) => check.status === "warning" || check.status === "fail");
  const confidenceHigh = report.confidence >= 70;
  const criticalOverrides = report.metrics.dependabotCriticalCount;
  const ciOverrides = report.metrics.failedRuns7d;

  const defaultOpen = report.categories
    .filter((category) => category.checks.some((check) => check.status === "warning" || check.status === "fail"))
    .map((category) => category.category);
  const [openCategories, setOpenCategories] = useState<string[]>(() => defaultOpen);

  const toggleCategory = (id: string) => {
    setOpenCategories((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  return (
    <section className="rounded-[2rem] ops-surface p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="terminal-label">{t("healthTitle")}</p>
          <h2 className="mt-3 text-fluid-3xl font-black tracking-tighter text-foreground">
            {report.score}
            <span className="text-lg font-medium text-muted-foreground"> / 100</span>
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {mode === "balanced" && (
            <button
              type="button"
              onClick={() => setDrillIn((current) => !current)}
              className="button-secondary-terminal h-9 px-3 text-xs"
            >
              {t(drillIn ? "back" : "healthWhyScore", { score: report.score })}
            </button>
          )}
          <StatusPill tone={reportTone(report.status)}>{t(report.status === "healthy" ? "healthy" : report.status === "warning" ? "watch" : "criticalLabel")}</StatusPill>
        </div>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">
        {confidenceHigh
          ? t("healthConfidenceHigh")
          : t("healthConfidenceLimited", { verified: report.verifiedChecks, total: report.totalChecks })}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <CountPill label={t("healthChecksPassed", { count: counts.passed })} tone="success" />
        <CountPill label={t("healthChecksAttention", { count: counts.attention })} tone={counts.attention > 0 ? "warning" : "neutral"} />
        <CountPill label={t("healthChecksNotVerified", { count: counts.notVerified })} tone="neutral" />
      </div>

      {(criticalOverrides > 0 || ciOverrides > 0) && (
        <div className="mt-4 space-y-2">
          {criticalOverrides > 0 && (
            <div className="flex items-start gap-3 rounded-[1.1rem] bg-destructive/12 px-4 py-3 shadow-[inset_0_0_0_1px_rgba(255,92,86,0.18)]">
              <XCircle size={15} className="mt-0.5 shrink-0 text-destructive" />
              <div>
                <p className="text-sm font-semibold text-destructive">{t("healthOverrideCritical")}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t("healthOverrideCriticalBody", { count: criticalOverrides })}</p>
              </div>
            </div>
          )}
          {ciOverrides > 0 && (
            <div className="flex items-start gap-3 rounded-[1.1rem] bg-secondary/12 px-4 py-3 shadow-[inset_0_0_0_1px_rgba(175,141,17,0.2)]">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-secondary" />
              <div>
                <p className="text-sm font-semibold text-secondary">{t("healthOverrideCi")}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t("healthOverrideCiBody", { count: ciOverrides })}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {effectiveMode === "balanced" ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
          <div className="rounded-[1.4rem] ops-surface-soft p-4">
            <p className="terminal-label">{t("attention")}</p>
            <div className="mt-4 space-y-3">
              {attentionChecks.length > 0 ? (
                attentionChecks.slice(0, 5).map((check) => <AttentionRow key={check.id} check={check} t={t} />)
              ) : (
                <p className="text-sm text-muted-foreground">{t("repoNothingUrgent")}</p>
              )}
            </div>
          </div>
          <div className="rounded-[1.4rem] ops-surface-deep p-4">
            <p className="terminal-label">{t("healthTitle")}</p>
            <div className="mt-4 space-y-2">
              {report.categories.map((category) => <CategoryChip key={category.category} category={category} t={t} />)}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {report.categories.map((category) => {
            const isOpen = effectiveMode === "full" || openCategories.includes(category.category);
            const hasAttention = category.checks.some((check) => check.status === "warning" || check.status === "fail");
            return (
              <div key={category.category} className="rounded-[1.35rem] ops-surface-soft">
                <button
                  type="button"
                  onClick={() => toggleCategory(category.category)}
                  disabled={effectiveMode === "full"}
                  className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
                >
                  <span className="inline-flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
                    {mode !== "full" ? (
                      isOpen ? <ChevronDown size={14} className="shrink-0 text-foreground/45" /> : <ChevronRight size={14} className="shrink-0 text-foreground/45" />
                    ) : null}
                    <span className="truncate">{t(CATEGORY_LABEL_KEYS[category.category] ?? "healthTitle")}</span>
                    {hasAttention ? <AlertTriangle size={13} className="shrink-0 text-secondary" /> : null}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {fmtScore(category.score)}/{category.maxScore > 0 ? fmtScore(category.maxScore) : "–"}
                  </span>
                </button>
                {isOpen && (
                  <div className="space-y-3 px-4 pb-4">
                    {category.checks.map((check) => <CheckRow key={check.id} check={check} t={t} />)}
                    {category.maxScore === 0 && (
                      <p className="text-xs text-muted-foreground">{t("healthNotScoredHint")}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {effectiveMode === "full" && <p className="mt-4 text-xs text-muted-foreground">{t("healthAuditNote")}</p>}
    </section>
  );
}

function CountPill({ label, tone }: { label: string; tone: "success" | "warning" | "neutral" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold",
        tone === "success" && "bg-primary/10 text-primary",
        tone === "warning" && "bg-secondary/12 text-secondary",
        tone === "neutral" && "bg-white/[0.04] text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}

function AttentionRow({ check, t }: { check: HealthCheck; t: TFunction }) {
  return (
    <div className="flex items-start gap-3 rounded-[1rem] bg-black/18 px-3 py-3">
      <StatusGlyph status={check.status} className={cn("mt-0.5 shrink-0", statusIconTone(check.status))} />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{check.label}</p>
        {check.evidence ? <p className="mt-1 text-xs text-muted-foreground">{check.evidence}</p> : null}
      </div>
    </div>
  );
}

function CategoryChip({ category, t }: { category: HealthCategoryResult; t: TFunction }) {
  const pct = category.maxScore > 0 ? (category.score / category.maxScore) * 100 : 0;
  return (
    <div className="rounded-[1rem] bg-black/18 px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="truncate text-sm font-medium text-foreground">{t(CATEGORY_LABEL_KEYS[category.category] ?? "healthTitle")}</span>
        <span className="shrink-0 font-mono text-xs text-muted-foreground">{fmtScore(category.score)}/{category.maxScore > 0 ? fmtScore(category.maxScore) : "–"}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
        <div className="h-full rounded-full bg-primary/70" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function CheckRow({ check, t }: { check: HealthCheck; t: TFunction }) {
  const isUnverified = check.status === "unknown" || check.status === "not_applicable";
  const statusText = isUnverified
    ? check.status === "unknown"
      ? t("healthStatusUnknown")
      : t("healthStatusNotApplicable")
    : t(STATUS_TEXT_KEYS[check.status as Exclude<HealthCheckStatus, "not_applicable">]);

  return (
    <div className="flex items-start justify-between gap-4 rounded-[1rem] bg-black/18 px-3 py-3">
      <div className="flex min-w-0 items-start gap-3">
        <StatusGlyph status={check.status} className={cn("mt-0.5 shrink-0", statusIconTone(check.status))} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{check.label}</p>
          {check.evidence ? (
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="text-foreground/45">{t("healthEvidence")}: </span>
              {check.evidence}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <StatusPill tone={checkPillTone(check.status)}>{statusText}</StatusPill>
        {check.url ? (
          <a href={check.url} className="text-foreground/45 transition-colors hover:text-primary" aria-label={check.label}>
            <ExternalLink size={13} />
          </a>
        ) : null}
      </div>
    </div>
  );
}