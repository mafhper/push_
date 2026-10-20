import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, ExternalLink, Info, LoaderCircle, RefreshCw, Trash2, TriangleAlert } from "lucide-react";
import { useApp } from "@/contexts/useApp";
import { toast } from "@/hooks/use-toast";
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
  sortQuotaRepos,
} from "@/quotas";
import type {
  AccountQuotaSnapshot,
  QuotaFamily,
  QuotaRepoSort,
  QuotaStatus,
  QuotaUnit,
  RepoQuotaUsage,
} from "@/quotas";
import { deleteRepoCache, listRepoCaches, type RepoCacheEntry } from "@/services/github-quotas";
import { MixedAccountBanner } from "./MixedAccountBanner";

type QuotasSectionProps = {
  snapshot: AccountQuotaSnapshot | undefined;
  isLoading: boolean;
  isError: boolean;
  hasSession: boolean;
  onRetry: () => void;
  /** Local runtime token; without it the repository actions do not exist. */
  token?: string;
  /** Diagnostics already proved the token cannot read Actions, so writing cannot work either. */
  actionsDenied?: boolean;
  /** Refreshes the quota snapshot after a destructive action succeeded. */
  onCachesCleared?: () => void;
};

/** Per-installation display preference; the value is a view choice, not data. */
const REPO_SORT_STORAGE_KEY = "push.quotaRepoSort";

function readRepoSortPreference(): QuotaRepoSort {
  if (typeof window === "undefined") return "usage";
  try {
    return window.localStorage.getItem(REPO_SORT_STORAGE_KEY) === "name" ? "name" : "usage";
  } catch {
    return "usage";
  }
}

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
  unknown: "bg-surface-3 text-foreground-muted",
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
export function QuotasSection({
  snapshot,
  isLoading,
  isError,
  hasSession,
  onRetry,
  token,
  actionsDenied,
  onCachesCleared,
}: QuotasSectionProps) {
  const { t, settings } = useApp();

  return (
    <section id="settings-quotas" className="scroll-mt-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-title font-headline font-semibold text-foreground">{t("quotaSectionTitle")}</h2>
        {snapshot && (
          <div className="shrink-0 text-right">
            {snapshot.login && (
              <p className="text-sm font-medium text-foreground">{t("quotaAccount", { login: snapshot.login })}</p>
            )}
            <p className="text-sm tabular-nums text-foreground-subtle">
              {t("quotaUpdatedAt", { when: formatDateTime(snapshot.fetchedAt, settings.lang) })}
            </p>
          </div>
        )}
      </div>

      {!hasSession ? (
        <SurfaceCard>
          <div className="px-4 py-3.5">
            <p className="text-sm font-medium text-foreground">{t("quotaNoTokenTitle")}</p>
            <p className="mt-1 text-sm text-foreground-subtle">{t("quotaNoTokenBody")}</p>
          </div>
        </SurfaceCard>
      ) : !snapshot && isLoading ? (
        <SurfaceCard>
          <div className="flex items-center gap-2 px-4 py-3.5 text-sm text-foreground-subtle">
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
          {isError && <p className="text-sm text-warning">{t("quotaBillingErrorBody")}</p>}
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
              <p className="px-4 py-3.5 text-sm text-foreground-subtle">{t("quotaNoFamilies")}</p>
            </SurfaceCard>
          )}

          {snapshot.families.length > 0 && (
            <InfoNote label={t("quotaInfoAggregateLabel")} body={t("quotaAggregateNote")} />
          )}

          <RepositoryUsageCard
            repos={snapshot.repos}
            probe={snapshot.repoProbe}
            defaultOpen={snapshot.foreignOwners.length > 0}
            token={token}
            actionsDenied={actionsDenied}
            onCachesCleared={onCachesCleared}
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
          <p className="mt-1 text-sm leading-relaxed text-foreground-subtle">{copy.body}</p>
          {message && <p className="mt-1.5 break-all font-mono text-micro text-foreground-subtle">{message}</p>}
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-md border border-border/60 bg-surface-2/70 px-2.5 text-sm font-medium text-foreground-subtle transition-colors hover:text-foreground"
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
        <span className={cn("shrink-0 rounded-md px-2 py-0.5 text-micro font-semibold", STATUS_PILL_TONE[status])}>
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
        <p className="text-sm text-foreground-subtle">
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
  token,
  actionsDenied,
  onCachesCleared,
}: {
  repos: RepoQuotaUsage[];
  probe: AccountQuotaSnapshot["repoProbe"];
  defaultOpen: boolean;
  token?: string;
  actionsDenied?: boolean;
  onCachesCleared?: () => void;
}) {
  const { t } = useApp();
  const [open, setOpen] = useState(defaultOpen);
  const [repoSort, setRepoSort] = useState<QuotaRepoSort>(readRepoSortPreference);
  const contentId = useId();
  // The snapshot order is the API's; the approved order is a view decision.
  const sortedRepos = useMemo(() => sortQuotaRepos(repos, repoSort), [repos, repoSort]);

  function chooseSort(value: QuotaRepoSort) {
    setRepoSort(value);
    try {
      window.localStorage.setItem(REPO_SORT_STORAGE_KEY, value);
    } catch {
      // A blocked storage only costs the preference; the current choice still applies.
    }
  }

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
        <span className="text-sm font-semibold">{t("quotaPerRepoTitle")}</span>
        <span className="text-sm tabular-nums text-foreground-subtle">· {repos.length}</span>
      </button>

      {open && (
        <div id={contentId} className="space-y-2 px-4 py-3">
          {repos.length === 0 ? (
            <p className="text-sm text-foreground-subtle">{t("quotaPerRepoEmpty")}</p>
          ) : (
            <>
              {/* A single row has no order to choose, so the control is absent. */}
              {sortedRepos.length > 1 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-0.5 text-micro font-semibold uppercase tracking-wider text-foreground-subtle">
                    {t("quotaRepoSortLabel")}
                  </span>
                  {(["usage", "name"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => chooseSort(value)}
                      aria-pressed={repoSort === value}
                      className={cn(
                        "shrink-0 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors",
                        repoSort === value
                          ? "bg-primary/10 text-primary"
                          : "text-foreground-subtle hover:bg-surface-2 hover:text-foreground",
                      )}
                    >
                      {value === "usage" ? t("quotaRepoSortUsage") : t("quotaRepoSortName")}
                    </button>
                  ))}
                </div>
              )}

              <div className="divide-y divide-border/40 rounded-lg border border-border/40">
                {sortedRepos.map((repo) => (
                  <RepositoryUsageRow
                    key={repo.fullName}
                    repo={repo}
                    token={token}
                    actionsDenied={actionsDenied}
                    onCachesCleared={onCachesCleared}
                  />
                ))}
              </div>
            </>
          )}
          {probe.probed < probe.requested && (
            <p className="text-sm text-foreground-subtle">
              {t("quotaReposTruncated", { shown: probe.probed, total: probe.requested })}
            </p>
          )}
          <InfoNote label={t("quotaInfoPerRepoLabel")} body={t("quotaPerRepoBody")} />
        </div>
      )}
    </SurfaceCard>
  );
}

