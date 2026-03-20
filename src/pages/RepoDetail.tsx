import { Link, useParams } from "react-router-dom";
import { useRepoSnapshot } from "@/hooks/useGitHub";
import { EmptyPanel, SectionHeading, StatusPill } from "@/components/site/TerminalPrimitives";
import { isLocalSecureRuntime } from "@/config/site";
import { useApp } from "@/contexts/useApp";
import { ArrowLeft, ExternalLink, Github, History, Shield, Star } from "lucide-react";
import { LANGUAGE_COLORS, type WorkflowRun } from "@/types";

export default function RepoDetail() {
  const { owner = "", repo = "" } = useParams();
  const { session } = useApp();
  const { data, isLoading, error } = useRepoSnapshot(owner, repo);
  const localRuntime = isLocalSecureRuntime();
  const isLocalAuthenticated = localRuntime && Boolean(session?.token);
  const modeLabel = data?.status.dataMode === "authenticated" || isLocalAuthenticated ? "local auth" : "snapshot";

  if (isLoading) {
    return <EmptyPanel title="Loading repository detail" body="Resolving workflow history, languages, contributors and alert availability." />;
  }

  if (!data || error) {
    return <EmptyPanel title="Snapshot detail unavailable" body="The repository detail file was not found in the current snapshot dataset." />;
  }

  const languageEntries = Object.entries(data.languages);
  const totalLanguageBytes = languageEntries.reduce((sum, [, value]) => sum + value, 0);
  const pipelineBars: WorkflowRun[] = data.workflowRuns.slice(0, 14);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-6">
        <div className="space-y-4">
          <Link to="/app" className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-foreground/55 hover:text-primary">
            <ArrowLeft size={12} />
            Voltar
          </Link>
          <div>
            <div className="mb-4 flex items-center gap-3">
              <StatusPill tone={modeLabel === "local auth" ? "warning" : "neutral"}>{modeLabel}</StatusPill>
              <StatusPill tone={data.health.status === "healthy" ? "success" : data.health.status === "warning" ? "warning" : "critical"}>
                {data.health.status}
              </StatusPill>
            </div>
            <h1 className="text-fluid-4xl font-black tracking-tighter">{data.repo.name}</h1>
            <p className="mt-3 max-w-3xl text-lg leading-8 text-muted-foreground">
              {data.repo.description || "Semantic command layer for published repository telemetry."}
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
              body={`${data.workflowRuns.length} workflow executions available in the current ${modeLabel === "local auth" ? "authenticated session" : "snapshot"}.`}
            />
            <div className="flex gap-2">
              <StatusPill tone="success">Success</StatusPill>
              <StatusPill tone="critical">Failed</StatusPill>
              <StatusPill tone="warning">Warning</StatusPill>
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
                  <span>Snapshot history</span>
                  <span>{data.workflowRuns[0]?.id ? `Latest run #${data.workflowRuns[0].id}` : "No workflow data"}</span>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/8 px-4 py-10 text-sm text-muted-foreground">
                No workflow executions are available for this repository in the current {modeLabel === "local auth" ? "session" : "snapshot"}.
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
                  {modeLabel === "local auth" ? "Latest commit activity resolved directly from the authenticated GitHub session." : "Latest commit activity captured by the snapshot."}
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
              {data.commits.length === 0 ? <p className="text-sm text-muted-foreground">No commit data is available for this repository yet.</p> : null}
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
                {data.alerts.length > 0 ? `${data.alerts.length} vulnerabilities identified in manifest files.` : "No open alerts in the current snapshot."}
              </p>
            </div>
            <a
              href={`${data.repo.htmlUrl}/security/dependabot`}
              className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary hover:underline"
            >
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
              <div className="rounded-2xl bg-black/18 p-4 text-sm text-muted-foreground">Dependabot data is unavailable or there are no open issues.</div>
            )}
          </div>
        </section>

        <section className="rounded-3xl surface-panel p-6">
          <div className="mb-6 flex items-center gap-3">
            <Shield size={16} className="text-primary" />
            <h2 className="font-headline text-xl font-bold">Security Surface</h2>
          </div>
          <div className="rounded-2xl bg-black/18 p-4">
            <p className="text-sm font-semibold">
              {data.availability.dependabotAlerts.available ? "Dependabot dataset available" : "Dependabot unavailable"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {data.availability.dependabotAlerts.available
                ? `Security endpoint resolved in the current ${modeLabel === "local auth" ? "authenticated session" : "snapshot"}.`
                : data.availability.dependabotAlerts.reason}
            </p>
          </div>

          <div className="mt-6 space-y-4">
            <DetailRow label="Visibility" value={data.repo.isPrivate ? "private" : "public"} highlighted={!data.repo.isPrivate} />
            <DetailRow label="Created" value={new Date(data.repo.createdAt).toLocaleDateString()} />
            <DetailRow label="Last Push" value={new Date(data.repo.lastPushAt).toLocaleDateString()} />
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
  value: React.ReactNode;
  highlighted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={highlighted ? "rounded-lg bg-primary/12 px-3 py-1 text-sm font-semibold text-primary" : "text-sm font-semibold"}>{value}</span>
    </div>
  );
}
