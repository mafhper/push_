import { type FormEvent, useState } from "react";
import { Github, Search } from "lucide-react";
import { EmptyPanel, SectionHeading, StatusPill } from "@/components/site/TerminalPrimitives";
import { useApp } from "@/contexts/useApp";
import { usePublicRuntime } from "@/contexts/usePublicRuntime";
import { usePublicDashboardSnapshot, usePublicProfileRepos, usePublicRateLimit, usePublicSnapshotManifest } from "@/hooks/useGitHubPublic";
import { formatDateTime } from "@/i18n";

function normalizeUsername(value: string) {
  return value.trim().replace(/^@+/, "").toLowerCase();
}

export default function PublicSettingsPage() {
  const { settings, updateSettings, t } = useApp();
  const { mode, username, setUsername, clearUsername } = usePublicRuntime();
  const { data: manifest } = usePublicSnapshotManifest();
  const { data: overview } = usePublicDashboardSnapshot();
  const { data: rateLimit } = usePublicRateLimit();
  const { data: publicRepos = [], isLoading: publicReposLoading, error: publicReposError } = usePublicProfileRepos();
  const [usernameInput, setUsernameInput] = useState(username ?? "");

  if (!manifest) {
    return <EmptyPanel title={t("loadingSettings")} body={t("loadingPublishedSettingsBody")} />;
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
        kicker={t("publicPagesRuntime")}
        title={mode === "public-profile" ? t("publicProfileSource") : t("publishedSnapshot")}
        body={
          mode === "public-profile"
            ? t("publicProfileSourceBody")
            : t("publishedSnapshotBody")
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl surface-panel p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-headline text-2xl font-bold">{t("publicSourceTitle")}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
                {t("enterGitHubUsernameBody")}
              </p>
            </div>
            <StatusPill tone={mode === "public-profile" ? "success" : "neutral"}>
              {mode === "public-profile" ? t("publicApiLabel") : t("snapshotLabel")}
            </StatusPill>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="terminal-label">{t("gitHubUsername")}</span>
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
                  {t("loadPublicRepos")}
                </button>
              </div>
            </label>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-black/18 p-4">
              <p className="text-sm text-foreground/75">
                {mode === "public-profile" ? `${t("currentSource")}: @${username}` : `${t("currentSource")}: ${t("publishedSnapshot").toLowerCase()}`}
              </p>

              {mode === "public-profile" ? (
                <button type="button" onClick={clearUsername} className="button-secondary-terminal px-4 py-2 text-xs uppercase tracking-[0.22em]">
                  {t("useSnapshot")}
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="rounded-3xl surface-panel p-6">
          <h2 className="font-headline text-2xl font-bold">{t("runtimeStatusTitle")}</h2>
          <div className="mt-6 space-y-4">
            <StatusLine label={t("publishedSnapshotLabel")} value={formatDateTime(manifest.status.generatedAt, settings.lang)} />
            <StatusLine label={t("snapshotSource")} value={manifest.status.generatedBy} />
            <StatusLine label={t("currentMode")} value={mode === "public-profile" ? "public-github-api" : "github-pages"} highlighted />
            <StatusLine label={t("visibleRepos")} value={String(mode === "public-profile" ? publicRepos.length : (overview?.repos.length ?? 0))} highlighted={(mode === "public-profile" ? publicRepos.length : (overview?.repos.length ?? 0)) > 0} />
            {rateLimit ? <StatusLine label={t("rateLimit")} value={`${rateLimit.remaining}/${rateLimit.limit}`} /> : null}
            <StatusLine label={t("featuredRepo")} value={mode === "public-profile" ? (publicRepos[0]?.fullName ?? t("none")) : (manifest.featuredRepo || t("none"))} highlighted={mode === "public-profile" ? Boolean(publicRepos[0]?.fullName) : Boolean(manifest.featuredRepo)} />
          </div>
        </section>
      </div>

      <section className="rounded-3xl surface-panel p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-headline text-2xl font-bold">{t("preferences")}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">{t("interfaceSettings")}</p>
          </div>
        </div>
        <div className="mt-6">
          <PreferenceToggle
            label={t("theme")}
            options={[
              { value: "dark", label: t("darkMode") },
              { value: "light", label: t("lightMode") },
            ]}
            current={settings.theme}
            onSelect={(value) => updateSettings({ theme: value as typeof settings.theme })}
          />

          <div className="mt-5">
          <PreferenceToggle
            label={t("language")}
            options={[
              { value: "en", label: t("english") },
              { value: "pt-BR", label: t("portugueseBrazil") },
              { value: "es", label: t("spanish") },
            ]}
            current={settings.lang}
            onSelect={(value) => updateSettings({ lang: value as typeof settings.lang })}
          />
          </div>
        </div>
      </section>

      <section className="rounded-3xl surface-panel p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-headline text-2xl font-bold">{mode === "public-profile" ? t("publicRepositoriesPanelTitle") : t("trackedRepositoriesPanelTitle")}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
              {mode === "public-profile"
                ? t("publicReposLoadedForUserBody", { username })
                : t("trackedReposSnapshotBody")}
            </p>
          </div>
          <StatusPill tone="neutral">{mode === "public-profile" ? `${publicRepos.length} ${t("publicLabel").toLowerCase()}` : `${overview?.repos.length ?? 0} ${t("tracked")}`}</StatusPill>
        </div>

        <div className="mt-6 space-y-3">
          {mode === "public-profile" ? (
            publicReposLoading ? (
              <div className="rounded-2xl bg-black/18 p-4 text-sm text-muted-foreground">{t("loadingPublicRepositories")}</div>
            ) : publicReposError ? (
              <div className="rounded-2xl bg-black/18 p-4 text-sm text-muted-foreground">{t("couldNotResolveUser", { username: username ?? "" })}</div>
            ) : publicRepos.length > 0 ? (
              publicRepos.map((repo, index) => (
                <div key={repo.id} className="flex items-center justify-between gap-4 rounded-2xl bg-black/18 p-4">
                  <div>
                    <p className="font-semibold">{repo.fullName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{repo.description || t("noDescription")}</p>
                  </div>
                  <StatusPill tone={index === 0 ? "success" : "neutral"}>
                    {index === 0 ? t("latestPush") : t("publicLabel")}
                  </StatusPill>
                </div>
              ))
            ) : (
              <div className="rounded-2xl bg-black/18 p-4 text-sm text-muted-foreground">{t("noPublicRepositoriesForUser", { username: username ?? "" })}</div>
            )
          ) : (
            overview?.repos.map((entry) => (
              <div key={entry.repo.id} className="flex items-center justify-between gap-4 rounded-2xl bg-black/18 p-4">
                <div>
                  <p className="font-semibold">{entry.repo.fullName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{entry.repo.description || t("noRepositoryDescriptionSnapshot")}</p>
                </div>
                <StatusPill tone={entry.repo.fullName === manifest.featuredRepo ? "success" : "neutral"}>
                  {entry.repo.fullName === manifest.featuredRepo ? t("featured") : t("tracked")}
                </StatusPill>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-3xl surface-panel p-6">
        <h2 className="font-headline text-2xl font-bold">{t("securityBoundaryTitle")}</h2>
        <div className="mt-6 space-y-4 text-sm leading-7 text-muted-foreground">
          <div className="rounded-2xl bg-black/18 p-4">
            {t("publishedSiteNoToken")}
          </div>
          <div className="rounded-2xl bg-black/18 p-4">
            {t("publicProfileModeSecurityBody")}
          </div>
          <div className="rounded-2xl bg-black/18 p-4">
            {t("localhostRicherDataBody")}
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

function PreferenceToggle({
  label,
  current,
  options,
  onSelect,
}: {
  label: string;
  current: string;
  options: Array<{ value: string; label: string }>;
  onSelect: (value: string) => void;
}) {
  return (
    <div>
      <p className="terminal-label">{label}</p>
      <div className="mt-3 flex flex-wrap gap-3">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onSelect(option.value)}
            className={current === option.value ? "rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" : "rounded-xl border border-[var(--button-secondary-border)] bg-[var(--button-secondary-contrast-bg)] px-4 py-2 text-sm font-semibold text-foreground/70"}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
