import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useRepoSnapshot } from "@/hooks/useGitHub";
import { LanguageBar } from "@/components/LanguageBar";
import { formatRelativeTime } from "@/utils/health";
import { useApp } from "@/contexts/AppContext";
import { ArrowLeft, ExternalLink, ShieldAlert, Star, Users, Workflow } from "lucide-react";

export default function RepoDetail() {
  const { owner = "", repo = "" } = useParams();
  const { data, isLoading } = useRepoSnapshot(owner, repo);
  const { t } = useApp();

  const workflowBars = useMemo(() => data?.workflowRuns.slice(0, 12).reverse() || [], [data]);

  if (isLoading) {
    return <div className="rounded-[2rem] bg-surface-container p-8 text-sm text-muted-foreground">Loading repository snapshot</div>;
  }

  if (!data) {
    return (
      <div className="rounded-[2rem] bg-surface-container p-8">
        <h1 className="text-3xl font-headline font-bold">Repository not found</h1>
        <p className="mt-3 text-muted-foreground">This route does not exist in the current snapshot manifest.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] space-y-8">
      <Link to="/app" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary">
        <ArrowLeft size={14} />
        Back to overview
      </Link>

      <section className="rounded-[2rem] bg-surface-container p-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-secondary">{data.featured ? "Featured node" : "Repository node"}</p>
            <h1 className="mt-3 text-fluid-4xl font-headline font-bold">{data.repo.name}</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
              {data.repo.description || "Repository snapshot with workflow, language and alert detail."}
            </p>
            <div className="mt-5 flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="rounded-full bg-surface-container-high px-3 py-1">{data.repo.owner}</span>
              <span className="rounded-full bg-surface-container-high px-3 py-1">{data.repo.language || "polyglot"}</span>
              <span className="rounded-full bg-surface-container-high px-3 py-1">{formatRelativeTime(data.repo.lastPushAt, t)}</span>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard label="Health" value={data.health.score} tone="primary" />
            <MetricCard label="Stars" value={data.repo.stars} tone="default" />
            <MetricCard label="Forks" value={data.repo.forks} tone="default" />
          </div>
        </div>
        <a
          href={data.repo.htmlUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-primary"
        >
          View on GitHub
          <ExternalLink size={14} />
        </a>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.45fr,1fr]">
        <div className="space-y-6">
          <div className="rounded-[2rem] bg-surface-container p-7">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.26em] text-muted-foreground">CI timeline</p>
                <h2 className="mt-2 text-2xl font-headline font-bold">Workflow history</h2>
              </div>
              <span className="text-sm font-semibold text-primary">{data.health.workflowSuccessRate ?? "--"}% success</span>
            </div>
            <div className="mt-8 flex h-52 items-end gap-2">
              {workflowBars.map((run) => {
                const failure = run.conclusion === "failure";
                const warning = !run.conclusion || run.conclusion === "cancelled";
                return (
                  <div key={run.id} className="flex flex-1 flex-col items-center gap-3">
                    <div
                      className={`w-full rounded-t-2xl ${
                        failure ? "bg-critical/60" : warning ? "bg-secondary/40" : "bg-success/50"
                      }`}
                      style={{ height: `${Math.max(28, Math.min(100, run.durationMs / 2500))}%` }}
                      title={`${run.workflowName}: ${run.conclusion ?? run.status}`}
                    />
                    <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{run.conclusion ?? run.status}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-8 space-y-3">
              {data.workflowRuns.slice(0, 6).map((run) => (
                <div key={run.id} className="flex items-center justify-between rounded-2xl bg-surface-container-low px-4 py-3">
                  <div>
                    <p className="font-semibold">{run.workflowName}</p>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{run.branch || "default"} / {run.event}</p>
                  </div>
                  <span className={run.conclusion === "success" ? "text-success" : run.conclusion === "failure" ? "text-critical" : "text-secondary"}>
                    {run.conclusion ?? run.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] bg-surface-container p-7">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.26em] text-muted-foreground">
              <Workflow size={14} />
              Recent commits
            </div>
            <div className="mt-6 space-y-4">
              {data.commits.map((commit) => (
                <a key={commit.sha} href={commit.htmlUrl} target="_blank" rel="noreferrer" className="block rounded-2xl bg-surface-container-low px-4 py-4">
                  <p className="font-semibold">{commit.message}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {commit.authorLogin} / {formatRelativeTime(commit.date, t)} / {commit.sha.slice(0, 7)}
                  </p>
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] bg-surface-container-low p-7">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.26em] text-muted-foreground">
              <Star size={14} />
              Repository stats
            </div>
            <div className="mt-6 space-y-4">
              <InfoRow label="Default branch" value={data.repo.defaultBranch} />
              <InfoRow label="Open issues" value={String(data.repo.openIssues)} />
              <InfoRow label="Watchers" value={String(data.repo.watchers)} />
              <InfoRow label="Created" value={new Date(data.repo.createdAt).toLocaleDateString()} />
              <InfoRow label="Updated" value={new Date(data.repo.updatedAt).toLocaleDateString()} />
            </div>
            <div className="mt-7">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Language breakdown</p>
              <div className="mt-4">
                <LanguageBar languages={data.languages} showLabels />
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] bg-surface-container-low p-7">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.26em] text-muted-foreground">
              <Users size={14} />
              Contributors
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              {data.contributors.map((contributor) => (
                <div key={contributor.login} className="rounded-2xl bg-surface-container px-4 py-3 text-sm">
                  <p className="font-semibold">{contributor.login}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">{contributor.contributions} contributions</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] bg-surface-container-low p-7">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.26em] text-muted-foreground">
              <ShieldAlert size={14} />
              Alerts and availability
            </div>
            <div className="mt-5 space-y-3">
              {data.alerts.length > 0 ? data.alerts.map((alert) => (
                <a key={alert.id} href={alert.htmlUrl} target="_blank" rel="noreferrer" className="block rounded-2xl bg-surface-container px-4 py-4">
                  <p className="font-semibold">{alert.summary}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {alert.packageName} / {alert.severity} / {alert.cveId || "no CVE"}
                  </p>
                </a>
              )) : (
                <div className="rounded-2xl bg-surface-container px-4 py-4 text-sm text-muted-foreground">
                  {data.availability.dependabotAlerts.available ? "No open dependabot alerts in this snapshot." : data.availability.dependabotAlerts.reason}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: string | number; tone: "primary" | "default" }) {
  return (
    <div className="rounded-[1.4rem] bg-surface-container-low px-5 py-4">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <p className={`mt-3 text-3xl font-headline font-bold ${tone === "primary" ? "text-primary" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-outline-variant/10 pb-3 text-sm">
      <span className="uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
