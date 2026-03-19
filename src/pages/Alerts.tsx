import { useDashboardSnapshot, useRepoSnapshot } from "@/hooks/useGitHub";
import { ShieldAlert } from "lucide-react";

export default function AlertsPage() {
  const { data, isLoading } = useDashboardSnapshot();

  if (isLoading) {
    return <div className="rounded-[2rem] bg-surface-container p-8 text-sm text-muted-foreground">Loading alert surface</div>;
  }

  if (!data) {
    return <div className="rounded-[2rem] bg-surface-container p-8 text-sm text-muted-foreground">No snapshot data available.</div>;
  }

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-secondary">Security surface</p>
        <h1 className="mt-3 text-fluid-4xl font-headline font-bold">Alert matrix</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
          Dependabot detail appears only when the snapshot was generated with authenticated access. Otherwise the UI marks the dataset as unavailable instead of prompting for a browser token.
        </p>
      </div>
      <div className="space-y-4">
        {data.repos.map((item) => (
          <AlertGroup key={item.repo.fullName} owner={item.repo.owner} repo={item.repo.name} />
        ))}
      </div>
    </div>
  );
}

function AlertGroup({ owner, repo }: { owner: string; repo: string }) {
  const { data, isLoading } = useRepoSnapshot(owner, repo);

  if (isLoading) {
    return <div className="rounded-[1.75rem] bg-surface-container p-6 text-sm text-muted-foreground">Loading {owner}/{repo}</div>;
  }

  if (!data) return null;

  return (
    <section className="rounded-[1.75rem] bg-surface-container p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-headline font-bold">{data.repo.fullName}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.availability.dependabotAlerts.available ? `${data.alerts.length} open alerts in snapshot.` : data.availability.dependabotAlerts.reason}
          </p>
        </div>
        <span className={`rounded-full px-4 py-2 text-sm font-bold ${data.alerts.length > 0 ? "bg-secondary/15 text-secondary" : "bg-success/15 text-success"}`}>
          {data.alerts.length > 0 ? `${data.alerts.length} alerts` : "No alerts"}
        </span>
      </div>

      <div className="mt-5 grid gap-4">
        {data.alerts.length > 0 ? data.alerts.map((alert) => (
          <a key={alert.id} href={alert.htmlUrl} target="_blank" rel="noreferrer" className="rounded-2xl bg-surface-container-low px-4 py-4">
            <div className="flex items-start gap-3">
              <ShieldAlert size={16} className={alert.severity === "critical" ? "text-critical" : "text-secondary"} />
              <div>
                <p className="font-semibold">{alert.summary}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {alert.packageName} / {alert.severity} / {alert.cveId || "no CVE"}
                </p>
              </div>
            </div>
          </a>
        )) : (
          <div className="rounded-2xl bg-surface-container-low px-4 py-4 text-sm text-muted-foreground">
            {data.availability.dependabotAlerts.available
              ? "This repository has no open dependabot alerts in the current dataset."
              : "Authenticated security data is unavailable for this snapshot."}
          </div>
        )}
      </div>
    </section>
  );
}
