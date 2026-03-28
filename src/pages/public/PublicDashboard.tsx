import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { CircleOff, Github, Search } from "lucide-react";
import { RepositoryDiagnosticsList, type DiagnosticsRow } from "@/components/dashboard/RepositoryDiagnosticsList";
import { RepositoryShowcase, RepositoryShowcaseSkeleton, type ShowcaseItem } from "@/components/dashboard/RepositoryShowcase";
import { EmptyPanel, SectionHeading, StatusPill } from "@/components/site/TerminalPrimitives";
import { useApp } from "@/contexts/useApp";
import { usePublicRuntime } from "@/contexts/usePublicRuntime";
import { usePublicDashboardSnapshot, usePublicProfileRepos } from "@/hooks/useGitHubPublic";
import { buildPublicDiagnosticsRows, buildPublicShowcaseItems, buildSnapshotDiagnosticsRows, buildSnapshotShowcaseItems } from "@/lib/dashboard-copy";
import { sortPublicRepos, sortSnapshotRepos } from "@/lib/dashboard";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/utils/health";
import type { OverviewRepoSnapshot, RepositoryRef } from "@/types";

function normalizeUsername(value: string) {
  return value.trim().replace(/^@+/, "").toLowerCase();
}

export default function PublicDashboard() {
  const { t } = useApp();
  const { mode, username, setUsername, clearUsername } = usePublicRuntime();
  const [usernameInput, setUsernameInput] = useState(username ?? "");
  const [referenceNow] = useState(() => Date.now());
  const snapshotQuery = usePublicDashboardSnapshot();
  const publicProfileQuery = usePublicProfileRepos();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeUsername(usernameInput);
    if (!normalized) return;
    setUsername(normalized);
  }

  if (mode === "public-profile") {
    const { data: repos = [], isLoading, error } = publicProfileQuery;

    if (isLoading) {
      return (
        <div className="space-y-10">
          <PublicProfileEntryCard
            usernameInput={usernameInput}
            onUsernameInput={setUsernameInput}
            onSubmit={handleSubmit}
            onClear={clearUsername}
            activeUsername={username}
          />
          <RepositoryShowcaseSkeleton />
        </div>
      );
    }

    if (error) {
      return (
        <div className="space-y-8">
          <PublicProfileEntryCard
            usernameInput={usernameInput}
            onUsernameInput={setUsernameInput}
            onSubmit={handleSubmit}
            onClear={clearUsername}
            activeUsername={username}
          />
          <EmptyPanel title={t("publicProfileUnavailable")} body={t("publicProfileUnavailableBody", { username: username ?? "" })} />
 
        </div>
      );
    }

    const totalStars = repos.reduce((sum, repo) => sum + repo.stars, 0);
    const totalOpenIssues = repos.reduce((sum, repo) => sum + repo.openIssues, 0);
    const prioritizedRepos = sortPublicRepos(repos);
    const updatedThisMonth = repos.filter((repo) => {
      if (!repo.updatedAt) return false;
      return referenceNow - new Date(repo.updatedAt).getTime() < 30 * 86400000;
    }).length;

    return (
      <div className="space-y-10">
        <PublicProfileEntryCard
          usernameInput={usernameInput}
          onUsernameInput={setUsernameInput}
          onSubmit={handleSubmit}
          onClear={clearUsername}
          activeUsername={username}
        />

        <section className="space-y-6">
          <div className="flex items-end justify-between gap-6">
            <SectionHeading
              kicker={t("publicGitHubMode")}
              title={
                <>
                  <span className="text-primary">@{username}</span>
                  <span className="text-foreground"> {t("repos").toLowerCase()}</span>
                </>
              }
              body={t("publicMetadataOnly")}
            />
            <StatusPill tone="neutral">{t("publicApiLabel")}</StatusPill>
          </div>

          <div className="grid gap-3 xl:grid-cols-4">
            <CompactMetric label={t("publicRepositoriesTitle")} value={repos.length} hint={t("viewOnGitHub")} />
            <CompactMetric label={t("totalStars")} value={totalStars} hint={t("acrossPublicRepos")} tone={totalStars > 0 ? "success" : "neutral"} />
            <CompactMetric label={t("issues")} value={totalOpenIssues} hint={t("currentPublicBacklog")} tone={totalOpenIssues > 0 ? "warning" : "neutral"} />
            <CompactMetric label={t("updated30d")} value={updatedThisMonth} hint={t("recentActivityHint")} />
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h3 className="font-headline text-fluid-2xl font-bold tracking-tight">{t("publicRepositoriesTitle")}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t("directLoadedForUser", { username })}</p>
            </div>
            <Link to="/app/settings" className="font-mono text-[11px] uppercase tracking-[0.24em] text-primary">{t("sourceSettings")}</Link>
          </div>

          <RepositoryShowcase
            items={buildPublicShowcaseItems(prioritizedRepos, t, (value) => formatRelativeTime(value, t))}
            storageKey={`push_public_dashboard_active_${username}`}
            emptyState={
              <div className="rounded-3xl surface-panel p-10 text-center">
                <CircleOff className="mx-auto text-foreground/25" size={28} />
                <p className="mt-4 text-sm text-muted-foreground">
                  {t("noPublicRepositoriesForUser", { username })}
                </p>
              </div>
            }
          />
        </section>

        {repos.length > 0 ? (
          <section className="space-y-6">
            <RepositoryDiagnosticsList
              items={buildPublicDiagnosticsRows(prioritizedRepos, t, (value) => formatRelativeTime(value, t))}
              title={t("repositoryQueueTitle")}
              body={t("repositoryQueueBody")}
            />
          </section>
        ) : null}
      </div>
    );
  }

  const { data, isLoading, error } = snapshotQuery;

  if (isLoading) {
    return (
      <div className="space-y-10">
        <PublicProfileEntryCard
          usernameInput={usernameInput}
          onUsernameInput={setUsernameInput}
          onSubmit={handleSubmit}
          onClear={clearUsername}
          activeUsername={null}
        />
        <PublicDashboardSkeleton />
      </div>
    );
  }

  if (!data || error) {
    return <EmptyPanel title={t("publishedSnapshot")} body={t("regenerateSnapshotOverview")} />;
  }

  const repos = data.repos;
  const prioritizedRepos = sortSnapshotRepos(repos);
  const totalAlerts = repos.reduce((sum, entry) => sum + entry.health.dependabotOpenCount, 0);
  const averageScore = repos.length > 0
    ? Math.round(repos.reduce((sum, entry) => sum + entry.health.score, 0) / repos.length)
    : 0;
  const archivedCount = repos.filter((entry) => entry.repo.archived).length;
  const reposWithWorkflowData = repos.filter((entry) => entry.availability.workflowRuns.available).length;

  return (
    <div className="space-y-10">
      <PublicProfileEntryCard
        usernameInput={usernameInput}
        onUsernameInput={setUsernameInput}
        onSubmit={handleSubmit}
        onClear={clearUsername}
        activeUsername={null}
      />

      <section className="space-y-6">
        <div className="flex items-end justify-between gap-6">
          <SectionHeading
            kicker={t("dashboardOverview")}
            title={t("publishedSnapshot")}
            body={t("trackedReposSnapshotBody")}
          />
          <StatusPill tone="success">{t("snapshotLabel")}</StatusPill>
        </div>

        <div className="grid gap-3 xl:grid-cols-4">
          <CompactMetric label={t("trackedRepos")} value={repos.length} hint={t("publishedSnapshot")} />
          <CompactMetric label={t("averageHealth")} value={`${averageScore}%`} hint={t("trackedRepositories")} tone={averageScore >= 70 ? "success" : "warning"} />
          <CompactMetric label={t("openAlertsLabel")} value={totalAlerts} hint={t("dependabotTotal")} tone={totalAlerts > 0 ? "warning" : "success"} />
          <CompactMetric label={t("archived")} value={archivedCount} hint={`${reposWithWorkflowData} ${t("reposWithWorkflowData")}`} />
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h3 className="font-headline text-fluid-2xl font-bold tracking-tight">{t("trackedRepositoriesPanelTitle")}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{t("trackedReposSnapshotBody")}</p>
          </div>
          <Link to="/app/settings" className="font-mono text-[11px] uppercase tracking-[0.24em] text-primary">{t("runtimeStatusTitle")}</Link>
        </div>

        <RepositoryShowcase
          items={buildSnapshotShowcaseItems(prioritizedRepos, t, (value) => formatRelativeTime(value, t))}
          storageKey="push_public_snapshot_active_repo"
          emptyState={
            <div className="rounded-3xl surface-panel p-10 text-center">
              <CircleOff className="mx-auto text-foreground/25" size={28} />
              <p className="mt-4 text-sm text-muted-foreground">
                {t("regenerateSnapshotOverview")}
              </p>
            </div>
          }
        />
      </section>

      {repos.length > 0 ? (
          <section className="space-y-6">
            <RepositoryDiagnosticsList
              items={buildSnapshotDiagnosticsRows(prioritizedRepos, t, (value) => formatRelativeTime(value, t))}
              title={t("fleetQueueTitle")}
              body={t("fleetQueueBody")}
            />
          </section>
      ) : null}
    </div>
  );
}

