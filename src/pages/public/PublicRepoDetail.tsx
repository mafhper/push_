import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, Github, History, Shield, Star } from "lucide-react";
import { EmptyPanel, SectionHeading, StatusPill } from "@/components/site/TerminalPrimitives";
import { usePublicRuntime } from "@/contexts/usePublicRuntime";
import { usePublicRepoSnapshot } from "@/hooks/useGitHubPublic";
import { LANGUAGE_COLORS, type WorkflowRun } from "@/types";

export default function PublicRepoDetail() {
  const { mode } = usePublicRuntime();
  const { owner = "", repo = "" } = useParams();
  const { data, isLoading, error } = usePublicRepoSnapshot(owner, repo);

  if (isLoading) {
    return (
      <EmptyPanel
        title="Loading repository detail"
        body={mode === "public-profile" ? "Resolving public repository data from the GitHub API." : "Resolving workflow history, languages, contributors and alerts from the snapshot."}
      />
    );
  }

  if (!data || error) {
    return (
      <EmptyPanel
        title="Repository detail unavailable"
        body={mode === "public-profile" ? "The public GitHub API could not resolve this repository." : "The repository detail file was not found in the current published dataset."}
      />
    );
  }

  const languageEntries = Object.entries(data.languages);
  const totalLanguageBytes = languageEntries.reduce((sum, [, value]) => sum + value, 0);
  const pipelineBars: WorkflowRun[] = data.workflowRuns.slice(0, 14);
  const sourceLabel = mode === "public-profile" ? "public api" : "snapshot";

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-6">
        <div className="space-y-4">
          <Link to="/app" className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-foreground/55 hover:text-primary">
            <ArrowLeft size={12} />
            Back
          </Link>
          <div>
            <div className="mb-4 flex items-center gap-3">
              <StatusPill tone="success">{sourceLabel}</StatusPill>
              <StatusPill tone={data.health.status === "healthy" ? "success" : data.health.status === "warning" ? "warning" : "critical"}>
                {data.health.status}
              </StatusPill>
            </div>
            <h1 className="text-fluid-4xl font-black tracking-tighter">{data.repo.name}</h1>
            <p className="mt-3 max-w-3xl text-lg leading-8 text-muted-foreground">
              {data.repo.description || "No repository description is available for this repository."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a href={data.repo.htmlUrl} className="button-primary-terminal px-5 py-3 text-sm">
            <Github size={15} />
            Open Repo
          </a>
          <div className="rounded-2xl surface-panel px-5 py-3">
            <p className="terminal-label">Stars</p>
            <p className="mt-2 inline-flex items-center gap-2 text-lg font-bold"><Star size={15} className="text-secondary" />{data.repo.stars}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <section className="rounded-3xl surface-panel p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <SectionHeading
              title="CI/CD Pipeline History"
              body={
                mode === "public-profile"
                  ? `${data.workflowRuns.length} public workflow executions available from GitHub.`
                  : `${data.workflowRuns.length} workflow executions available in the published snapshot.`
              }
            />
            <div className="flex gap-2">
              <StatusPill tone="success">Success</StatusPill>
              <StatusPill tone="critical">Failed</StatusPill>
              <StatusPill tone="warning">Other</StatusPill>
            </div>
          </div>

          <div className="rounded-3xl bg-black/18 p-5">
            {pipelineBars.length > 0 ? (
              <>
                <div className="flex min-h-[12rem] items-end gap-2">
                  {pipelineBars.map((run) => {
                    const conclusion = run.conclusion ?? null;
                    const height = Math.max(18, Math.min(120, Math.round(run.durationMs / 1000)));
                    const bg =
                      conclusion === "success"
                        ? "bg-primary"
                        : conclusion === "failure"
                          ? "bg-destructive/70"
                          : conclusion === "cancelled"
                            ? "bg-secondary"
                            : "bg-white/20";

                    return <div key={run.id} className={`w-full rounded-t-sm ${bg}`} style={{ height }} />;
                  })}
                </div>
                <div className="mt-4 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/35">
                  <span>{mode === "public-profile" ? "Public history" : "Snapshot history"}</span>
                  <span>{data.workflowRuns[0]?.id ? `Latest run #${data.workflowRuns[0].id}` : "No workflow data"}</span>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/8 px-4 py-10 text-sm text-muted-foreground">
                {mode === "public-profile"
                  ? "No public workflow executions are available for this repository."
                  : "No workflow executions are available for this repository in the current snapshot."}
              </div>
            )}
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-3xl surface-panel p-6">
            <h2 className="font-headline text-xl font-bold">Repository Stats</h2>
            <div className="mt-6 space-y-5">
              <DetailRow label="License" value={data.repo.license ?? "Unavailable"} highlighted={Boolean(data.repo.license)} />
              <DetailRow label="Main Branch" value={data.repo.defaultBranch} highlighted />
              <DetailRow label="Repository Size" value={`${(data.repo.size / 1024).toFixed(1)} MB`} />
            </div>

            <div className="mt-8">
              <p className="terminal-label">Language Breakdown</p>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/5">
                {languageEntries.map(([language, bytes]) => {
                  const width = totalLanguageBytes > 0 ? `${(bytes / totalLanguageBytes) * 100}%` : "0%";
                  return <div key={language} className="float-left h-full" style={{ width, backgroundColor: LANGUAGE_COLORS[language] ?? "#00FF41" }} />;
                })}
              </div>
              <div className="mt-5 space-y-3">
                {languageEntries.map(([language, bytes]) => (
                  <div key={language} className="flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-3">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: LANGUAGE_COLORS[language] ?? "#00FF41" }} />
                      {language}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">{totalLanguageBytes > 0 ? Math.round((bytes / totalLanguageBytes) * 100) : 0}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl surface-panel p-6">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="font-headline text-xl font-bold">Recent Pushes</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {mode === "public-profile" ? "Latest public commit activity from GitHub." : "Latest commit activity captured by the published snapshot."}
                </p>
              </div>
              <History size={16} className="text-foreground/30" />
            </div>

            <div className="space-y-5">
              {(data.commits.length ? data.commits.slice(0, 4) : []).map((commit) => (
                <a key={commit.sha} href={commit.htmlUrl} className="flex items-start gap-4">
                  <div className="mt-1 h-10 w-10 overflow-hidden rounded-full bg-white/6">
                    {commit.authorAvatar ? <img src={commit.authorAvatar} alt={commit.authorLogin} className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="min-w-0">
                    <p className="line-clamp-2 font-semibold">{commit.message}</p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/35">
                      {commit.authorLogin} | {commit.sha.slice(0, 7)}
                    </p>
                  </div>
                </a>
              ))}
              {data.commits.length === 0 ? <p className="text-sm text-muted-foreground">{mode === "public-profile" ? "No public commit data is available." : "No commit data available in the current snapshot."}</p> : null}
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <section className="rounded-3xl surface-panel p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="font-headline text-xl font-bold">Dependabot Alerts</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {data.alerts.length > 0 ? `${data.alerts.length} vulnerabilities identified in manifest files.` : data.availability.dependabotAlerts.reason ?? "No open alerts in the current dataset."}
              </p>
            </div>
            <a href={`${data.repo.htmlUrl}/security/dependabot`} className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary hover:underline">
              GitHub Advisor
            </a>
          </div>

          <div className="space-y-4">
            {data.alerts.length > 0 ? data.alerts.map((alert) => (
              <a key={alert.id} href={alert.htmlUrl} className="block rounded-2xl bg-black/18 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">{alert.summary}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Dependency: {alert.packageName} | {alert.ecosystem}
                    </p>
                  </div>
                  <StatusPill tone={alert.severity === "critical" ? "critical" : alert.severity === "high" ? "warning" : "neutral"}>
                    {alert.severity}
                  </StatusPill>
                </div>
              </a>
            )) : (
              <div className="rounded-2xl bg-black/18 p-4 text-sm text-muted-foreground">{data.availability.dependabotAlerts.reason ?? "Dependabot data unavailable."}</div>
            )}
          </div>
        </section>

        <section className="rounded-3xl surface-panel p-6">
          <div className="mb-6 flex items-center gap-3">
            <Shield size={16} className="text-primary" />
            <h2 className="font-headline text-xl font-bold">Source Metadata</h2>
          </div>
          <div className="rounded-2xl bg-black/18 p-4">
            <p className="text-sm font-semibold">
              {data.availability.dependabotAlerts.available ? "Dependabot dataset available" : "Dependabot unavailable"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {data.availability.dependabotAlerts.available
                ? "Security endpoint was available in the current dataset."
                : data.availability.dependabotAlerts.reason}
            </p>
          </div>

          <div className="mt-6 space-y-4">
            <DetailRow label="Visibility" value={data.repo.isPrivate ? "private" : "public"} highlighted={!data.repo.isPrivate} />
            <DetailRow label="Created" value={new Date(data.repo.createdAt).toLocaleDateString()} />
            <DetailRow label="Last Push" value={data.repo.lastPushAt ? new Date(data.repo.lastPushAt).toLocaleDateString() : "Unavailable"} />
            <DetailRow
              label="External"
              value={<a href={data.repo.htmlUrl} className="inline-flex items-center gap-2 text-primary hover:underline">Open on GitHub <ExternalLink size={13} /></a>}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  highlighted = false,
}: {
  label: string;
  value: ReactNode;
  highlighted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={highlighted ? "rounded-lg bg-primary/12 px-3 py-1 text-sm font-semibold text-primary" : "text-sm font-semibold"}>{value}</span>
    </div>
  );
}
