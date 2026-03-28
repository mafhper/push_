import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CircleOff, Github, Search } from "lucide-react";
import { RepositoryShowcase, RepositoryShowcaseSkeleton, type ShowcaseItem } from "@/components/dashboard/RepositoryShowcase";
import { EmptyPanel, MetricTile, SectionHeading, StatusPill } from "@/components/site/TerminalPrimitives";
import { usePublicRuntime } from "@/contexts/usePublicRuntime";
import { usePublicDashboardSnapshot, usePublicProfileRepos } from "@/hooks/useGitHubPublic";
import { sortPublicRepos, sortSnapshotRepos } from "@/lib/dashboard";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/utils/health";
import type { OverviewRepoSnapshot, RepositoryRef } from "@/types";

function normalizeUsername(value: string) {
  return value.trim().replace(/^@+/, "").toLowerCase();
}

export default function PublicDashboard() {
  const { mode, username, setUsername, clearUsername } = usePublicRuntime();
  const [usernameInput, setUsernameInput] = useState(username ?? "");
  const [renderTimestamp] = useState(() => Date.now());
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
          <EmptyPanel title="Public profile unavailable" body={`The public GitHub API could not resolve @${username}.`} />
        </div>
      );
    }

    const totalStars = repos.reduce((sum, repo) => sum + repo.stars, 0);
    const totalOpenIssues = repos.reduce((sum, repo) => sum + repo.openIssues, 0);
    const prioritizedRepos = sortPublicRepos(repos);
    const updatedThisMonth = repos.filter((repo) => {
      if (!repo.updatedAt) return false;
      return renderTimestamp - new Date(repo.updatedAt).getTime() < 30 * 86400000;
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
              kicker="Public GitHub Mode"
              title={
                <>
                  <span className="text-primary">@{username}</span>
                  <span className="text-foreground"> repositories</span>
                </>
              }
              body="Public metadata only. Use localhost with a token for richer repository diagnostics."
            />
            <StatusPill tone="neutral">Public API</StatusPill>
          </div>

          <div className="grid gap-4 xl:grid-cols-4">
            <MetricTile label="Public Repos" value={repos.length} hint="Visible on GitHub" />
            <MetricTile label="Total Stars" value={totalStars} hint="Across public repos" tone={totalStars > 0 ? "success" : "neutral"} />
            <MetricTile label="Open Issues" value={totalOpenIssues} hint="Current public backlog" tone={totalOpenIssues > 0 ? "warning" : "neutral"} />
            <MetricTile label="Updated 30d" value={updatedThisMonth} hint="Recent activity" />
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h3 className="font-headline text-fluid-2xl font-bold uppercase">Public repositories</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Directly loaded from the GitHub public API for @{username}.
              </p>
            </div>
            <Link to="/app/settings" className="font-mono text-[11px] uppercase tracking-[0.24em] text-primary">
              Source settings
            </Link>
          </div>

          <RepositoryShowcase
            items={buildPublicShowcaseItems(prioritizedRepos)}
            storageKey={`push_public_dashboard_active_${username}`}
            emptyState={
              <div className="rounded-3xl surface-panel p-10 text-center">
                <CircleOff className="mx-auto text-foreground/25" size={28} />
                <p className="mt-4 text-sm text-muted-foreground">
                  No public repositories were found for @{username}.
                </p>
              </div>
            }
          />
        </section>

        {repos.length > 0 ? (
          <section className="space-y-6">
            <SectionHeading title="Repository Table" body="Public metadata only." />

            <div className="grid gap-3 md:hidden">
              {prioritizedRepos.map((repo) => (
                <article key={repo.id} className="rounded-3xl surface-panel-deep p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-foreground">{repo.name}</p>
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/48">
                        {repo.defaultBranch} / {repo.owner}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-primary">{repo.stars} stars</p>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1.35rem] border border-white/6 bg-white/[0.02] px-4 py-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/38">Issues</p>
                      <p className="mt-2 text-sm text-foreground/72">{repo.openIssues}</p>
                    </div>
                    <div className="rounded-[1.35rem] border border-white/6 bg-white/[0.02] px-4 py-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/38">Updated</p>
                      <p className="mt-2 text-sm text-foreground/72">{formatRelativeTime(repo.updatedAt || repo.lastPushAt, (value) => value)}</p>
                    </div>
                  </div>

                  <Link
                    to={`/app/repo/${repo.owner}/${repo.name}`}
                    className="mt-5 inline-flex items-center gap-2 rounded-full border border-primary/18 bg-primary/[0.08] px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/[0.12]"
                  >
                    Inspect project
                    <ArrowRight size={14} />
                  </Link>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto rounded-3xl surface-panel-deep md:block">
              <table className="w-full min-w-[54rem] text-left">
                <thead className="bg-white/[0.02] font-mono text-[10px] uppercase tracking-[0.24em] text-foreground/55">
                  <tr>
                    <th className="px-6 py-4 font-medium">Repository</th>
                    <th className="px-6 py-4 font-medium">Stars</th>
                    <th className="px-6 py-4 font-medium">Issues</th>
                    <th className="px-6 py-4 font-medium">Updated</th>
                    <th className="px-6 py-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {prioritizedRepos.map((repo) => (
                    <tr key={repo.id} className="border-t border-white/[0.03]">
                      <td className="px-6 py-5">
                        <p className="font-semibold">{repo.name}</p>
                        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/55">
                          {repo.defaultBranch} / {repo.owner}
                        </p>
                      </td>
                      <td className="px-6 py-5 text-sm text-muted-foreground">{repo.stars}</td>
                      <td className="px-6 py-5 text-sm text-muted-foreground">{repo.openIssues}</td>
                      <td className="px-6 py-5 text-sm text-muted-foreground">{formatRelativeTime(repo.updatedAt || repo.lastPushAt, (value) => value)}</td>
                      <td className="px-6 py-5">
                        <Link to={`/app/repo/${repo.owner}/${repo.name}`} className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-foreground/45 hover:text-primary">
                          Inspect
                          <ArrowRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
    return <EmptyPanel title="Snapshot unavailable" body="The published dataset could not be loaded." />;
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
            kicker="Dashboard Overview"
            title="Published Snapshot"
            body="Public repository health from the current published snapshot."
          />
          <StatusPill tone="success">Snapshot</StatusPill>
        </div>

        <div className="grid gap-4 xl:grid-cols-4">
          <MetricTile label="Tracked Repos" value={repos.length} hint="Published set" />
          <MetricTile label="Average Health" value={`${averageScore}%`} hint="Across tracked repos" tone={averageScore >= 70 ? "success" : "warning"} />
          <MetricTile label="Open Alerts" value={totalAlerts} hint="Dependabot total" tone={totalAlerts > 0 ? "warning" : "success"} />
          <MetricTile label="Archived" value={archivedCount} hint={`${reposWithWorkflowData} repos with workflow data`} />
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h3 className="font-headline text-fluid-2xl font-bold uppercase">Tracked Repositories</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Public repositories included in the current snapshot.
            </p>
          </div>
          <Link to="/app/settings" className="font-mono text-[11px] uppercase tracking-[0.24em] text-primary">
            Snapshot status
          </Link>
        </div>

        <RepositoryShowcase
          items={buildSnapshotShowcaseItems(prioritizedRepos)}
          storageKey="push_public_snapshot_active_repo"
          emptyState={
            <div className="rounded-3xl surface-panel p-10 text-center">
              <CircleOff className="mx-auto text-foreground/25" size={28} />
              <p className="mt-4 text-sm text-muted-foreground">
                The published snapshot currently has no tracked repositories.
              </p>
            </div>
          }
        />
      </section>

      {repos.length > 0 ? (
        <section className="space-y-6">
          <SectionHeading title="Repository Table" body="Real metrics only." />

          <div className="grid gap-3 md:hidden">
            {prioritizedRepos.map((entry) => (
              <article key={entry.repo.id} className="rounded-3xl surface-panel-deep p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-foreground">{entry.repo.name}</p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/48">
                      {entry.repo.defaultBranch} / {entry.repo.owner}
                    </p>
                  </div>
                  <p className={cn("text-sm font-semibold", entry.health.status === "healthy" ? "text-primary" : entry.health.status === "warning" ? "text-secondary" : "text-destructive")}>
                    {entry.health.status.toUpperCase()} / {entry.health.score}%
                  </p>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[1.35rem] border border-white/6 bg-white/[0.02] px-4 py-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/38">Last workflow</p>
                    <p className="mt-2 text-sm text-foreground/72">{entry.stats.latestWorkflowConclusion ?? "Unavailable"}</p>
                  </div>
                  <div className="rounded-[1.35rem] border border-white/6 bg-white/[0.02] px-4 py-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/38">Alerts</p>
                    <p className="mt-2 text-sm text-foreground/72">{entry.health.dependabotOpenCount}</p>
                  </div>
                </div>

                <Link
                  to={`/app/repo/${entry.repo.owner}/${entry.repo.name}`}
                  className="mt-5 inline-flex items-center gap-2 rounded-full border border-primary/18 bg-primary/[0.08] px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/[0.12]"
                >
                  Inspect project
                  <ArrowRight size={14} />
                </Link>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-3xl surface-panel-deep md:block">
            <table className="w-full min-w-[54rem] text-left">
              <thead className="bg-white/[0.02] font-mono text-[10px] uppercase tracking-[0.24em] text-foreground/55">
                <tr>
                  <th className="px-6 py-4 font-medium">Repository</th>
                  <th className="px-6 py-4 font-medium">Health</th>
                  <th className="px-6 py-4 font-medium">Last Workflow</th>
                  <th className="px-6 py-4 font-medium">Alerts</th>
                  <th className="px-6 py-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {prioritizedRepos.map((entry) => (
                  <tr key={entry.repo.id} className="border-t border-white/[0.03]">
                    <td className="px-6 py-5">
                      <p className="font-semibold">{entry.repo.name}</p>
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/55">
                        {entry.repo.defaultBranch} / {entry.repo.owner}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <p className={entry.health.status === "healthy" ? "text-primary" : entry.health.status === "warning" ? "text-secondary" : "text-destructive"}>
                        {entry.health.status.toUpperCase()} / {entry.health.score}%
                      </p>
                    </td>
                    <td className="px-6 py-5 text-sm text-muted-foreground">{entry.stats.latestWorkflowConclusion ?? "Unavailable"}</td>
                    <td className="px-6 py-5 text-sm text-muted-foreground">{entry.health.dependabotOpenCount}</td>
                    <td className="px-6 py-5">
                      <Link to={`/app/repo/${entry.repo.owner}/${entry.repo.name}`} className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-foreground/45 hover:text-primary">
                        Inspect
                        <ArrowRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function buildSnapshotShowcaseItems(entries: OverviewRepoSnapshot[]): ShowcaseItem[] {
  return entries.map((entry) => {
    const tone = entry.health.status === "critical" ? "critical" : entry.health.status === "warning" ? "warning" : "success";

    return {
      id: entry.repo.fullName,
      route: `/app/repo/${entry.repo.owner}/${entry.repo.name}`,
      owner: entry.repo.owner,
      name: entry.repo.name,
      fullName: entry.repo.fullName,
      description: entry.repo.description || "No repository description in the current snapshot.",
      defaultBranch: entry.repo.defaultBranch,
      language: entry.repo.language ?? "unknown",
      imageLanguage: entry.repo.language,
      lastActivityLabel: `Last movement ${formatRelativeTime(entry.repo.lastPushAt, (value) => value)}`,
      statusLabel: tone === "critical" ? "Critical" : tone === "warning" ? "At risk" : "Healthy",
      statusTone: tone,
      scoreLabel: "Health",
      scoreValue: `${entry.health.score}%`,
      summary: `Snapshot rank considers ${entry.health.dependabotOpenCount} open alerts, ${entry.health.stalenessDays} stale day(s), and the latest workflow outcome.`,
      spotlightMetrics: [
        { label: "Last updated", value: formatRelativeTime(entry.repo.lastPushAt, (value) => value), tone: entry.health.stalenessDays > 30 ? "warning" : "success" },
        { label: "Workflow success", value: entry.health.workflowSuccessRate !== null ? `${entry.health.workflowSuccessRate}%` : "N/A", tone: entry.health.workflowSuccessRate !== null && entry.health.workflowSuccessRate < 80 ? "warning" : "success" },
        { label: "Open alerts", value: `${entry.health.dependabotOpenCount}`, tone: entry.health.dependabotOpenCount > 0 ? "critical" : "success" },
        { label: "Branch", value: entry.repo.defaultBranch, tone: "neutral" },
      ],
    };
  });
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

function buildPublicShowcaseItems(repos: RepositoryRef[]): ShowcaseItem[] {
  return repos.map((repo) => {
    const tone = repo.archived ? "warning" : repo.openIssues > 0 ? "warning" : "success";
    const updatedAt = repo.updatedAt || repo.lastPushAt;

    return {
      id: repo.fullName,
      route: `/app/repo/${repo.owner}/${repo.name}`,
      owner: repo.owner,
      name: repo.name,
      fullName: repo.fullName,
      description: repo.description || "No public repository description.",
      defaultBranch: repo.defaultBranch,
      language: repo.language ?? "unknown",
      imageLanguage: repo.language,
      lastActivityLabel: `Last movement ${formatRelativeTime(updatedAt, (value) => value)}`,
      statusLabel: repo.archived ? "Archived" : repo.openIssues > 0 ? "Open backlog" : "Active",
      statusTone: tone,
      scoreLabel: "Stars",
      scoreValue: `${repo.stars}`,
      summary: `${repo.openIssues} open issue(s), ${repo.forks} fork(s), and the latest public update keep this repository in rotation.`,
      spotlightMetrics: [
        { label: "Last updated", value: formatRelativeTime(updatedAt, (value) => value), tone: "success" },
        { label: "Open issues", value: `${repo.openIssues}`, tone: repo.openIssues > 0 ? "warning" : "success" },
        { label: "Forks", value: `${repo.forks}`, tone: "neutral" },
        { label: "Watchers", value: `${repo.watchers}`, tone: "neutral" },
      ],
    };
  });
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
  return (
    <section className="rounded-3xl surface-panel p-6">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-2xl space-y-3">
          <p className="section-kicker">Public profile demo</p>
          <h2 className="font-headline text-fluid-2xl font-black tracking-tight">Enter a GitHub username</h2>
          <p className="text-sm leading-7 text-muted-foreground">
            Use @{`username`} to load public repositories without a token. For richer diagnostics, run Push_ locally and connect your GitHub token.
          </p>
        </div>

        <form onSubmit={onSubmit} className="w-full max-w-xl">
          <div className="flex flex-col gap-3 md:flex-row">
            <label className="relative flex-1">
              <Github className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-foreground/35" size={15} />
              <input
                type="text"
                value={usernameInput}
                onChange={(event) => onUsernameInput(event.target.value)}
                placeholder="@mafhper"
                className="h-12 w-full rounded-2xl border border-white/6 bg-black/18 pl-11 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-foreground/30 focus:border-primary/35"
              />
            </label>
            <button type="submit" className="button-primary-terminal px-5 py-3 text-sm">
              <Search size={15} />
              Load public repos
            </button>
            {activeUsername ? (
              <button type="button" onClick={onClear} className="button-secondary-terminal px-5 py-3 text-sm">
                Clear
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </section>
  );
}