function PublicDashboardSkeleton() {
  return (
    <div className="space-y-10">
      <section className="space-y-6">
        <div className="flex items-end justify-between gap-6">
          <div className="space-y-4">
            <div className="h-3 w-32 rounded-full bg-white/8" />
            <div className="h-12 w-64 rounded-2xl bg-white/8" />
            <div className="h-5 w-[28rem] max-w-full rounded-full bg-white/8" />
          </div>
          <div className="h-7 w-24 rounded-full bg-primary/15" />
        </div>

        <div className="grid gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-3xl surface-panel p-5">
              <div className="h-3 w-24 rounded-full bg-white/8" />
              <div className="mt-4 h-10 w-24 rounded-2xl bg-white/8" />
              <div className="mt-4 h-4 w-28 rounded-full bg-white/8" />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-3">
            <div className="h-8 w-72 rounded-2xl bg-white/8" />
            <div className="h-4 w-[28rem] max-w-full rounded-full bg-white/8" />
          </div>
          <div className="h-4 w-24 rounded-full bg-white/8" />
        </div>

        <RepositoryShowcaseSkeleton />
      </section>

      <section className="space-y-6">
        <div className="space-y-3">
          <div className="h-9 w-64 rounded-2xl bg-white/8" />
          <div className="h-4 w-[30rem] max-w-full rounded-full bg-white/8" />
        </div>

        <div className="overflow-hidden rounded-3xl surface-panel-deep p-6">
          <div className="h-12 rounded-2xl bg-white/[0.03]" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-16 rounded-2xl bg-white/[0.03]" />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function CompactMetric({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  hint: string;
  tone?: "neutral" | "success" | "warning";
}) {
  return (
    <div className={cn("rounded-[1.35rem] ops-surface-soft px-4 py-4", tone === "success" && "shadow-[inset_0_0_0_1px_rgba(0,255,65,0.12)]", tone === "warning" && "shadow-[inset_0_0_0_1px_rgba(175,141,17,0.16)]")}>
      <div className="flex items-center justify-between gap-3">
        <p className="terminal-label">{label}</p>
        <p className={cn("text-2xl font-black tracking-tight", tone === "success" && "text-primary", tone === "warning" && "text-secondary")}>{value}</p>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function PublicProfileEntryCard({
  usernameInput,
  onUsernameInput,
  onSubmit,
  onClear,
  activeUsername,
}: {
  usernameInput: string;
  onUsernameInput: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClear: () => void;
  activeUsername: string | null;
}) {
  const { t } = useApp();
  return (
    <section className="rounded-[2rem] ops-surface p-6 lg:p-7">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,34rem)]">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill tone={activeUsername ? "success" : "neutral"}>
              {activeUsername ? t("profileLoaded") : t("snapshotMode")}
            </StatusPill>
            <span className="rounded-full bg-white/[0.04] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/46">
              {t("publicGitHub")}
            </span>
          </div>

          <div className="space-y-3">
            <p className="section-kicker">{t("sourceControl")}</p>
            <h2 className="font-headline text-fluid-2xl font-black tracking-tight">
              {activeUsername ? `@${activeUsername}` : t("loadGitHubProfile")}
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              {activeUsername
                ? t("publishedSnapshotBody")
                : t("typeUsernameInspectBody")}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <EntrySurface
              label={t("mode")}
              value={activeUsername ? t("profileLoaded") : t("snapshotLabel")}
              tone={activeUsername ? "success" : "neutral"}
            />
            <EntrySurface label={t("source")} value={t("publicApiLabel")} />
            <EntrySurface label={t("memory")} value={activeUsername ? t("saved") : t("idle")} tone={activeUsername ? "success" : "neutral"} />
          </div>
        </div>

        <div className="rounded-[1.7rem] ops-surface-deep p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="terminal-label">{t("profileSwitch")}</p>
            {activeUsername ? (
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
                @{activeUsername}
              </span>
            ) : null}
          </div>

          <form onSubmit={onSubmit} className="mt-4 space-y-3">
            <label className="relative block">
              <Github className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-foreground/35" size={15} />
              <input
                type="text"
                value={usernameInput}
                onChange={(event) => onUsernameInput(event.target.value)}
                placeholder="@mafhper"
                className="h-12 w-full rounded-[1.2rem] border border-white/6 bg-black/20 pl-11 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-foreground/30 focus:border-primary/35"
              />
            </label>

            <div className="flex flex-col gap-3 md:flex-row">
              <button type="submit" className="button-primary-terminal flex-1 px-5 py-3 text-sm">
                <Search size={15} />
                {activeUsername ? t("switchProfile") : t("loadProfile")}
              </button>
              {activeUsername ? (
                <button type="button" onClick={onClear} className="button-secondary-terminal px-5 py-3 text-sm">
                  {t("clear")}
                </button>
              ) : null}
            </div>
          </form>

          <div className="mt-4 rounded-[1.2rem] bg-white/[0.03] px-4 py-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
            <p className="text-xs text-muted-foreground">
              {activeUsername
                ? t("profileLoadedPersistenceBody")
                : t("noProfileLoadedBody")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function EntrySurface({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "success";
}) {
  return (
    <div
      className={cn(
        "rounded-[1.25rem] ops-surface-soft px-4 py-3",
        tone === "success" && "shadow-[inset_0_0_0_1px_rgba(0,255,65,0.12)]",
      )}
    >
      <p className="terminal-label">{label}</p>
      <p className={cn("mt-2 text-lg font-semibold text-foreground", tone === "success" && "text-primary")}>{value}</p>
    </div>
  );
}
