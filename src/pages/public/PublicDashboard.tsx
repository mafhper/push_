import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CircleOff, Github, Search, ShieldAlert, Star, Workflow } from "lucide-react";
import { EmptyPanel, MetricTile, SectionHeading, StatusPill } from "@/components/site/TerminalPrimitives";
import { usePublicRuntime } from "@/contexts/usePublicRuntime";
import { usePublicDashboardSnapshot, usePublicProfileRepos } from "@/hooks/useGitHubPublic";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/utils/health";

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
      return <EmptyPanel title="Loading public profile" body="Resolving public repositories from the GitHub API." />;
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

          <div
            className={cn(
              "grid gap-5",
              repos.length <= 1 ? "xl:grid-cols-1" : repos.length === 2 ? "xl:grid-cols-2" : "xl:grid-cols-3",
            )}
          >
            {repos.map((repo) => (
              <Link key={repo.id} to={`/app/repo/${repo.owner}/${repo.name}`} className="rounded-3xl surface-panel p-6 transition-colors hover:bg-[rgba(36,36,36,1)]">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <StatusPill tone={repo.archived ? "warning" : "success"}>
                        {repo.archived ? "Archived" : "Public"}
                      </StatusPill>
                    </div>
                    <h4 className="font-headline text-2xl font-bold tracking-tight">{repo.name}</h4>
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/60">
                      {repo.defaultBranch} / {repo.language ?? "unknown"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="terminal-label">Stars</p>
                    <p className="mt-2 text-2xl font-black text-primary">{repo.stars}</p>
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-black/18 p-3">
                    <p className="terminal-label">Forks</p>
                    <p className="mt-3 text-sm font-semibold">{repo.forks}</p>
                  </div>
                  <div className="rounded-2xl bg-black/18 p-3">
                    <p className="terminal-label">Open issues</p>
                    <p className="mt-3 text-sm font-semibold">{repo.openIssues}</p>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Updated {formatRelativeTime(repo.updatedAt || repo.lastPushAt, (value) => value)}</span>
                  <span className="inline-flex items-center gap-2 text-primary">
                    Open detail
                    <ArrowRight size={13} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <SectionHeading title="Repository Table" body="Public metadata only." />

          <div className="overflow-hidden rounded-3xl surface-panel-deep">
            <table className="w-full text-left">
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
                {repos.map((repo) => (
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

          {repos.length === 0 ? (
            <div className="rounded-3xl surface-panel p-10 text-center">
              <CircleOff className="mx-auto text-foreground/25" size={28} />
              <p className="mt-4 text-sm text-muted-foreground">
                No public repositories were found for @{username}.
              </p>
            </div>
          ) : null}
        </section>
      </div>
    );
  }

  const { data, isLoading, error } = snapshotQuery;

  if (isLoading) {
    return <EmptyPanel title="Loading dashboard" body="Resolving the published snapshot dataset." />;
  }

  if (!data || error) {
    return <EmptyPanel title="Snapshot unavailable" body="The published dataset could not be loaded." />;
  }

  const repos = data.repos;
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

        <div
          className={cn(
            "grid gap-5",
            repos.length <= 1 ? "xl:grid-cols-1" : repos.length === 2 ? "xl:grid-cols-2" : "xl:grid-cols-3",
          )}
        >
          {repos.map((entry) => {
            const tone = entry.health.status === "critical" ? "critical" : entry.health.status === "warning" ? "warning" : "success";
            return (
              <Link key={entry.repo.id} to={`/app/repo/${entry.repo.owner}/${entry.repo.name}`} className="rounded-3xl surface-panel p-6 transition-colors hover:bg-[rgba(36,36,36,1)]">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <StatusPill tone={tone === "critical" ? "critical" : tone === "warning" ? "warning" : "success"}>
                        {entry.health.status}
                      </StatusPill>
                    </div>
                    <h4 className="font-headline text-2xl font-bold tracking-tight">{entry.repo.name}</h4>
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/60">
                      {entry.repo.defaultBranch} / {entry.repo.language ?? "unknown"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="terminal-label">Health</p>
                    <p className="mt-2 text-2xl font-black text-primary">{entry.health.score}%</p>
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-black/18 p-3">
                    <p className="terminal-label">Workflows</p>
                    <p className="mt-3 text-sm font-semibold">{entry.stats.latestWorkflowConclusion ?? "Unavailable"}</p>
                  </div>
                  <div className="rounded-2xl bg-black/18 p-3">
                    <p className="terminal-label">Alerts</p>
                    <p className="mt-3 text-sm font-semibold">{entry.health.dependabotOpenCount} open</p>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Updated {formatRelativeTime(entry.repo.lastPushAt, (value) => value)}</span>
                  <span className="inline-flex items-center gap-2 text-primary">
                    Open detail
                    <ArrowRight size={13} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeading title="Repository Table" body="Real metrics only." />

        <div className="overflow-hidden rounded-3xl surface-panel-deep">
          <table className="w-full text-left">
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
              {repos.map((entry) => (
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

        {repos.length === 0 ? (
          <div className="rounded-3xl surface-panel p-10 text-center">
            <CircleOff className="mx-auto text-foreground/25" size={28} />
            <p className="mt-4 text-sm text-muted-foreground">
              The published snapshot currently has no tracked repositories.
            </p>
          </div>
        ) : null}
      </section>
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
