import { useDashboardSnapshot, useRepoSnapshot } from "@/hooks/useGitHub";
import { EmptyPanel, SectionHeading, StatusPill } from "@/components/site/TerminalPrimitives";
import { isLocalSecureRuntime } from "@/config/site";
import { useApp } from "@/contexts/useApp";

export default function AlertsPage() {
  const { session } = useApp();
  const { data, isLoading, error } = useDashboardSnapshot();
  const localRuntime = isLocalSecureRuntime();
  const isLocalAuthenticated = localRuntime && Boolean(session?.token);

  if (isLoading) {
    return <EmptyPanel title="Loading alerts" body="Scanning repository snapshots for security findings and degraded states." />;
  }

  if (!data || error) {
    return <EmptyPanel title="Alert dataset unavailable" body="The overview snapshot failed to load." />;
  }

  if (data.repos.length === 0) {
    return (
      <EmptyPanel
        title="No repositories selected"
        body={
          isLocalAuthenticated
            ? "Conecte o token e escolha os repositorios que devem entrar no dashboard antes de abrir a visao consolidada de alertas."
            : "The published snapshot currently has no tracked repositories for the alerts surface."
        }
      />
    );
  }

  return (
    <div className="space-y-8">
      <SectionHeading
        kicker="Security Surface"
        title="Dependabot and operational warnings"
        body={
          isLocalAuthenticated
            ? "This view aggregates the alert posture across the repositories selected in your local authenticated session."
            : "This view aggregates the alert posture across every repository currently tracked by the published snapshot."
        }
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
  const { data } = useRepoSnapshot(owner, repo);

  if (!data) return null;

  return (
    <div className="rounded-3xl surface-panel p-6">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="font-headline text-2xl font-bold tracking-tight">{owner}/{repo}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {data.alerts.length > 0
              ? `${data.alerts.length} open alerts in the current ${data.status.dataMode === "authenticated" ? "authenticated session" : "snapshot"}.`
              : "No open alerts detected for this repository."}
          </p>
        </div>
        <StatusPill tone={data.alerts.length > 0 ? "warning" : "success"}>{data.alerts.length > 0 ? "Review" : "Clean"}</StatusPill>
      </div>

      <div className="mt-6 space-y-3">
        {data.alerts.length > 0 ? data.alerts.map((alert) => (
          <a key={alert.id} href={alert.htmlUrl} className="flex items-start justify-between gap-4 rounded-2xl bg-black/18 p-4">
            <div>
              <p className="font-semibold">{alert.summary}</p>
              <p className="mt-2 text-sm text-muted-foreground">{alert.packageName} · {alert.ecosystem}</p>
            </div>
            <StatusPill tone={alert.severity === "critical" ? "critical" : "warning"}>{alert.severity}</StatusPill>
          </a>
        )) : (
          <div className="rounded-2xl bg-black/18 p-4 text-sm text-muted-foreground">{data.availability.dependabotAlerts.reason ?? "Dependabot endpoint returned no active issues."}</div>
        )}
      </div>
    </div>
  );
}
