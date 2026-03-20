import { type FormEvent, useState } from "react";
import { Github, Search } from "lucide-react";
import { EmptyPanel, SectionHeading, StatusPill } from "@/components/site/TerminalPrimitives";
import { usePublicRuntime } from "@/contexts/usePublicRuntime";
import { usePublicDashboardSnapshot, usePublicProfileRepos, usePublicRateLimit, usePublicSnapshotManifest } from "@/hooks/useGitHubPublic";

function normalizeUsername(value: string) {
  return value.trim().replace(/^@+/, "").toLowerCase();
}

export default function PublicSettingsPage() {
  const { mode, username, setUsername, clearUsername } = usePublicRuntime();
  const { data: manifest } = usePublicSnapshotManifest();
  const { data: overview } = usePublicDashboardSnapshot();
  const { data: rateLimit } = usePublicRateLimit();
  const { data: publicRepos = [], isLoading: publicReposLoading, error: publicReposError } = usePublicProfileRepos();
  const [usernameInput, setUsernameInput] = useState(username ?? "");

  if (!manifest) {
    return <EmptyPanel title="Loading settings" body="Resolving published runtime metadata." />;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeUsername(usernameInput);
    if (!normalized) return;
    setUsername(normalized);
  }

  return (
    <div className="space-y-10">
      <SectionHeading
        kicker="Public Pages Runtime"
        title={mode === "public-profile" ? "Public profile source" : "Published snapshot"}
        body={
          mode === "public-profile"
            ? "This tab is reading a public GitHub profile directly from the GitHub API, without a token."
            : "The published dashboard runs from static snapshots by default. You can also inspect a public GitHub profile without a token."
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl surface-panel p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-headline text-2xl font-bold">Public source</h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
                Enter a GitHub username to inspect public repositories only. No token is accepted in the published runtime.
              </p>
            </div>
            <StatusPill tone={mode === "public-profile" ? "success" : "neutral"}>
              {mode === "public-profile" ? "Public API" : "Snapshot"}
            </StatusPill>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="terminal-label">GitHub username</span>
              <div className="mt-3 flex gap-3">
                <div className="relative flex-1">
                  <Github className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-foreground/35" size={15} />
                  <input
                    type="text"
                    autoComplete="off"
                    value={usernameInput}
                    onChange={(event) => setUsernameInput(event.target.value)}
                    placeholder="@mafhper"
                    className="h-12 w-full rounded-2xl border border-white/6 bg-black/18 pl-11 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-foreground/30 focus:border-primary/35"
                  />
                </div>
                <button type="submit" className="button-primary-terminal px-5 py-3 text-sm">
                  <Search size={15} />
                  Load public repos
                </button>
              </div>
            </label>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-black/18 p-4">
              <p className="text-sm text-foreground/75">
                {mode === "public-profile" ? `Current source: @${username}` : "Current source: published snapshot"}
              </p>

              {mode === "public-profile" ? (
                <button type="button" onClick={clearUsername} className="button-secondary-terminal px-4 py-2 text-xs uppercase tracking-[0.22em]">
                  Use snapshot
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="rounded-3xl surface-panel p-6">
          <h2 className="font-headline text-2xl font-bold">Runtime status</h2>
          <div className="mt-6 space-y-4">
            <StatusLine label="Published snapshot" value={new Date(manifest.status.generatedAt).toLocaleString()} />
            <StatusLine label="Snapshot source" value={manifest.status.generatedBy} />
            <StatusLine label="Current mode" value={mode === "public-profile" ? "public-github-api" : "github-pages"} highlighted />
            <StatusLine label="Visible repos" value={String(mode === "public-profile" ? publicRepos.length : (overview?.repos.length ?? 0))} highlighted={(mode === "public-profile" ? publicRepos.length : (overview?.repos.length ?? 0)) > 0} />
            {rateLimit ? <StatusLine label="Rate limit" value={`${rateLimit.remaining}/${rateLimit.limit}`} /> : null}
            <StatusLine label="Featured repo" value={mode === "public-profile" ? (publicRepos[0]?.fullName ?? "none") : (manifest.featuredRepo || "none")} highlighted={mode === "public-profile" ? Boolean(publicRepos[0]?.fullName) : Boolean(manifest.featuredRepo)} />
          </div>
        </section>
      </div>

      <section className="rounded-3xl surface-panel p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-headline text-2xl font-bold">{mode === "public-profile" ? "Public repositories" : "Tracked repositories"}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
              {mode === "public-profile"
                ? `Repositories loaded directly from the GitHub public API for @${username}.`
                : "Public repositories included in the current published snapshot."}
            </p>
          </div>
          <StatusPill tone="neutral">{mode === "public-profile" ? `${publicRepos.length} public` : `${overview?.repos.length ?? 0} tracked`}</StatusPill>
        </div>

        <div className="mt-6 space-y-3">
          {mode === "public-profile" ? (
            publicReposLoading ? (
              <div className="rounded-2xl bg-black/18 p-4 text-sm text-muted-foreground">Loading public repositories.</div>
            ) : publicReposError ? (
              <div className="rounded-2xl bg-black/18 p-4 text-sm text-muted-foreground">Could not resolve @{username} from the GitHub public API.</div>
            ) : publicRepos.length > 0 ? (
              publicRepos.map((repo, index) => (
                <div key={repo.id} className="flex items-center justify-between gap-4 rounded-2xl bg-black/18 p-4">
                  <div>
                    <p className="font-semibold">{repo.fullName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{repo.description || "No public repository description."}</p>
                  </div>
                  <StatusPill tone={index === 0 ? "success" : "neutral"}>
                    {index === 0 ? "Latest push" : "Public"}
                  </StatusPill>
                </div>
              ))
            ) : (
              <div className="rounded-2xl bg-black/18 p-4 text-sm text-muted-foreground">No public repositories were found for @{username}.</div>
            )
          ) : (
            overview?.repos.map((entry) => (
              <div key={entry.repo.id} className="flex items-center justify-between gap-4 rounded-2xl bg-black/18 p-4">
                <div>
                  <p className="font-semibold">{entry.repo.fullName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{entry.repo.description || "No repository description in the current snapshot."}</p>
                </div>
                <StatusPill tone={entry.repo.fullName === manifest.featuredRepo ? "success" : "neutral"}>
                  {entry.repo.fullName === manifest.featuredRepo ? "Featured" : "Tracked"}
                </StatusPill>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-3xl surface-panel p-6">
        <h2 className="font-headline text-2xl font-bold">Security boundary</h2>
        <div className="mt-6 space-y-4 text-sm leading-7 text-muted-foreground">
          <div className="rounded-2xl bg-black/18 p-4">
            The published site does not accept a GitHub token.
          </div>
          <div className="rounded-2xl bg-black/18 p-4">
            Public profile mode can read only public repository data exposed by GitHub without authentication.
          </div>
          <div className="rounded-2xl bg-black/18 p-4">
            Local repository discovery with richer repository data remains available only in localhost with a token.
          </div>
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
