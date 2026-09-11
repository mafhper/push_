import { StatusPill } from "@/components/site/TerminalPrimitives";
import { useApp } from "@/contexts/useApp";
import { formatDate } from "@/i18n";
import { cn } from "@/lib/utils";
import type { RepoSnapshotDetail } from "@/types";

export function WorkflowRunDetail({ runs }: { runs: RepoSnapshotDetail["workflowRuns"] }) {
  const { settings, t } = useApp();
  const grouped = Array.from(
    runs.reduce((map, run) => {
      const arr = map.get(run.workflowName) || [];
      arr.push(run);
      map.set(run.workflowName, arr);
      return map;
    }, new Map<string, typeof runs>()),
    ([name, workflowRuns]) => ({
      name,
      runs: [...workflowRuns].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()),
    }),
  ).sort((a, b) => new Date(b.runs[0].startedAt).getTime() - new Date(a.runs[0].startedAt).getTime());

  if (runs.length === 0) {
    return <p className="rounded-[1.35rem] ops-surface-soft px-4 py-4 text-sm text-muted-foreground">{t("noWorkflowRunsSnapshot")}</p>;
  }

  return (
    <div className="space-y-2">
      {grouped.map((group) => {
        const successCount = group.runs.filter((run) => run.conclusion === "success").length;
        const failCount = group.runs.filter((run) => run.conclusion === "failure").length;
        const latest = group.runs[0];
        const latestStatus = failCount > 0 ? t("failure") : latest.conclusion === "success" ? t("success") : latest.status;
        return (
          <div key={group.name} className="rounded-[1.15rem] ops-surface-soft px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="min-w-0 truncate text-sm font-semibold text-foreground">{group.name}</span>
              <span className="flex shrink-0 items-center gap-2">
                {successCount > 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-xs text-primary">
                    {t("workflowCountSuccess", { count: successCount })}
                  </span>
                )}
                {failCount > 0 && (
                  <span className="rounded-full bg-destructive/10 px-2 py-0.5 font-mono text-xs text-destructive">
                    {t("workflowCountFailed", { count: failCount })}
                  </span>
                )}
                <StatusPill tone={failCount > 0 ? "critical" : latest.conclusion === "success" ? "success" : "neutral"}>
                  {latestStatus}
                </StatusPill>
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {group.runs.slice(0, 4).map((run) => (
                <a key={run.id} href={run.htmlUrl} className="inline-flex items-center gap-1.5 rounded-lg bg-black/18 px-2 py-1 font-mono transition-colors hover:text-primary">
                  <span className={cn("h-1.5 w-1.5 rounded-full", run.conclusion === "success" && "bg-success", run.conclusion === "failure" && "bg-destructive", !run.conclusion && "bg-secondary")} />
                  <span className="text-foreground/72">{formatDate(run.startedAt, settings.lang)}</span>
                </a>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}