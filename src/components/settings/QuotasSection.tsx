import { useId, useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, Info, LoaderCircle, RefreshCw, TriangleAlert } from "lucide-react";
import { useApp } from "@/contexts/useApp";
import { formatDate, formatDateTime, getIntlLocale } from "@/i18n";
import { cn } from "@/lib/utils";
import {
  FREE_PLAN_LIMITS,
  QUOTA_FAMILY_LABEL_KEYS,
  QUOTA_ORIGIN_LABEL_KEYS,
  QUOTA_STATUS_LABEL_KEYS,
  QUOTA_UNIT_LABEL_KEYS,
  daysUntil,
  evaluateQuota,
} from "@/quotas";
import type { AccountQuotaSnapshot, QuotaFamily, QuotaStatus, QuotaUnit, RepoQuotaUsage } from "@/quotas";
import { MixedAccountBanner } from "./MixedAccountBanner";

type QuotasSectionProps = {
  snapshot: AccountQuotaSnapshot | undefined;
  isLoading: boolean;
  isError: boolean;
  hasSession: boolean;
  onRetry: () => void;
};

const STATUS_TEXT_TONE: Record<QuotaStatus, string> = {
  normal: "text-success",
  warning: "text-warning",
  critical: "text-critical",
  exceeded: "text-critical",
  unknown: "text-foreground-subtle",
};

const STATUS_PILL_TONE: Record<QuotaStatus, string> = {
  normal: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  critical: "bg-critical/10 text-critical",
  exceeded: "bg-critical/15 text-critical",
  unknown: "bg-surface-3 text-foreground-subtle",
};

const BAR_TONE: Record<QuotaStatus, string> = {
  normal: "bg-success",
  warning: "bg-warning",
  critical: "bg-critical",
  exceeded: "bg-critical",
  unknown: "bg-foreground-subtle/40",
};

function formatNumber(value: number, locale: string, unit: QuotaUnit): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: unit === "minutes" ? 0 : 1,
  }).format(value);
}

/** Repository rows mix cache (10 GB) and artifacts; GB reads better from 1 GB up. */
function formatSizeMb(value: number, locale: string): string {
  if (value >= 1024) {
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value / 1024)} GB`;
  }
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)} MB`;
}

/**
 * Account quotas (PU14 compressed it to numbers, bar and reset).
 *
 * The chapter is the last one of Settings and follows the page pattern: one
 * `SurfaceCard` per family, a `StatusLine` for used/limit and percentage, then
 * the bar and one reset line. The long explanations moved into accessible
 * disclosures — the screen shows the number; the reasoning is one click away.
 */
export function QuotasSection({ snapshot, isLoading, isError, hasSession, onRetry }: QuotasSectionProps) {
  const { t, settings } = useApp();

  return (
    <section id="settings-quotas" className="scroll-mt-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-[19px] font-semibold tracking-tight text-foreground">{t("quotaSectionTitle")}</h2>
        {snapshot && (
          <div className="shrink-0 text-right">
            {snapshot.login && (
              <p className="text-[12px] font-medium text-foreground">{t("quotaAccount", { login: snapshot.login })}</p>
            )}
            <p className="text-[12px] tabular-nums text-foreground-subtle">
              {t("quotaUpdatedAt", { when: formatDateTime(snapshot.fetchedAt, settings.lang) })}
            </p>
          </div>
        )}
      </div>

      {!hasSession ? (
        <SurfaceCard>
          <div className="px-4 py-3.5">
            <p className="text-sm font-medium text-foreground">{t("quotaNoTokenTitle")}</p>
            <p className="mt-1 text-[13px] text-foreground-subtle">{t("quotaNoTokenBody")}</p>
          </div>
        </SurfaceCard>
      ) : !snapshot && isLoading ? (
        <SurfaceCard>
          <div className="flex items-center gap-2 px-4 py-3.5 text-[13px] text-foreground-subtle">
            <LoaderCircle size={14} className="animate-spin" />
            {t("quotaLoading")}
          </div>
        </SurfaceCard>
      ) : !snapshot ? (
        <BillingNotice state="error" message={undefined} onRetry={onRetry} />
      ) : (
        <div className="space-y-3">
          {/* The numbers below can belong to the previous account; the warning
              sits where the wrong rows are, not only in the access chapter. */}
          {snapshot.foreignOwners.length > 0 && (
            <MixedAccountBanner
              variant="compact"
              login={snapshot.login}
              owners={snapshot.foreignOwners}
              repoCount={snapshot.foreignRepoCount ?? snapshot.repoProbe.requested}
              testId="quota-account-mismatch"
            />
          )}
          {isError && <p className="text-[12px] text-warning">{t("quotaBillingErrorBody")}</p>}
          {snapshot.billing !== "enhanced" && snapshot.billing !== "legacy" && (
            <BillingNotice state={snapshot.billing} message={snapshot.billingMessage} onRetry={onRetry} />
          )}

          {snapshot.families.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {snapshot.families.map((family) => (
                <QuotaCard key={`${family.id}:${family.unit}`} family={family} />
              ))}
            </div>
          ) : (
            <SurfaceCard>
              <p className="px-4 py-3.5 text-[13px] text-foreground-subtle">{t("quotaNoFamilies")}</p>
            </SurfaceCard>
          )}

          {snapshot.families.length > 0 && (
            <InfoNote label={t("quotaInfoAggregateLabel")} body={t("quotaAggregateNote")} />
          )}

          <RepositoryUsageCard
            repos={snapshot.repos}
            probe={snapshot.repoProbe}
            defaultOpen={snapshot.foreignOwners.length > 0}
          />
        </div>
      )}
    </section>
  );
}