type CacheFlow =
  | { phase: "idle" }
  | { phase: "listing" }
  | {
      phase: "confirm" | "deleting";
      entries: RepoCacheEntry[];
      totalCount: number;
      bytes: number;
      truncated: boolean;
    }
  | { phase: "done"; deleted: number; bytes: number }
  | { phase: "empty" }
  | {
      phase: "error";
      kind: "scope" | "list" | "delete";
      message?: string;
      deleted?: number;
      total?: number;
    };

/**
 * One repository row (PU15). The header is a non-exclusive disclosure: opening
 * it reveals the readings and the actions, and never closes another row.
 *
 * Cache deletion is deliberately a two-step inline flow — list, then confirm
 * with the exact count and size — because it is the only destructive action in
 * the surface and a native `confirm` cannot say what is being deleted.
 */
function RepositoryUsageRow({
  repo,
  token,
  actionsDenied,
  onCachesCleared,
}: {
  repo: RepoQuotaUsage;
  token?: string;
  actionsDenied?: boolean;
  onCachesCleared?: () => void;
}) {
  const { t, settings } = useApp();
  const locale = getIntlLocale(settings.lang);
  const [expanded, setExpanded] = useState(false);
  const [flow, setFlow] = useState<CacheFlow>({ phase: "idle" });
  const contentId = useId();
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);
  const busy = flow.phase === "listing" || flow.phase === "deleting";
  const scopeBlocked = Boolean(actionsDenied) || (flow.phase === "error" && flow.kind === "scope");
  const hasReadings = repo.cacheMb !== null || repo.artifactsMb !== null || repo.actionsMinutes !== null;

  // "Clear cache" unmounts when the confirmation replaces it; without moving
  // focus, the keyboard position falls back to the document.
  useEffect(() => {
    if (flow.phase === "confirm") confirmButtonRef.current?.focus();
  }, [flow.phase]);

  function doneMessage(deleted: number, bytes: number): string {
    const size = formatSizeMb(bytes / (1024 * 1024), locale);
    return deleted === 1
      ? t("quotaRepoClearCacheDoneOne", { size })
      : t("quotaRepoClearCacheDone", { count: deleted, size });
  }

  async function startListing() {
    if (!token || busy || scopeBlocked) return;
    setFlow({ phase: "listing" });
    const result = await listRepoCaches(token, repo.fullName);
    if (result.state === "error") {
      setFlow({
        phase: "error",
        kind: result.status === 403 ? "scope" : "list",
        message: result.message,
      });
      return;
    }
    const { entries, totalCount, truncated } = result.inventory;
    if (entries.length === 0) {
      setFlow({ phase: "empty" });
      return;
    }
    const bytes = entries.reduce((total, entry) => total + entry.sizeInBytes, 0);
    setFlow({ phase: "confirm", entries, totalCount, bytes, truncated });
  }

  async function confirmClear() {
    if (!token || flow.phase !== "confirm") return;
    const { entries, totalCount, bytes, truncated } = flow;
    setFlow({ phase: "deleting", entries, totalCount, bytes, truncated });

    let deleted = 0;
    let freed = 0;
    let failure: { status: number; message: string } | null = null;
    for (const entry of entries) {
      const result = await deleteRepoCache(token, repo.fullName, entry.id);
      if (result.state === "ok") {
        deleted += 1;
        freed += entry.sizeInBytes;
      } else if (!failure) {
        failure = { status: result.status, message: result.message };
      }
    }

    if (deleted > 0) {
      onCachesCleared?.();
      toast({ title: doneMessage(deleted, freed) });
    }

    if (failure) {
      setFlow({
        phase: "error",
        kind: failure.status === 403 ? "scope" : "delete",
        message: failure.message,
        deleted,
        total: entries.length,
      });
      return;
    }
    setFlow({ phase: "done", deleted, bytes: freed });
  }

  const confirmSize = flow.phase === "confirm" || flow.phase === "deleting"
    ? formatSizeMb(flow.bytes / (1024 * 1024), locale)
    : "";
  const confirmLabel = flow.phase === "confirm"
    ? flow.entries.length === 1
      ? t("quotaRepoClearCacheConfirmOne", { size: confirmSize })
      : t("quotaRepoClearCacheConfirm", { count: flow.entries.length, size: confirmSize })
    : null;

  return (
    <div className="px-3 py-2.5" data-testid="quota-repo-row" data-full-name={repo.fullName}>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        aria-controls={expanded ? contentId : undefined}
        className="flex w-full items-center gap-2 text-left"
      >
        {expanded
          ? <ChevronDown size={14} className="shrink-0 text-foreground-subtle" />
          : <ChevronRight size={14} className="shrink-0 text-foreground-subtle" />}
        <span className="truncate text-sm font-medium text-foreground">{repo.fullName}</span>
      </button>

      {expanded && (
        <div id={contentId} className="mt-2 space-y-2 border-t border-border/40 pt-2">
          <div className="flex flex-wrap gap-x-4 gap-y-1 pl-6 text-sm tabular-nums text-foreground-subtle">
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
            {repo.actionsMinutes !== null && (
              <span>{t("quotaRepoMinutes", { minutes: formatNumber(repo.actionsMinutes, locale, "minutes") })}</span>
            )}
            {!hasReadings && <span className="italic">{t("quotaRepoNoData")}</span>}
          </div>

          <p className="pl-6 text-sm leading-relaxed text-foreground-subtle">
            {t("quotaRepoMinutesNotRecoverable")}
          </p>

          {token && (
            <div className="space-y-2 pl-6" aria-busy={busy}>
              {scopeBlocked ? (
                <div className="space-y-1 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2">
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border/60 bg-surface-2/70 px-2.5 text-sm font-medium text-foreground-subtle/60"
                  >
                    <Trash2 size={12} />
                    {t("quotaRepoClearCache")}
                  </button>
                  <p className="text-sm leading-relaxed text-foreground-subtle">
                    {t("quotaRepoClearCacheNoScope")}
                  </p>
                  <a
                    href="#settings-access"
                    className="inline-flex min-h-6 items-center text-sm font-medium text-primary transition-opacity hover:opacity-80"
                  >
                    {t("quotaRepoClearCacheScopeLink")}
                  </a>
                </div>
              ) : flow.phase === "confirm" ? (
                <div className="space-y-1.5 rounded-lg border border-critical/30 bg-critical/5 px-3 py-2">
                  <p className="text-sm leading-relaxed text-foreground-subtle">
                    {t("quotaRepoClearCacheConfirmBody")}
                  </p>
                  {flow.truncated && (
                    <p className="text-sm text-warning">
                      {t("quotaRepoClearCacheTruncated", {
                        shown: flow.entries.length,
                        total: flow.totalCount,
                      })}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      ref={confirmButtonRef}
                      onClick={confirmClear}
                      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-critical/40 bg-critical/10 px-2.5 text-sm font-semibold text-critical transition-colors hover:bg-critical/15"
                    >
                      <Trash2 size={12} />
                      {confirmLabel}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFlow({ phase: "idle" })}
                      className="inline-flex h-8 items-center rounded-md border border-border/60 bg-surface-2/70 px-2.5 text-sm font-medium text-foreground-subtle transition-colors hover:text-foreground"
                    >
                      {t("quotaRepoClearCacheCancel")}
                    </button>
                  </div>
                </div>
              ) : flow.phase === "deleting" ? (
                <button
                  type="button"
                  disabled
                  aria-busy="true"
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border/60 bg-surface-2/70 px-2.5 text-sm font-medium text-foreground-subtle"
                >
                  <LoaderCircle size={12} className="animate-spin" />
                  {t("quotaRepoClearCacheDeleting")}
                </button>
              ) : flow.phase === "listing" ? (
                <button
                  type="button"
                  disabled
                  aria-busy="true"
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border/60 bg-surface-2/70 px-2.5 text-sm font-medium text-foreground-subtle"
                >
                  <LoaderCircle size={12} className="animate-spin" />
                  {t("quotaRepoClearCacheListing")}
                </button>
              ) : (
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={startListing}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border/60 bg-surface-2/70 px-2.5 text-sm font-medium text-foreground-subtle transition-colors hover:border-critical/40 hover:text-critical"
                  >
                    <Trash2 size={12} />
                    {t("quotaRepoClearCache")}
                  </button>
                  {flow.phase === "empty" && (
                    <p className="text-sm text-foreground-subtle">{t("quotaRepoClearCacheEmpty")}</p>
                  )}
                  {flow.phase === "done" && (
                    <p role="status" className="text-sm font-medium text-success">
                      {doneMessage(flow.deleted, flow.bytes)}
                    </p>
                  )}
                  {flow.phase === "error" && flow.kind !== "scope" && (
                    <p role="alert" className="text-sm leading-relaxed text-warning">
                      {flow.deleted && flow.total
                        ? t("quotaRepoClearCachePartial", {
                            deleted: flow.deleted,
                            total: flow.total,
                            message: flow.message ?? "",
                          })
                        : flow.kind === "list"
                          ? t("quotaRepoClearCacheListFailed", { message: flow.message ?? "" })
                          : t("quotaRepoClearCacheFailed", { message: flow.message ?? "" })}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pl-6 text-sm">
            <a
              href={`https://github.com/${repo.fullName}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-foreground-subtle transition-colors hover:text-foreground"
            >
              <ExternalLink size={11} />
              {t("quotaRepoViewOnGitHub")}
            </a>
            <a
              href={`https://github.com/${repo.fullName}/actions/caches`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-foreground-subtle transition-colors hover:text-foreground"
            >
              <ExternalLink size={11} />
              {t("quotaRepoManageCaches")}
            </a>
          </div>
        </div>
      )}
    </div>
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
        className="inline-flex min-h-6 items-center gap-1.5 text-sm text-foreground-subtle transition-colors hover:text-foreground"
      >
        <Info size={12} className="shrink-0" />
        {label}
      </button>
      {open && (
        <p id={contentId} className="mt-1 text-sm leading-relaxed text-foreground-subtle">
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
