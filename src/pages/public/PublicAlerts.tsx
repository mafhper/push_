import { usePublicRuntime } from "@/contexts/usePublicRuntime";
import { usePublicDashboardSnapshot, usePublicProfileRepos, usePublicRepoSnapshot } from "@/hooks/useGitHubPublic";
import { EmptyPanel, SectionHeading, StatusPill } from "@/components/site/TerminalPrimitives";

export default function PublicAlertsPage() {
  const { mode, username } = usePublicRuntime();
  const snapshotQuery = usePublicDashboardSnapshot();
  const publicProfileQuery = usePublicProfileRepos();

  if (mode === "public-profile") {
    const { data: repos = [], isLoading, error } = publicProfileQuery;

    if (isLoading) {
      return <EmptyPanel title="Loading public repositories" body="Resolving repositories from the GitHub public API." />;
    }

    if (error) {
      return <EmptyPanel title="Public profile unavailable" body={`The public GitHub API could not resolve @${username}.`} />;
    }

    return (
      <div className="space-y-8">
        <SectionHeading
          kicker="Security Surface"
          title="Authenticated data required"
          body={`Dependabot alerts are not available from the public GitHub API for @${username}. Use the published snapshot or localhost with a token for security data.`}
        />

        <div className="space-y-5">
          {repos.map((repo) => (
            <div key={repo.id} className="rounded-3xl surface-panel p-6">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="font-headline text-2xl font-bold tracking-tight">{repo.fullName}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Public mode can load repository metadata, commits, languages and workflow history. Security alerts stay unavailable without authentication.
                  </p>
                </div>
                <StatusPill tone="neutral">Unavailable</StatusPill>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const { data, isLoading, error } = snapshotQuery;

  if (isLoading) {
    return <EmptyPanel title="Loading alerts" body="Scanning the published snapshot for security findings." />;
  }

  if (!data || error) {
    return <EmptyPanel title="Alert dataset unavailable" body="The published snapshot failed to load." />;
  }

  if (data.repos.length === 0) {
    return <EmptyPanel title="No tracked repositories" body="The published snapshot currently has no repositories for the alerts view." />;
  }

  return (
    <div className="space-y-8">
      <SectionHeading
        kicker="Security Surface"
        title="Published alerts"
        body="Dependabot and warning state across the current published snapshot."
      />

      <div className="space-y-5">
        {data.repos.map((entry) => (
          <AlertCard key={entry.repo.id} owner={entry.repo.owner} repo={entry.repo.name} />
        ))}
      </div>
    </div>
  );
}

function AlertCard({ owner, repo }: { owner: string; repo: string }) {
  const { data } = usePublicRepoSnapshot(owner, repo);

  if (!data) return null;

  return (
    <div className="rounded-3xl surface-panel p-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="font-headline text-2xl font-bold tracking-tight">{owner}/{repo}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {data.alerts.length > 0
              ? `${data.alerts.length} open alerts in the current snapshot.`
              : "No open alerts in the current snapshot."}
          </p>
        </div>
        <StatusPill tone={data.alerts.length > 0 ? "warning" : "success"}>{data.alerts.length > 0 ? "Review" : "Clean"}</StatusPill>
      </div>

      <div className="mt-6 space-y-3">
        {data.alerts.length > 0 ? data.alerts.map((alert) => (
          <a key={alert.id} href={alert.htmlUrl} className="flex items-start justify-between gap-4 rounded-2xl bg-black/18 p-4">
            <div>
              <p className="font-semibold">{alert.summary}</p>
              <p className="mt-2 text-sm text-muted-foreground">{alert.packageName} | {alert.ecosystem}</p>
            </div>
            <StatusPill tone={alert.severity === "critical" ? "critical" : "warning"}>{alert.severity}</StatusPill>
          </a>
        )) : (
          <div className="rounded-2xl bg-black/18 p-4 text-sm text-muted-foreground">{data.availability.dependabotAlerts.reason ?? "No active issues."}</div>
        )}
      </div>
    </div>
  );
}