function BillingNotice({
  state,
  message,
  onRetry,
}: {
  state: AccountQuotaSnapshot["billing"];
  message?: string;
  onRetry: () => void;
}) {
  const { t } = useApp();
  const copy = state === "forbidden"
    ? { title: t("quotaBillingForbiddenTitle"), body: t("quotaBillingForbiddenBody") }
    : state === "unavailable"
      ? { title: t("quotaBillingUnavailableTitle"), body: t("quotaBillingUnavailableBody") }
      : { title: t("quotaBillingErrorTitle"), body: t("quotaBillingErrorBody") };

  return (
    <div className="rounded-xl border border-warning/30 bg-warning/5 px-4 py-3.5">
      <div className="flex items-start gap-2">
        <TriangleAlert size={14} className="mt-0.5 shrink-0 text-warning" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{copy.title}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-foreground-subtle">{copy.body}</p>
          {message && <p className="mt-1.5 break-all font-mono text-[11px] text-foreground-subtle/70">{message}</p>}
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-md border border-border/60 bg-surface-2/70 px-2.5 text-[12px] font-medium text-foreground-subtle transition-colors hover:text-foreground"
          >
            <RefreshCw size={11} />
            {t("quotaRetry")}
          </button>
        </div>
      </div>
    </div>
  );
}

function QuotaCard({ family }: { family: QuotaFamily }) {
  const { t, settings } = useApp();
  const locale = getIntlLocale(settings.lang);
  const { percent, status } = evaluateQuota(family.used, family.limit);
  const clamped = percent === null ? 0 : Math.min(100, Math.max(0, percent));
  const resetDays = daysUntil(family.resetAt);
  const label = t(QUOTA_FAMILY_LABEL_KEYS[family.id]);
  const unitLabel = t(QUOTA_UNIT_LABEL_KEYS[family.unit]);

  const usedText = family.limit === null
    ? t("quotaUsedNoLimit", { used: formatNumber(family.used, locale, family.unit), unit: unitLabel })
    : t("quotaUsedOfLimit", {
        used: formatNumber(family.used, locale, family.unit),
        limit: formatNumber(family.limit, locale, family.unit),
        unit: unitLabel,
      });

  return (
    <SurfaceCard>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <span className={cn("shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold", STATUS_PILL_TONE[status])}>
          {t(QUOTA_STATUS_LABEL_KEYS[status])}
        </span>
      </div>

      <StatusLine
        label={usedText}
        value={percent === null ? null : t("quotaPercentValue", { percent: Math.floor(percent) })}
        valueTone={STATUS_TEXT_TONE[status]}
      />

      <div className="space-y-2 px-4 py-3">
        {family.limit !== null && (
          <div
            role="progressbar"
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.floor(clamped)}
            className="h-1.5 overflow-hidden rounded-full bg-surface-3"
          >
            <div className={cn("h-full rounded-full", BAR_TONE[status])} style={{ width: `${clamped}%` }} />
          </div>
        )}
        <p className="text-[12px] text-foreground-subtle/80">
          {family.resetAt && resetDays !== null
            ? resetDays <= 0
              ? t("quotaResetToday", { date: formatDate(family.resetAt, settings.lang, { month: "short", day: "numeric" }) })
              : t("quotaResetInDays", {
                  days: resetDays,
                  date: formatDate(family.resetAt, settings.lang, { month: "short", day: "numeric" }),
                })
            : "—"}
        </p>
        {family.origin === "legacy" && (
          <InfoNote
            label={t(QUOTA_ORIGIN_LABEL_KEYS[family.origin])}
            body={t("quotaOriginLegacyBody")}
          />
        )}
      </div>
    </SurfaceCard>
  );
}

