import type { ReactNode } from "react";
import { useParams } from "react-router-dom";
import { ExternalLink, History } from "lucide-react";
import { RepositoryHero } from "@/components/repository/RepositoryHero";
import { WorkflowPulsePanel } from "@/components/repository/WorkflowPulsePanel";
import { EmptyPanel, StatusPill } from "@/components/site/TerminalPrimitives";
import { usePublicRuntime } from "@/contexts/usePublicRuntime";
import { usePublicRepoSnapshot } from "@/hooks/useGitHubPublic";
import { LANGUAGE_COLORS } from "@/types";

export default function PublicRepoDetail() {
  const { mode } = usePublicRuntime();
  const { owner = "", repo = "" } = useParams();
  const { data, isLoading, error } = usePublicRepoSnapshot(owner, repo);

  if (isLoading) {
    return (
      <EmptyPanel
        title="Loading repository"
        body={mode === "public-profile" ? "Loading public repository data." : "Loading workflows, languages, commits, and alerts."}
      />
    );
  }

  if (!data || error) {
    return (
      <EmptyPanel
        title="Repository unavailable"
        body={mode === "public-profile" ? "The public GitHub API could not resolve this repository." : "Repository data was not found in the current snapshot."}
      />
    );
  }

  const languageEntries = Object.entries(data.languages);
  const totalLanguageBytes = languageEntries.reduce((sum, [, value]) => sum + value, 0);

  return (
    <div className="space-y-6">
      <RepositoryHero
        backLabel="Back"
        sourceLabel={mode === "public-profile" ? "Public API" : "Snapshot"}
        sourceTone="success"
        healthLabel={data.health.status === "healthy" ? "Healthy" : data.health.status === "warning" ? "Watch" : "Critical"}
        healthTone={data.health.status === "healthy" ? "success" : data.health.status === "warning" ? "warning" : "critical"}
        name={data.repo.name}
        description={data.repo.description || "Repository overview."}
        repoUrl={data.repo.htmlUrl}
        stars={data.repo.stars}
        score={data.health.score}
        workflowSuccessRate={data.health.workflowSuccessRate}
        openAlerts={data.health.dependabotOpenCount}
        criticalAlerts={data.health.dependabotCriticalCount}
        failedRuns7d={data.health.failedRuns7d}
        stalenessDays={data.health.stalenessDays}
        lastPushAt={data.repo.lastPushAt}
        runs={data.workflowRuns}
      />

      <div className="grid gap-6 xl:grid-cols-[1.48fr_1fr] xl:items-start">
        <WorkflowPulsePanel
          runs={data.workflowRuns}
          title="Pipeline"
          body={
            mode === "public-profile"
              ? `${data.workflowRuns.length} recent workflow runs from GitHub.`
              : `${data.workflowRuns.length} recent workflow runs in the snapshot.`
          }
          historyLabel={mode === "public-profile" ? "Public runs" : "Snapshot runs"}
          emptyMessage={
            mode === "public-profile"
              ? "No public workflow runs are available for this repository."
              : "No workflow runs are available for this repository in the current snapshot."
          }
        />

        <div className="space-y-6">
          <section className="rounded-[2rem] ops-surface p-6">
            <div className="mb-6">
              <p className="terminal-label">Alerts</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground">Open Alerts</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {data.alerts.length > 0
                  ? `${data.alerts.length} alert${data.alerts.length > 1 ? "s" : ""} still need review.`
                  : data.availability.dependabotAlerts.reason ?? "No open alerts right now."}
              </p>
            </div>

            <div className="space-y-3">
              {data.alerts.length > 0 ? (
                data.alerts.slice(0, 3).map((alert) => (
                  <a key={alert.id} href={alert.htmlUrl} className="block rounded-[1.35rem] ops-surface-soft px-4 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-semibold text-foreground">{alert.summary}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {alert.packageName} / {alert.ecosystem}
                        </p>
                      </div>
                      <StatusPill tone={alert.severity === "critical" ? "critical" : alert.severity === "high" ? "warning" : "neutral"}>
                        {alert.severity}
                      </StatusPill>
                    </div>
                  </a>
                ))
              ) : (
                <div className="rounded-[1.35rem] ops-surface-soft px-4 py-4 text-sm text-muted-foreground">
                  {data.availability.dependabotAlerts.reason ?? "Dependabot data unavailable."}
                </div>
              )}
            </div>

            <a href={`${data.repo.htmlUrl}/security/dependabot`} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
              Open on GitHub
              <ExternalLink size={14} />
            </a>
          </section>

          <section className="rounded-[2rem] ops-surface p-6">
            <p className="terminal-label">Repository</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground">Repository</h2>
            <div className="mt-6 space-y-5">
              <DetailRow label="License" value={data.repo.license ?? "Unavailable"} highlighted={Boolean(data.repo.license)} />
              <DetailRow label="Main Branch" value={data.repo.defaultBranch} highlighted />
              <DetailRow label="Size" value={`${(data.repo.size / 1024).toFixed(1)} MB`} />
            </div>

            <div className="mt-8">
              <p className="terminal-label">Language Mix</p>
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
          </section>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.48fr_1fr] xl:items-start">
        <section className="rounded-[2rem] ops-surface p-6">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <p className="terminal-label">Recent Commits</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground">Recent Commits</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {mode === "public-profile" ? "Latest public commits from GitHub." : "Latest commits from the snapshot."}
              </p>
            </div>
            <History size={16} className="text-foreground/30" />
          </div>

          <div className="space-y-3">
            {data.commits.length > 0 ? (
              data.commits.slice(0, 5).map((commit) => (
                <a key={commit.sha} href={commit.htmlUrl} className="flex items-start gap-4 rounded-[1.35rem] ops-surface-soft px-4 py-4">
                  <div className="mt-1 h-10 w-10 overflow-hidden rounded-full bg-white/6">
                    {commit.authorAvatar ? <img src={commit.authorAvatar} alt={commit.authorLogin} className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="min-w-0">
                    <p className="line-clamp-2 font-semibold text-foreground">{commit.message}</p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/35">
                      {commit.authorLogin} | {commit.sha.slice(0, 7)}
                    </p>
                  </div>
                </a>
              ))
            ) : (
              <div className="rounded-[1.35rem] ops-surface-soft px-4 py-4 text-sm text-muted-foreground">
                {mode === "public-profile" ? "No public commit data is available." : "No commit data is available yet."}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[2rem] ops-surface p-6">
          <p className="terminal-label">Security</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground">Security</h2>

          <div className="mt-6 rounded-[1.35rem] ops-surface-soft p-4">
            <p className="text-sm font-semibold">
              {data.availability.dependabotAlerts.available ? "Dependabot available" : "Dependabot unavailable"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {data.availability.dependabotAlerts.available
                ? "Security data loaded from the current dataset."
                : data.availability.dependabotAlerts.reason}
            </p>
          </div>

          <div className="mt-6 space-y-4">
            <DetailRow label="Visibility" value={data.repo.isPrivate ? "private" : "public"} highlighted={!data.repo.isPrivate} />
            <DetailRow label="Created" value={new Date(data.repo.createdAt).toLocaleDateString()} />
            <DetailRow label="Last Push" value={data.repo.lastPushAt ? new Date(data.repo.lastPushAt).toLocaleDateString() : "Unavailable"} />
            <DetailRow
              label="External"
              value={
                <a href={data.repo.htmlUrl} className="inline-flex items-center gap-2 text-primary hover:underline">
                  Open on GitHub <ExternalLink size={13} />
                </a>
              }
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
      <span className={highlighted ? "rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary" : "text-sm font-semibold text-foreground"}>{value}</span>
    </div>
  );
}
