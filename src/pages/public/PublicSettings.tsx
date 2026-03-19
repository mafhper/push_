import { EmptyPanel, SectionHeading, StatusPill } from "@/components/site/TerminalPrimitives";
import { usePublicDashboardSnapshot, usePublicRateLimit, usePublicSnapshotManifest } from "@/hooks/useGitHubPublic";

export default function PublicSettingsPage() {
  const { data: manifest } = usePublicSnapshotManifest();
  const { data: overview } = usePublicDashboardSnapshot();
  const { data: rateLimit } = usePublicRateLimit();

  if (!manifest) {
    return <EmptyPanel title="Loading settings" body="Resolving published runtime metadata." />;
  }

  return (
    <div className="space-y-10">
      <SectionHeading
        kicker="Public Pages Runtime"
        title="Snapshot status"
        body="The published dashboard runs from static snapshots only."
      />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-3xl surface-panel p-6">
          <h2 className="font-headline text-2xl font-bold">Runtime status</h2>
          <div className="mt-6 space-y-4">
            <StatusLine label="Snapshot generated" value={new Date(manifest.status.generatedAt).toLocaleString()} />
            <StatusLine label="Snapshot source" value={manifest.status.generatedBy} />
            <StatusLine label="Current mode" value="github-pages" highlighted />
            <StatusLine label="Visible repos" value={String(overview?.repos.length ?? 0)} highlighted={(overview?.repos.length ?? 0) > 0} />
            {rateLimit ? <StatusLine label="Rate limit" value={`${rateLimit.remaining}/${rateLimit.limit}`} /> : null}
            <StatusLine label="Featured repo" value={manifest.featuredRepo || "none"} highlighted={Boolean(manifest.featuredRepo)} />
          </div>
        </section>

        <section className="rounded-3xl surface-panel p-6">
          <h2 className="font-headline text-2xl font-bold">Security boundary</h2>
          <div className="mt-6 space-y-4 text-sm leading-7 text-muted-foreground">
            <div className="rounded-2xl bg-black/18 p-4">
              The published site does not accept a GitHub token.
            </div>
            <div className="rounded-2xl bg-black/18 p-4">
              Local repository discovery and selection exist only in the development runtime.
            </div>
            <div className="rounded-2xl bg-black/18 p-4">
              Any richer data must be captured during snapshot generation before deployment.
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-3xl surface-panel p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-headline text-2xl font-bold">Tracked repositories</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
              Public repositories included in the current published snapshot.
            </p>
          </div>
          <StatusPill tone="neutral">{overview?.repos.length ?? 0} tracked</StatusPill>
        </div>

        <div className="mt-6 space-y-3">
          {overview?.repos.map((entry) => (
            <div key={entry.repo.id} className="flex items-center justify-between gap-4 rounded-2xl bg-black/18 p-4">
              <div>
                <p className="font-semibold">{entry.repo.fullName}</p>
                <p className="mt-1 text-sm text-muted-foreground">{entry.repo.description || "No repository description in the current snapshot."}</p>
              </div>
              <StatusPill tone={entry.repo.fullName === manifest.featuredRepo ? "success" : "neutral"}>
                {entry.repo.fullName === manifest.featuredRepo ? "Featured" : "Tracked"}
              </StatusPill>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatusLine({
  label,
  value,
  highlighted = false,
}: {
  label: string;
  value: string;
  highlighted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={highlighted ? "rounded-lg bg-primary/12 px-3 py-1 text-sm font-semibold text-primary" : "text-sm font-semibold"}>{value}</span>
    </div>
  );
}