function RepositoryUsageCard({
  repos,
  probe,
  defaultOpen,
}: {
  repos: RepoQuotaUsage[];
  probe: AccountQuotaSnapshot["repoProbe"];
  defaultOpen: boolean;
}) {
  const { t, settings } = useApp();
  const locale = getIntlLocale(settings.lang);
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <SurfaceCard>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={open ? contentId : undefined}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-foreground-subtle transition-colors hover:text-foreground"
      >
        {open
          ? <ChevronDown size={14} className="shrink-0" />
          : <ChevronRight size={14} className="shrink-0" />}
        <span className="text-[13px] font-semibold">{t("quotaPerRepoTitle")}</span>
        <span className="text-[12px] tabular-nums text-foreground-subtle/70">· {repos.length}</span>
      </button>

      {open && (
        <div id={contentId} className="space-y-2 px-4 py-3">
          {repos.length === 0 ? (
            <p className="text-[13px] text-foreground-subtle">{t("quotaPerRepoEmpty")}</p>
          ) : (
            <div className="divide-y divide-border/40 rounded-lg border border-border/40">
              {repos.map((repo) => (
                <div key={repo.fullName} className="px-3 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-medium text-foreground">{repo.fullName}</span>
                    {repo.actionsMinutes !== null && (
                      <span className="shrink-0 text-[12px] tabular-nums text-foreground-subtle">
                        {t("quotaRepoMinutes", { minutes: formatNumber(repo.actionsMinutes, locale, "minutes") })}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[12px] tabular-nums text-foreground-subtle">
                    {repo.cacheMb !== null && (
                      <span>
                        {t("quotaRepoCache", {
                          used: formatSizeMb(repo.cacheMb, locale),
                          limit: formatSizeMb(FREE_PLAN_LIMITS.repoCacheMb, locale),
                        })}
                      </span>
                    )}
                    {repo.artifactsMb !== null && (
                      <span>{t("quotaRepoArtifacts", { used: formatSizeMb(repo.artifactsMb, locale) })}</span>
                    )}
                    {repo.cacheMb === null && repo.artifactsMb === null && repo.actionsMinutes === null && (
                      <span className="italic">{t("quotaRepoNoData")}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {probe.probed < probe.requested && (
            <p className="text-[12px] text-foreground-subtle/80">
              {t("quotaReposTruncated", { shown: probe.probed, total: probe.requested })}
            </p>
          )}
          <InfoNote label={t("quotaInfoPerRepoLabel")} body={t("quotaPerRepoBody")} />
        </div>
      )}
    </SurfaceCard>
  );
}

/**
 * The long explanations, on demand. A button with a visible label and an
 * `aria-label` — not a `title` tooltip, which touch and keyboard never see.
 */
function InfoNote({ label, body }: { label: string; body: string }) {
  const [open, setOpen] = useState(false);
  const contentId = useId();

  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? contentId : undefined}
        className="inline-flex items-center gap-1.5 text-[12px] text-foreground-subtle/70 transition-colors hover:text-foreground"
      >
        <Info size={12} className="shrink-0" />
        {label}
      </button>
      {open && (
        <p id={contentId} className="mt-1 text-[12px] leading-relaxed text-foreground-subtle/80">
          {body}
        </p>
      )}
    </div>
  );
}

function StatusLine({ label, value, valueTone }: { label: string; value: string | null; valueTone?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-sm tabular-nums text-foreground-subtle">{label}</span>
      {value !== null && (
        <span className={cn("shrink-0 text-sm font-semibold tabular-nums", valueTone ?? "text-foreground")}>
          {value}
        </span>
      )}
    </div>
  );
}

/** Same surface used by the settings chapters: one bordered card for a group. */
function SurfaceCard({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-border/40 rounded-xl border border-border/60 bg-surface-1/50">{children}</div>;
}
