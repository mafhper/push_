import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { KeyRound, LoaderCircle, ShieldCheck, Star, LogOut, UserRound, ChevronDown, ChevronRight, Lock, GitFork, Archive, ExternalLink, Check, X, CircleQuestionMark, Activity, SlidersHorizontal, ListTree, Gauge, TriangleAlert } from "lucide-react";
import { APP_VERSION, SITE_REPOSITORY_URL, isLocalSecureRuntime } from "@/config/site";
import { useApp } from "@/contexts/useApp";
import { useAccountQuotas, useDashboardSnapshot, useRateLimit, useRepos, useSnapshotManifest } from "@/hooks/useGitHub";
import { MixedAccountBanner } from "@/components/settings/MixedAccountBanner";
import { AttentionSettingsControls } from "@/components/settings/AttentionSettingsControls";
import { QuotasSection } from "@/components/settings/QuotasSection";
import { StatusChip } from "@/components/ui/status-chip";
import { foreignRepoOwners, foreignRepos, isMixedAccount, isQuotaAlert, summarizeQuotas } from "@/quotas";
import { formatDateTime, type DictKey, type Language } from "@/i18n";
import { cn } from "@/lib/utils";
import { diagnoseToken, validateToken } from "@/services/github";
import { saveGithubToken } from "@/services/secure-storage";
import { openExternal } from "@/services/open-external";
import { saveIdentity } from "@/services/presentation-identity";
import type { DataDetailMode, RepositoryRef, Theme, TokenPermissionId } from "@/types";

/**
 * Fixed precedence for classification and for breaking size ties in the
 * display order. The chevrons are ordered by group size (biggest first) and
 * fall back to this order on ties; which group a repository *belongs* to is
 * decided by `repoGroupOf`, whose precedence is the separate rule below.
 */
const REPO_GROUPS = ["public", "private", "other", "fork"] as const;
type RepoGroupId = (typeof REPO_GROUPS)[number];

/** Order offered for the rows inside every group. */
const REPO_SORTS = ["name", "updated", "created"] as const;
type RepoSort = (typeof REPO_SORTS)[number];

/** Where GitHub creates each token kind. */
const FINE_GRAINED_TOKEN_URL = "https://github.com/settings/personal-access-tokens/new";
const CLASSIC_TOKEN_URL = "https://github.com/settings/tokens/new";

/** Required read capabilities, in the order they are presented. */
const TOKEN_PERMISSION_IDS = ["metadata", "contents", "actions", "dependabot"] as const satisfies readonly TokenPermissionId[];

/**
 * The settings summary rail: one entry per chapter, in page order (PU14,
 * approved 2026-10-19). The array drives the rail, the scroll-spy and the
 * initial chapter, so the DOM order below must match it.
 */
const SETTINGS_SECTIONS = [
  { id: "settings-preferences", labelKey: "preferences", icon: SlidersHorizontal },
  { id: "settings-scoring", labelKey: "settingsAttentionRail", icon: TriangleAlert },
  { id: "settings-access", labelKey: "githubAccess", icon: KeyRound },
  { id: "settings-repos", labelKey: "repositoryControl", icon: ListTree },
  { id: "settings-state", labelKey: "currentMode", icon: Activity },
  { id: "settings-quotas", labelKey: "quotas", icon: Gauge },
] as const satisfies readonly { id: string; labelKey: DictKey; icon: typeof KeyRound }[];

/** Most recent first; missing or invalid dates sort last. */
function compareDateDesc(a: string | undefined, b: string | undefined): number {
  const aTime = a ? Date.parse(a) : Number.NaN;
  const bTime = b ? Date.parse(b) : Number.NaN;
  const aValue = Number.isNaN(aTime) ? Number.NEGATIVE_INFINITY : aTime;
  const bValue = Number.isNaN(bTime) ? Number.NEGATIVE_INFINITY : bTime;
  return bValue - aValue;
}

/** Rows a capped group shows before the explicit "show all" affordance. */
const REPO_GROUP_PAGE = 50;

/**
 * Accordion state per category. `partial` only exists while the visible list
 * is longer than `REPO_GROUP_PAGE`, so the title click cycles
 * closed → first page → everything → closed. The accordion is exclusive: at
 * most one group leaves `closed` at a time.
 */
type RepoGroupState = "closed" | "partial" | "open";

const CLOSED_GROUPS: Record<RepoGroupId, RepoGroupState> = {
  public: "closed",
  private: "closed",
  other: "closed",
  fork: "closed",
};

function nextGroupState(current: RepoGroupState, capped: boolean): RepoGroupState {
  if (current === "open") return "closed";
  if (current === "partial") return "open";
  return capped ? "partial" : "open";
}

/**
 * Mutually exclusive classification with fixed precedence (Q4/Q5), which is
 * independent of the display order above:
 * 1. a fork whose upstream is **not** accessible → Forks;
 * 2. private → Private;
 * 3. archived → Others;
 * 4. otherwise → Public.
 *
 * An unknown upstream (`forkOf === null`, e.g. the extra request failed) counts
 * as "not accessible": the honest reading is "we could not prove otherwise".
 */
function repoGroupOf(repo: RepositoryRef, accessibleFullNames: Set<string>): RepoGroupId {
  const upstreamAccessible = repo.forkOf ? accessibleFullNames.has(repo.forkOf.fullName) : false;
  if (repo.isFork && !upstreamAccessible) return "fork";
  if (repo.isPrivate) return "private";
  if (repo.archived) return "other";
  return "public";
}

export default function SettingsPage() {
  const { settings, updateSettings, session, setSession, logout, sessionStatus, primaryRepo, setPrimaryRepo, selectedRepos, setSelectedRepos, t } = useApp();
  const localSecureMode = isLocalSecureRuntime();
  const { data: manifest } = useSnapshotManifest();
  const { data: overview } = useDashboardSnapshot();
  const { data: repos = [], isLoading: reposLoading } = useRepos();
  const { data: rateLimit } = useRateLimit();
  const {
    data: quotaSnapshot,
    isLoading: quotasLoading,
    isError: quotasError,
    refetch: refetchQuotas,
  } = useAccountQuotas();
  const [tokenInput, setTokenInput] = useState("");
  const [connectError, setConnectError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  /**
   * Result of a reconciliation, kept by the page because the banner that
   * triggered it unmounts as soon as the mismatch is gone (or the session ends).
   */
  const [accountNotice, setAccountNotice] = useState<string | null>(null);
  const [repoQuery, setRepoQuery] = useState("");
  const [repoFilter, setRepoFilter] = useState<"all" | "selected" | "unselected">("all");
  const [repoSort, setRepoSort] = useState<RepoSort>("name");
  const [groupState, setGroupState] = useState<Record<RepoGroupId, RepoGroupState>>(CLOSED_GROUPS);
  const repoSearchActive = repoQuery.trim().length > 0;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState<string>(SETTINGS_SECTIONS[0].id);

  /** The summary rail follows the page scroll, so the reader knows the chapter. */
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const syncActiveSection = () => {
      const containerTop = container.getBoundingClientRect().top;
      let current: string = SETTINGS_SECTIONS[0].id;
      for (const section of SETTINGS_SECTIONS) {
        const element = document.getElementById(section.id);
        if (element && element.getBoundingClientRect().top - containerTop <= 120) current = section.id;
      }
      // A short page — every chevron closed — cannot scroll the last chapter to
      // the top, so geometric matching alone never reaches it. Arriving at the
      // end of the scroll means the reader is on the last chapter.
      const scrollable = container.scrollHeight > container.clientHeight + 24;
      if (scrollable && container.scrollTop + container.clientHeight >= container.scrollHeight - 24) {
        const lastExisting = [...SETTINGS_SECTIONS].reverse().find((section) => document.getElementById(section.id));
        if (lastExisting) current = lastExisting.id;
      }
      setActiveSection(current);
    };
    container.addEventListener("scroll", syncActiveSection, { passive: true });
    syncActiveSection();
    return () => container.removeEventListener("scroll", syncActiveSection);
  }, [localSecureMode, session]);

  function goToSection(id: string) {
    document.getElementById(id)?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }

  /**
   * The alerts banner links to `Settings#settings-quotas`. The router does not
   * scroll to a hash by itself, so the destination does it once, after the
   * section exists in the DOM.
   */
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;
    const timer = window.setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView?.({ block: "start" });
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!localSecureMode || !session?.token) return;
    // A valid diagnostics without a permissions report comes from a session
    // created before the report existed (e.g. a hot-reloaded dev session);
    // refresh it so the permissions panel has data.
    if (session.diagnostics && (session.diagnostics.token !== "valid" || session.diagnostics.permissions)) return;
    let cancelled = false;
    diagnoseToken(session.token).then((diagnostics) => {
      if (!cancelled) {
        setSession({ ...session, diagnostics });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [localSecureMode, session, setSession]);

  const selectedRepoCount = localSecureMode && session ? selectedRepos.length : (overview?.repos.length ?? 0);
  const featuredRepoLabel = localSecureMode ? (primaryRepo ?? "none") : (manifest?.featuredRepo ?? "none");

  const quotaSummary = quotaSnapshot ? summarizeQuotas(quotaSnapshot.families) : null;
  const quotaBadgeVisible = Boolean(quotaSummary && isQuotaAlert(quotaSummary.status));
  const quotaBadgePercent = quotaSummary?.percent ? Math.floor(quotaSummary.percent) : 0;
  const quotaBadgeTone: "warning" | "critical" = quotaSummary?.status === "warning" ? "warning" : "critical";

  /**
   * PU14: the selection is stored per installation, so a token swap can leave
   * another account's repositories selected. The banner names the mismatch and
   * offers the three explicit paths; this page never reconciles on its own.
   */
  const mixedAccount = Boolean(session && isMixedAccount(session.username, selectedRepos));
  const mixedOwners = session ? foreignRepoOwners(session.username, selectedRepos) : [];
  const mixedRepoCount = session ? foreignRepos(session.username, selectedRepos).length : 0;

  const accessibleFullNames = useMemo(() => new Set(repos.map((repo) => repo.fullName)), [repos]);

  /**
   * Stable order inside every group, controlled by the sort selector. The
   * default is alphabetical; featured and selected repositories keep their
   * position in any mode, because toggling a row must never reorder the list
   * or the row under the pointer would move mid-selection. The star and the
   * checkbox carry the state instead of the position.
   */
  const filteredRepos = useMemo(() => {
    const q = repoQuery.trim().toLowerCase();
    return repos
      .filter(r => {
        if (repoFilter === "selected") return selectedRepos.includes(r.fullName);
        if (repoFilter === "unselected") return !selectedRepos.includes(r.fullName);
        return true;
      })
      .filter(r => !q || `${r.fullName} ${r.description ?? ""} ${r.language ?? ""}`.toLowerCase().includes(q))
      .sort((a, b) => {
        if (repoSort === "updated") return compareDateDesc(a.updatedAt, b.updatedAt) || a.fullName.localeCompare(b.fullName);
        if (repoSort === "created") return compareDateDesc(a.createdAt, b.createdAt) || a.fullName.localeCompare(b.fullName);
        return a.fullName.localeCompare(b.fullName);
      });
  }, [repoFilter, repoQuery, repoSort, repos, selectedRepos]);

  /**
   * Total per group, before the search and the selected/unselected axis, so a
   * group never disappears because a filter hid its items (RF-08) and its
   * counter keeps reporting the real total. Chevrons are ordered by that
   * total, biggest first; ties keep the fixed precedence so the order stays
   * deterministic while the catalog loads.
   */
  const groups = useMemo(() => {
    const totals: Record<RepoGroupId, number> = { fork: 0, private: 0, other: 0, public: 0 };
    for (const repo of repos) {
      totals[repoGroupOf(repo, accessibleFullNames)] += 1;
    }
    return REPO_GROUPS
      .map((id) => {
        const visible = filteredRepos.filter((repo) => repoGroupOf(repo, accessibleFullNames) === id);
        return {
          id,
          repos: visible,
          total: totals[id],
          selectedTotal: visible.filter((repo) => selectedRepos.includes(repo.fullName)).length,
        };
      })
      .sort((a, b) => (b.total - a.total) || (REPO_GROUPS.indexOf(a.id) - REPO_GROUPS.indexOf(b.id)));
  }, [accessibleFullNames, filteredRepos, repos, selectedRepos]);

  const groupLabels: Record<RepoGroupId, string> = {
    public: t("repoGroupPublic"),
    private: t("repoGroupPrivate"),
    fork: t("repoGroupForks"),
    other: t("repoGroupOthers"),
  };
  const repoSortLabels: Record<RepoSort, string> = {
    name: t("repoSortName"),
    updated: t("repoSortModified"),
    created: t("repoSortCreated"),
  };
  const permissionLabels: Record<TokenPermissionId, string> = {
    metadata: t("permMetadata"),
    contents: t("permContents"),
    actions: t("permActions"),
    dependabot: t("permDependabot"),
  };
  const themeOptions = [
    { value: "dark", label: t("themeDark"), swatch: "linear-gradient(90deg,#050505,#262626,#4b5563)" },
    { value: "light", label: t("themeLight"), swatch: "linear-gradient(90deg,#f8fafc,#dbeafe,#2563eb)" },
    { value: "phosphor-green", label: t("themePhosphorGreen"), swatch: "linear-gradient(90deg,#03120a,#22ff4f,#a7ff83)" },
    { value: "golden-matrix", label: t("themeGoldenMatrix"), swatch: "linear-gradient(90deg,#120c02,#f59e0b,#fde68a)" },
    { value: "blue-calm", label: t("themeBlueCalm"), swatch: "linear-gradient(90deg,#061826,#38bdf8,#bfdbfe)" },
    { value: "green-ish", label: t("themeGreenIsh"), swatch: "linear-gradient(90deg,#04130d,#34d399,#bbf7d0)" },
    { value: "brown-earth", label: t("themeBrownEarth"), swatch: "linear-gradient(90deg,#120a05,#b45309,#fed7aa)" },
  ] as const;
  const groupEmptyLabels: Record<RepoGroupId, string> = {
    public: t("repoGroupPublicEmpty"),
    private: t("repoGroupPrivateEmpty"),
    fork: t("repoGroupForksEmpty"),
    other: t("repoGroupOthersEmpty"),
  };

  if (!manifest) {
    return (
      <div className="flex h-full items-center justify-center gap-3 text-body text-foreground-subtle">
        <LoaderCircle size={16} className="animate-spin" />
        {t("loadingSettings")}
      </div>
    );
  }

  async function handleConnect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = tokenInput.trim();
    if (!trimmed) { setConnectError(t("connectionError")); return; }
    setIsConnecting(true);
    setConnectError(null);
    const viewer = await validateToken(trimmed);
    setIsConnecting(false);
    if (!viewer || !viewer.login) {
      const key = viewer?.error === "invalid_format" ? "tokenFormatError"
        : viewer?.error === "rate_limited" ? "rateLimitError"
        : viewer?.error === "invalid_token" ? "invalidToken"
        : "connectionError";
      setConnectError(t(key)); return;
    }
    const diagnostics = await diagnoseToken(trimmed);
    setSession({ token: trimmed, username: viewer.login, avatarUrl: viewer.avatarUrl, diagnostics });
    setAccountNotice(null);
    await saveGithubToken(trimmed);
    saveIdentity({ username: viewer.login, avatarUrl: viewer.avatarUrl, savedAt: new Date().toISOString() });
    setTokenInput("");
  }

  function handleDisconnect() {
    logout();
    setTokenInput("");
    setConnectError(null);
    setAccountNotice(null);
  }

  /** Single write path, so the featured repo always follows the selection. */
  function applySelection(fullNames: string[]) {
    const next = [...new Set(fullNames)];
    setSelectedRepos(next);
    if (!next.length) setPrimaryRepo(null);
    else if (!primaryRepo || !next.includes(primaryRepo)) setPrimaryRepo(next[0]);
  }

  function toggleRepo(fullName: string) {
    applySelection(
      selectedRepos.includes(fullName)
        ? selectedRepos.filter((entry) => entry !== fullName)
        : [...selectedRepos, fullName],
    );
  }

  function fullNamesInGroup(groupId: RepoGroupId): string[] {
    return repos
      .filter((repo) => repoGroupOf(repo, accessibleFullNames) === groupId)
      .map((repo) => repo.fullName);
  }

  function selectGroup(groupId: RepoGroupId) {
    applySelection([...selectedRepos, ...fullNamesInGroup(groupId)]);
  }

  function clearGroup(groupId: RepoGroupId) {
    const groupNames = new Set(fullNamesInGroup(groupId));
    applySelection(selectedRepos.filter((entry) => !groupNames.has(entry)));
  }

  /**
   * Private repositories are opt-in (Q2), so the global action never crosses
   * into the private group: selecting them is a conscious act inside their own
   * group, or through `diagnosticsPrivateScopeHint`. This is what CA-7 asserts.
   */
  function selectAllNonPrivate() {
    applySelection([
      ...selectedRepos,
      ...repos.filter((repo) => !repo.isPrivate).map((repo) => repo.fullName),
    ]);
  }

  function deselectAll() {
    applySelection([]);
  }

  return (
    <div ref={scrollRef} className="h-full min-h-0 w-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-5 py-6 md:px-8 md:py-8">

        {/* Header */}
        <div className="max-w-3xl">
          <h1 className="text-display font-headline font-bold tracking-tight text-foreground">{t("settings")}</h1>
          <p className="text-body text-foreground-subtle mt-1">
            {localSecureMode ? t("connectLocalTokenBody") : t("snapshotOnlyBody")}
          </p>
        </div>

        {/* Summary rail, horizontal on narrow screens */}
        <nav aria-label={t("settings")} className="mt-5 flex gap-1 overflow-x-auto lg:hidden">
          {SETTINGS_SECTIONS.map((section) => {
            const Icon = section.icon;
            const active = activeSection === section.id;
            return (
              <button key={section.id} type="button" onClick={() => goToSection(section.id)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                  active ? "bg-surface-2 text-foreground" : "text-foreground-subtle hover:bg-surface-2/60 hover:text-foreground",
                )}>
                <Icon size={15} className="shrink-0" />
                {t(section.labelKey)}
                {section.id === "settings-quotas" && quotaBadgeVisible && (
                  <StatusChip
                    tone={quotaBadgeTone}
                    aria-label={t("quotaRailBadge", { percent: quotaBadgePercent })}
                    className="rounded-md px-1.5 py-0.5 text-micro font-semibold tabular-nums"
                  >
                    {quotaBadgePercent}%
                  </StatusChip>
                )}
              </button>
            );
          })}
        </nav>

        <div className="mt-6 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10 lg:mt-8">

          {/* Summary rail, vertical on wide screens */}
          <nav aria-label={t("settings")} className="hidden space-y-1 lg:sticky lg:top-6 lg:block lg:self-start">
            {SETTINGS_SECTIONS.map((section) => {
              const Icon = section.icon;
              const active = activeSection === section.id;
              return (
                <button key={section.id} type="button" onClick={() => goToSection(section.id)}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    active ? "bg-surface-2 text-foreground" : "text-foreground-subtle hover:bg-surface-2/60 hover:text-foreground",
                  )}>
                  <Icon size={15} className="shrink-0" />
                  {t(section.labelKey)}
                  {section.id === "settings-quotas" && quotaBadgeVisible && (
                    <StatusChip
                      tone={quotaBadgeTone}
                      aria-label={t("quotaRailBadge", { percent: quotaBadgePercent })}
                      className="ml-auto rounded-md px-1.5 py-0.5 text-micro font-semibold tabular-nums"
                    >
                      {quotaBadgePercent}%
                    </StatusChip>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="min-w-0 space-y-8">

        {/* Preferences */}
        <section id="settings-preferences" className="scroll-mt-4 space-y-3">
          <h2 className="text-title font-headline font-semibold text-foreground">{t("preferences")}</h2>
          <SurfaceCard>
            {/* Theme: dropdown with the color dot beside each theme name. */}
            <div className="grid grid-cols-1 items-center gap-2 px-4 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-4">
              <p className="text-sm font-medium text-foreground">{t("theme")}</p>
              <ThemeDropdown
                label={t("theme")}
                value={settings.theme}
                options={themeOptions}
                onChange={(value) => updateSettings({ theme: value as Theme })}
              />
            </div>

            {/* Language */}
            <div className="grid grid-cols-1 items-center gap-2 px-4 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-4">
              <p className="text-sm font-medium text-foreground">{t("language")}</p>
              <select
                aria-label={t("language")}
                value={settings.lang}
                onChange={(event) => updateSettings({ lang: event.target.value as Language })}
                className="h-9 w-full shrink-0 rounded-lg border border-border/60 bg-surface-2 px-2.5 text-sm text-foreground outline-hidden transition-colors focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-52"
              >
                <option value="en">{t("english")}</option>
                <option value="pt-BR">{t("portugueseBrazil")}</option>
                <option value="es">{t("spanish")}</option>
              </select>
            </div>

            {/* Detail level, with the active level's own hint. */}
            <div className="grid grid-cols-1 items-center gap-2 px-4 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">{t("dataDetailLevel")}</p>
                <p className="mt-1 text-sm text-foreground-subtle">
                  {(settings.dataDetailMode ?? "balanced") === "detailed" ? t("detailDetailedHint")
                    : (settings.dataDetailMode ?? "balanced") === "full" ? t("detailFullHint")
                    : t("detailBalancedHint")}
                </p>
              </div>
              <select
                aria-label={t("dataDetailLevel")}
                value={settings.dataDetailMode ?? "balanced"}
                onChange={(event) => updateSettings({ dataDetailMode: event.target.value as DataDetailMode })}
                className="h-9 w-full shrink-0 rounded-lg border border-border/60 bg-surface-2 px-2.5 text-sm text-foreground outline-hidden transition-colors focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-52"
              >
                <option value="balanced">{t("detailBalanced")}</option>
                <option value="detailed">{t("detailDetailed")}</option>
                <option value="full">{t("detailFull")}</option>
              </select>
            </div>
          </SurfaceCard>
        </section>

        {/* Queue scoring: emphasis preferences, local to this device. The
            chapter sits between the interface preferences and the access
            chapter, and its order is mirrored by SETTINGS_SECTIONS. */}
        <section id="settings-scoring" className="scroll-mt-4 space-y-3">
          <div>
            <h2 className="text-title font-headline font-semibold text-foreground">{t("settingsAttentionTitle")}</h2>
            <p className="mt-1 text-sm text-foreground-subtle">{t("settingsAttentionBody")}</p>
          </div>
          <SurfaceCard>
            <AttentionSettingsControls repos={overview?.repos ?? []} />
          </SurfaceCard>
        </section>

        {/* GitHub access */}
        <section id="settings-access" className="scroll-mt-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-title font-headline font-semibold text-foreground">{t("githubAccess")}</h2>
                <p className="text-sm text-foreground-subtle mt-1">
                  {localSecureMode ? t("tokenSessionOnlyBody") : t("publishedRuntimeNoBrowserTokenBody")}
                </p>
              </div>
              <StatusChip
                tone={
                  localSecureMode
                    ? session
                      ? "success"
                      : sessionStatus === "invalid"
                        ? "critical"
                        : "warning"
                    : "neutral"
                }
                className="text-micro font-semibold px-2 py-1 rounded-md shrink-0"
              >
                {localSecureMode && session ? t("localAuth")
                  : localSecureMode && sessionStatus === "invalid" ? t("invalidToken")
                  : localSecureMode ? t("awaitingTokenLabel")
                  : t("snapshotOnly")}
              </StatusChip>
            </div>

            {accountNotice && (
              <p
                role="status"
                className="rounded-lg border border-success/30 bg-success/5 px-3 py-2 text-sm text-foreground"
              >
                {accountNotice}
              </p>
            )}

            {localSecureMode && session && mixedAccount && (
              <MixedAccountBanner
                login={session.username}
                owners={mixedOwners}
                repoCount={mixedRepoCount}
                onResolved={setAccountNotice}
              />
            )}

            {localSecureMode ? (
              <div className="space-y-3">
                <SurfaceCard>
                  {/* Identity row */}
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    {session?.avatarUrl ? (
                      <img src={session.avatarUrl} alt="" className="h-10 w-10 rounded-full ring-1 ring-border" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-3 text-primary"><UserRound size={16} /></div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-micro font-semibold uppercase tracking-wider text-foreground-subtle">{t("currentIdentity")}</p>
                      <p className="text-sm font-semibold text-foreground truncate">{session ? `@${session.username}` : t("noActiveSession")}</p>
                    </div>
                    {session && (
                      <button onClick={handleDisconnect} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-border/60 bg-surface-2/70 px-3 text-sm font-medium text-foreground-subtle transition-colors hover:border-critical/40 hover:text-critical">
                        <LogOut size={12} /> {t("disconnect")}
                      </button>
                    )}
                  </div>

                  {/* Token row */}
                  <form onSubmit={handleConnect} className="px-4 py-3.5">
                    <label className="text-micro font-semibold text-foreground-subtle uppercase tracking-wider">{t("githubToken")}</label>
                    <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
                      <div className="relative flex-1">
                        <KeyRound size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground-subtle/40" />
                        <input
                          type="password" autoComplete="off"
                          value={tokenInput}
                          onChange={e => setTokenInput(e.target.value)}
                          placeholder={session ? t("pasteNewToken") : t("pastePersonalToken")}
                          className="h-10 w-full rounded-lg border border-border/60 bg-surface-2 pl-9 pr-3 text-sm text-foreground outline-hidden placeholder:text-foreground-muted focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors"
                        />
                      </div>
                      <button type="submit" disabled={isConnecting} className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
                        {isConnecting ? <LoaderCircle size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                        {session ? t("updateToken") : t("connect")}
                      </button>
                    </div>
                    {connectError && <p className="mt-2 text-sm text-critical">{connectError}</p>}
                  </form>

                  {/* Memory row */}
                  <p className="px-4 py-3 text-sm text-foreground-subtle">{t("tokenMemoryOnlyBody")}</p>
                </SurfaceCard>

                {/* What to create and where */}
                <SurfaceCard>
                  <div className="space-y-3 px-4 py-4">
                    <p className="text-micro font-semibold uppercase tracking-wider text-foreground-subtle">{t("permissionsNeeded")}</p>
                    <ul className="grid gap-1.5 sm:grid-cols-2">
                      {TOKEN_PERMISSION_IDS.map((id) => (
                        <li key={id} className="flex items-center gap-1.5 text-sm text-foreground-subtle">
                          <Check size={12} className="shrink-0 text-primary" />
                          {permissionLabels[id]}
                        </li>
                      ))}
                    </ul>
                    <p className="text-sm leading-relaxed text-foreground-subtle">{t("tokenSetupHint")}</p>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={FINE_GRAINED_TOKEN_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-surface-3/50 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                      >
                        <ExternalLink size={11} />
                        {t("tokenCreateFineGrained")}
                      </a>
                      <a
                        href={CLASSIC_TOKEN_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-surface-3/50 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                      >
                        <ExternalLink size={11} />
                        {t("tokenCreateClassic")}
                      </a>
                    </div>
                  </div>
                </SurfaceCard>
              </div>
            ) : (
              <SurfaceCard>
                <p className="px-4 py-3.5 text-sm text-foreground-subtle leading-relaxed">
                  {t("publishedRuntimeNoBrowserTokenBody")}
                </p>
              </SurfaceCard>
            )}
          </section>

        {/* Repository Selection (only in local mode) */}
        {localSecureMode && session && (
          <section id="settings-repos" className="scroll-mt-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-title font-headline font-semibold text-foreground">{t("repositoryControl")}</h2>
                <p className="text-sm text-foreground-subtle mt-1" aria-live="polite">
                  {t("groupSelectedOfTotal", { selected: selectedRepos.length, total: repos.length })}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={selectAllNonPrivate} className="inline-flex h-8 items-center rounded-lg border border-primary/30 bg-primary/10 px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/15">
                  {t("bulkSelectPublic")}
                </button>
                <button onClick={deselectAll} className="inline-flex h-8 items-center rounded-lg border border-border/60 bg-surface-2/70 px-3 text-sm font-medium text-foreground-subtle transition-colors hover:text-foreground">
                  {t("bulkDeselectAll")}
                </button>
              </div>
            </div>

            {/* The selection is what feeds the mismatch, so the echo lives
                here too — one line, with the way back to the actions. */}
            {mixedAccount && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2">
                <TriangleAlert size={12} className="shrink-0 text-warning" />
                <p className="min-w-0 flex-1 text-sm leading-relaxed text-foreground-subtle">
                  {t("mixedAccountEcho", {
                    count: mixedRepoCount,
                    owners: mixedOwners.join(", "),
                    login: session.username,
                  })}
                </p>
                <button
                  type="button"
                  onClick={() => goToSection("settings-access")}
                  className="inline-flex min-h-6 shrink-0 items-center text-sm font-medium text-primary transition-opacity hover:opacity-80"
                >
                  {t("mixedAccountEchoLink")}
                </button>
              </div>
            )}

            {/* Search + Filters + Sort */}
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <input
                  type="text" value={repoQuery} onChange={e => setRepoQuery(e.target.value)}
                  placeholder={t("repoSearchPlaceholder")}
                  className="flex-1 h-9 rounded-lg border border-border/60 bg-surface-2 px-3 text-sm text-foreground outline-hidden placeholder:text-foreground-muted focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors"
                />
                <div className="flex gap-1 overflow-x-auto">
                  {(["all", "selected", "unselected"] as const).map(f => (
                    <button key={f} onClick={() => setRepoFilter(f)}
                      className={cn(
                        "shrink-0 text-sm font-medium px-2.5 py-1.5 rounded-lg transition-colors",
                        repoFilter === f ? "bg-primary/10 text-primary" : "text-foreground-subtle hover:bg-surface-2 hover:text-foreground"
                      )}>
                      {f === "all" ? t("all") : f === "selected" ? t("selected") : t("filterUnselected")}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-micro font-semibold uppercase tracking-wider text-foreground-subtle mr-0.5">{t("repoSortLabel")}</span>
                {REPO_SORTS.map(sort => (
                  <button key={sort} onClick={() => setRepoSort(sort)} aria-pressed={repoSort === sort}
                    className={cn(
                      "shrink-0 text-sm font-medium px-2.5 py-1.5 rounded-lg transition-colors",
                      repoSort === sort ? "bg-primary/10 text-primary" : "text-foreground-subtle hover:bg-surface-2 hover:text-foreground"
                    )}>
                    {repoSortLabels[sort]}
                  </button>
                ))}
              </div>
            </div>

            {/* One accordion per category, biggest first, and exclusive:
                opening a chevron closes the others. There is no inner scroll
                container anymore: the page scrolls, so opening a group or
                toggling a row never jumps the list back to its start. */}
            <div className="space-y-2">
              {reposLoading && (
                <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-foreground-subtle">
                  <LoaderCircle size={14} className="animate-spin" />
                  {t("resolvingAccessibleRepositories")}
                </div>
              )}
              {!reposLoading && groups.map(group => {
                const state = groupState[group.id];
                const capped = group.repos.length > REPO_GROUP_PAGE;
                // A search reveals every match, uncapped and regardless of the
                // accordion state: a query never hides a result behind a click.
                const displayOpen = state !== "closed" || repoSearchActive;
                const visibleRepos = !displayOpen
                  ? []
                  : repoSearchActive || state === "open"
                    ? group.repos
                    : group.repos.slice(0, REPO_GROUP_PAGE);
                const headingId = `repo-group-${group.id}`;
                return (
                  <section key={group.id} role="group" aria-labelledby={headingId} className="rounded-xl border border-border/60 bg-surface-1/50">
                    <div className="sticky top-0 z-10 flex items-center gap-3 rounded-t-xl bg-surface-1/95 px-4 py-2.5 backdrop-blur-xs">
                      <button
                        onClick={() => {
                          if (repoSearchActive) return;
                          // Exclusive accordion: opening a chevron closes every
                          // other one. A group closed this way forgets its page
                          // state, so reopening always starts at the first page.
                          setGroupState(current => ({
                            ...CLOSED_GROUPS,
                            [group.id]: nextGroupState(current[group.id], capped),
                          }));
                        }}
                        aria-disabled={repoSearchActive}
                        aria-expanded={displayOpen}
                        aria-label={state === "open" ? t("repoGroupCollapse") : t("repoGroupExpand")}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left text-foreground transition-colors hover:text-primary"
                      >
                        {displayOpen ? <ChevronDown size={15} className="shrink-0 text-foreground-subtle" /> : <ChevronRight size={15} className="shrink-0 text-foreground-subtle" />}
                        <span id={headingId} className="truncate text-sm font-semibold">{groupLabels[group.id]}</span>
                        <span className="truncate text-sm text-foreground-subtle tabular-nums" aria-live="polite">
                          {t("groupSelectedOfTotal", { selected: group.selectedTotal, total: group.total })}
                        </span>
                      </button>
                      <div className="flex shrink-0 gap-2">
                        <button onClick={() => selectGroup(group.id)} disabled={group.total === 0} className="inline-flex h-8 items-center rounded-md border border-primary/30 bg-primary/10 px-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/15 disabled:opacity-40 disabled:hover:bg-primary/10">
                          {t("groupSelectAll")}
                        </button>
                        <button onClick={() => clearGroup(group.id)} disabled={group.selectedTotal === 0} className="inline-flex h-8 items-center rounded-md border border-border/60 bg-surface-2/70 px-2.5 text-sm font-medium text-foreground-subtle transition-colors hover:text-foreground disabled:opacity-40 disabled:hover:text-foreground-subtle">
                          {t("groupClear")}
                        </button>
                      </div>
                    </div>
                    {displayOpen && (
                      <div className="space-y-0.5 px-1.5 pb-1.5">
                        {visibleRepos.length > 0 ? visibleRepos.map(repo => (
                          <RepoRow
                            key={repo.fullName}
                            repo={repo}
                            isSelected={selectedRepos.includes(repo.fullName)}
                            isFeatured={repo.fullName === primaryRepo}
                            onToggle={() => toggleRepo(repo.fullName)}
                            t={t}
                          />
                        )) : (
                          <p className="px-3.5 py-2 text-sm text-foreground-subtle italic">
                            {group.total > 0 ? t("noRepoMatchesInGroup") : groupEmptyLabels[group.id]}
                          </p>
                        )}
                        {!repoSearchActive && state === "partial" && capped && (
                          <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5">
                            <p className="text-sm text-foreground-subtle tabular-nums">
                              {t("groupShowingFirst", { count: REPO_GROUP_PAGE, total: group.repos.length })}
                            </p>
                            <button
                              onClick={() => setGroupState(current => ({ ...current, [group.id]: "open" }))}
                              className="inline-flex h-8 items-center rounded-md border border-primary/30 bg-primary/10 px-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/15"
                            >
                              {t("groupShowAll", { count: group.repos.length })}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          </section>
        )}

        {/* Current state: session, token permissions and scope, each in its surface. */}
        <section id="settings-state" className="scroll-mt-4 space-y-3">
            <h2 className="text-title font-headline font-semibold text-foreground">{t("currentMode")}</h2>
            <div className="space-y-5 pt-1">
              <div className="space-y-2">
                <p className="text-micro font-semibold uppercase tracking-wider text-foreground-subtle">{t("sessionGroup")}</p>
                <SurfaceCard>
                  <StatusLine label={t("publishedSnapshotLabel")} value={formatDateTime(manifest.status.generatedAt, settings.lang)} />
                  <StatusLine label={t("snapshotSource")} value={manifest.status.generatedBy} />
                  <StatusLine label={t("currentMode")} value={localSecureMode ? (session ? "local-authenticated" : "localhost-public") : "github-pages"} />
                  <StatusLine label={t("visibleRepos")} value={String(selectedRepoCount)} />
                  {rateLimit && <StatusLine label={t("rateLimit")} value={`${rateLimit.remaining}/${rateLimit.limit}`} />}
                  <StatusLine label={t("featuredRepo")} value={featuredRepoLabel} />
                </SurfaceCard>
              </div>

              {localSecureMode && session?.diagnostics?.permissions && session.diagnostics.permissions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-micro font-semibold uppercase tracking-wider text-foreground-subtle">{t("tokenPermissions")}</p>
                    {session.diagnostics.kind && session.diagnostics.kind !== "unknown" && (
                      <span className="rounded-md bg-surface-3 px-1.5 py-0.5 text-micro font-medium text-foreground-muted">
                        {session.diagnostics.kind === "classic" ? t("tokenKindClassic") : t("tokenKindFineGrained")}
                      </span>
                    )}
                  </div>
                  <SurfaceCard>
                    {TOKEN_PERMISSION_IDS.map((id) => {
                      const status = session.diagnostics?.permissions?.find((permission) => permission.id === id)?.status ?? "unknown";
                      return (
                        <div key={id} className="flex items-center justify-between gap-3 px-4 py-3">
                          <span className="flex min-w-0 items-center gap-2 text-sm text-foreground">
                            {status === "granted" ? <Check size={13} className="shrink-0 text-success" />
                              : status === "denied" ? <X size={13} className="shrink-0 text-warning" />
                              : <CircleQuestionMark size={13} className="shrink-0 text-foreground-subtle" />}
                            <span className="truncate">{permissionLabels[id]}</span>
                          </span>
                          <span className={cn(
                            "shrink-0 text-sm font-semibold",
                            status === "granted" && "text-foreground",
                            status === "denied" && "text-warning",
                            status === "unknown" && "text-foreground-subtle",
                          )}>
                            {status === "granted" ? t("permGranted") : status === "denied" ? t("permDenied") : t("permUnknown")}
                          </span>
                        </div>
                      );
                    })}
                  </SurfaceCard>
                </div>
              )}

              {session?.diagnostics && (session.diagnostics.accessibleRepoCount !== undefined || session.diagnostics.privateRepoCount !== undefined || session.diagnostics.dependabotProbe) && (
                <div className="space-y-2">
                  <p className="text-micro font-semibold uppercase tracking-wider text-foreground-subtle">{t("scopeGroup")}</p>
                  <SurfaceCard>
                    {session.diagnostics.accessibleRepoCount !== undefined && (
                      <StatusLine label={t("diagnosticsAccessibleRepos")} value={String(session.diagnostics.accessibleRepoCount)} />
                    )}
                    {session.diagnostics.privateRepoCount !== undefined && (
                      <div className="space-y-1 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm text-foreground-subtle">{t("diagnosticsPrivateRepos")}</span>
                          <span className="truncate text-sm font-semibold tabular-nums text-foreground">{session.diagnostics.privateRepoCount}</span>
                        </div>
                        {session.diagnostics.privateRepoCount === 0 && (
                          <p className="text-sm leading-relaxed text-foreground-subtle">{t("diagnosticsPrivateScopeHint")}</p>
                        )}
                      </div>
                    )}
                    {session.diagnostics.dependabotProbe && (
                      <div className="space-y-1 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm text-foreground-subtle">{t("settingsDependabotStatus")}</span>
                          <span className="truncate text-sm font-semibold text-foreground">{dependabotProbeLabel(session.diagnostics.dependabotProbe.status, t)}</span>
                        </div>
                        {session.diagnostics.dependabotProbe.message && (
                          <p className="text-sm leading-relaxed text-foreground-subtle">{session.diagnostics.dependabotProbe.message}</p>
                        )}
                      </div>
                    )}
                  </SurfaceCard>
                </div>
              )}
            </div>
          </section>

        {/* Account quotas: every family the API exposes, plus the alert
            thresholds. Last chapter: it describes the account, not the app. */}
        <QuotasSection
          snapshot={quotaSnapshot}
          isLoading={quotasLoading}
          isError={quotasError}
          hasSession={Boolean(localSecureMode && session?.token)}
          onRetry={() => {
            void refetchQuotas();
          }}
          token={localSecureMode ? session?.token : undefined}
          actionsDenied={session?.diagnostics?.permissions?.some(
            (permission) => permission.id === "actions" && permission.status === "denied",
          ) ?? false}
          onCachesCleared={() => {
            void refetchQuotas();
          }}
        />

        {/* Footer: the app version, and the room the summary rail needs to
            reach the last chapter when every chevron is closed. */}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pb-20 pt-6">
          <p className="text-sm text-foreground-subtle">
            push_ <span className="tabular-nums text-foreground-subtle">v{APP_VERSION}</span>
          </p>
          <a
            href={SITE_REPOSITORY_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => {
              // Always leave the app: the browser opens a new tab, the desktop
              // shell hands the URL to the OS. Without preventDefault a click
              // inside the webview could navigate the app itself to GitHub.
              event.preventDefault();
              void openExternal(SITE_REPOSITORY_URL);
            }}
            className="inline-flex min-h-6 items-center gap-1.5 text-sm font-medium text-foreground-subtle transition-colors hover:text-primary"
          >
            <ExternalLink size={12} />
            {t("githubRepository")}
          </a>
        </footer>

          </div>
        </div>
      </div>
    </div>
  );
}

type Translate = (key: DictKey, values?: Record<string, string | number>) => string;

type RepoRowProps = {
  repo: RepositoryRef;
  isSelected: boolean;
  isFeatured: boolean;
  onToggle: () => void;
  t: Translate;
};

/**
 * One selectable repository, with its origin always visible (C3). The badges
 * answer "why is this row here" without expanding the group: private, fork
 * (naming the upstream when it is accessible, saying so when it is not) and
 * archived.
 */
function RepoRow({ repo, isSelected, isFeatured, onToggle, t }: RepoRowProps) {
  const upstreamLabel = repo.isFork
    ? (repo.forkOf ? t("forkOfLabel", { repo: repo.forkOf.fullName }) : `${t("forkBadge")} · ${t("upstreamNotVisible")}`)
    : null;

  return (
    <button onClick={onToggle}
      aria-pressed={isSelected}
      className={cn(
        "flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-surface-2/60 rounded-md",
        isSelected && !isFeatured && "bg-surface-2/40",
        isFeatured && "bg-primary/4"
      )}
    >
      <div className={cn(
        "h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
        isSelected ? "border-primary bg-primary" : "border-border"
      )}>
        {isSelected && <div className="h-2 w-2 rounded-sm bg-primary-foreground" />}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-body font-medium text-foreground truncate block">{repo.fullName}</span>
        <span className="flex items-center gap-2 flex-wrap">
          {repo.isPrivate && (
            <span className="text-micro font-medium text-warning inline-flex items-center gap-1">
              <Lock size={10} />{t("privateBadge")}
            </span>
          )}
          {upstreamLabel && (
            <span className="text-micro font-medium text-foreground-subtle inline-flex items-center gap-1">
              <GitFork size={10} />{upstreamLabel}
            </span>
          )}
          {repo.archived && (
            <span className="text-micro font-medium text-foreground-subtle inline-flex items-center gap-1">
              <Archive size={10} />{t("archivedBadge")}
            </span>
          )}
          {repo.description && <span className="text-sm text-foreground-subtle truncate">{repo.description}</span>}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {repo.language && <span className="text-micro text-foreground-subtle">{repo.language}</span>}
        {isFeatured && <Star size={12} className="text-primary fill-primary" />}
      </div>
    </button>
  );
}

function StatusLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-sm text-foreground-subtle">{label}</span>
      <span className="truncate text-sm font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  );
}

/** One bordered surface holding a group of setting rows. */
function SurfaceCard({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-border/40 rounded-xl border border-border/60 bg-surface-1/50">{children}</div>;
}

/**
 * Theme picker as a dropdown whose color dot lives beside the theme name —
 * in the closed trigger and in every option. A native `<select>` cannot show
 * a color per option, so this keeps the listbox contract by hand: outside
 * click and Escape close it, options are buttons with `role="option"`.
 */
function ThemeDropdown({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: readonly { value: string; label: string; swatch: string }[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((current) => !current)}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-border/60 bg-surface-2 px-2.5 text-sm text-foreground outline-hidden transition-colors hover:border-foreground-subtle/30 focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-52"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true" className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-border" style={{ background: selected?.swatch }} />
          <span className="truncate">{selected?.label}</span>
        </span>
        <ChevronDown size={14} className={cn("shrink-0 text-foreground-subtle transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div
          role="listbox"
          aria-label={label}
          className="absolute right-0 top-full z-20 mt-1 w-full rounded-lg border border-border/60 bg-surface-1 py-1 shadow-lg sm:w-52"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-2.5 py-2 text-left text-sm transition-colors",
                  isSelected ? "bg-surface-2 text-foreground" : "text-foreground-subtle hover:bg-surface-2/60 hover:text-foreground",
                )}
              >
                <span aria-hidden="true" className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-border" style={{ background: option.swatch }} />
                <span className="truncate">{option.label}</span>
                {isSelected && <Check size={13} className="ml-auto shrink-0 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function dependabotProbeLabel(status: string | undefined, t: ReturnType<typeof useApp>["t"]) {
  if (status === "available") return t("dependabotAvailable");
  if (status === "forbidden") return t("dependabotForbidden");
  if (status === "not_found") return t("dependabotNotFound");
  if (status === "skipped") return t("dependabotSkipped");
  return t("dependabotUnavailableRuntime");
}

