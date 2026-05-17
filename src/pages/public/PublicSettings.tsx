import { type FormEvent, useState } from "react";
import { Github, Search, Moon, Sun, LoaderCircle } from "lucide-react";
import { useApp } from "@/contexts/useApp";
import { usePublicRuntime } from "@/contexts/usePublicRuntime";
import { usePublicDashboardSnapshot, usePublicProfileRepos, usePublicRateLimit, usePublicSnapshotManifest } from "@/hooks/useGitHubPublic";
import { formatDateTime } from "@/i18n";
import { cn } from "@/lib/utils";
import type { DataDetailMode, Theme } from "@/types";

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
    return (
      <div className="flex h-full items-center justify-center gap-3 text-body text-foreground-subtle">
        <LoaderCircle size={16} className="animate-spin" />
        {t("loadingSettings")}
      </div>
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeUsername(usernameInput);
    if (!normalized) return;
    setUsername(normalized);
  }

  return (
    <div className="h-full min-h-0 w-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-5 py-6 md:px-8 md:py-8 space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-display font-headline font-bold tracking-tight text-foreground">
            {mode === "public-profile" ? t("publicProfileSource") : t("publishedSnapshot")}
          </h1>
          <p className="text-body text-foreground-subtle mt-1">
            {mode === "public-profile" ? t("publicProfileSourceBody") : t("publishedSnapshotBody")}
          </p>
        </div>

        {/* Source + Status */}
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">

          {/* Public Source */}
          <section className="rounded-xl border border-border/60 bg-surface-1 shadow-sm p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-title font-headline font-semibold text-foreground">{t("publicSourceTitle")}</h2>
                <p className="text-sm text-foreground-subtle mt-0.5">{t("enterGitHubUsernameBody")}</p>
              </div>
              <span className={cn(
                "text-micro font-semibold px-2 py-1 rounded-md shrink-0",
                mode === "public-profile" ? "bg-success/10 text-success" : "bg-surface-3 text-foreground-subtle"
              )}>
                {mode === "public-profile" ? t("publicApiLabel") : t("snapshotLabel")}
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-micro font-semibold text-foreground-subtle uppercase tracking-wider">{t("gitHubUsername")}</label>
                <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
                  <div className="relative flex-1">
                    <Github size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground-subtle/40" />
                    <input
                      type="text" autoComplete="off"
                      value={usernameInput}
                      onChange={e => setUsernameInput(e.target.value)}
                      placeholder="@mafhper"
                      className="h-10 w-full rounded-lg border border-border/60 bg-surface-2 pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-foreground-subtle/40 focus:border-primary/50 transition-colors"
                    />
                  </div>
                  <button type="submit" className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
                    <Search size={14} />
                    {t("loadPublicRepos")}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/30 bg-surface-2/50 p-3">
                <p className="text-sm text-foreground-subtle">
                  {mode === "public-profile" ? `${t("currentSource")}: @${username}` : `${t("currentSource")}: ${t("publishedSnapshot").toLowerCase()}`}
                </p>
                {mode === "public-profile" && (
                  <button type="button" onClick={clearUsername} className="text-micro font-medium text-primary hover:text-primary/80 transition-colors">
                    {t("useSnapshot")}
                  </button>
                )}
              </div>
            </form>
          </section>

          {/* Runtime Status */}
          <section className="rounded-xl border border-border/60 bg-surface-1 shadow-sm p-5 space-y-4">
            <div>
              <h2 className="text-title font-headline font-semibold text-foreground">{t("runtimeStatusTitle")}</h2>
            </div>
            <div className="space-y-2.5">
              <StatusLine label={t("publishedSnapshotLabel")} value={formatDateTime(manifest.status.generatedAt, settings.lang)} />
              <StatusLine label={t("snapshotSource")} value={manifest.status.generatedBy} />
              <StatusLine label={t("currentMode")} value={mode === "public-profile" ? "public-github-api" : "github-pages"} highlight />
              <StatusLine label={t("visibleRepos")} value={String(mode === "public-profile" ? publicRepos.length : (overview?.repos.length ?? 0))} highlight={(mode === "public-profile" ? publicRepos.length : (overview?.repos.length ?? 0)) > 0} />
              {rateLimit && <StatusLine label={t("rateLimit")} value={`${rateLimit.remaining}/${rateLimit.limit}`} />}
              <StatusLine label={t("featuredRepo")} value={mode === "public-profile" ? (publicRepos[0]?.fullName ?? t("none")) : (manifest.featuredRepo || t("none"))} highlight={mode === "public-profile" ? Boolean(publicRepos[0]?.fullName) : Boolean(manifest.featuredRepo)} />
            </div>
          </section>
        </div>

        {/* Preferences */}
        <section className="rounded-xl border border-border/60 bg-surface-1 shadow-sm p-5 space-y-4">
          <div>
            <h2 className="text-title font-headline font-semibold text-foreground">{t("preferences")}</h2>
            <p className="text-sm text-foreground-subtle mt-0.5">{t("interfaceSettings")}</p>
          </div>
          <div className="flex flex-wrap gap-6">
            <PreferenceToggle
              label={t("theme")}
              current={settings.theme}
              options={[
                { value: "dark", label: t("themeDark"), icon: <Moon size={14} />, swatch: "linear-gradient(90deg,#050505,#262626,#4b5563)" },
                { value: "light", label: t("themeLight"), icon: <Sun size={14} />, swatch: "linear-gradient(90deg,#f8fafc,#dbeafe,#2563eb)" },
                { value: "phosphor-green", label: t("themePhosphorGreen"), swatch: "linear-gradient(90deg,#03120a,#22ff4f,#a7ff83)" },
                { value: "golden-matrix", label: t("themeGoldenMatrix"), swatch: "linear-gradient(90deg,#120c02,#f59e0b,#fde68a)" },
                { value: "blue-calm", label: t("themeBlueCalm"), swatch: "linear-gradient(90deg,#061826,#38bdf8,#bfdbfe)" },
                { value: "green-ish", label: t("themeGreenIsh"), swatch: "linear-gradient(90deg,#04130d,#34d399,#bbf7d0)" },
                { value: "brown-earth", label: t("themeBrownEarth"), swatch: "linear-gradient(90deg,#120a05,#b45309,#fed7aa)" },
              ]}
              onSelect={(value) => updateSettings({ theme: value as Theme })}
            />
            <PreferenceToggle
              label={t("language")}
              current={settings.lang}
              options={[
                { value: "en", label: "EN" },
                { value: "pt-BR", label: "PT" },
                { value: "es", label: "ES" },
              ]}
              onSelect={(value) => updateSettings({ lang: value as 'en' | 'pt-BR' | 'es' })}
            />
            <PreferenceToggle
              label={t("dataDetailLevel")}
              current={settings.dataDetailMode ?? "balanced"}
              options={[
                { value: "balanced", label: t("detailBalanced") },
                { value: "detailed", label: t("detailDetailed") },
                { value: "full", label: t("detailFull") },
              ]}
              onSelect={(value) => updateSettings({ dataDetailMode: value as DataDetailMode })}
            />
          </div>
          <p className="text-sm text-foreground-subtle">{t("detailBalancedHint")}</p>
        </section>

        {/* Repositories List */}
        <section className="rounded-xl border border-border/60 bg-surface-1 shadow-sm p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-title font-headline font-semibold text-foreground">
                {mode === "public-profile" ? t("publicRepositoriesPanelTitle") : t("trackedRepositoriesPanelTitle")}
              </h2>
              <p className="text-sm text-foreground-subtle mt-0.5">
                {mode === "public-profile" ? t("publicReposLoadedForUserBody", { username }) : t("trackedReposSnapshotBody")}
              </p>
            </div>
            <span className="text-micro font-medium px-2 py-1 rounded-md bg-surface-3 text-foreground-subtle shrink-0">
              {mode === "public-profile" ? `${publicRepos.length} public` : `${overview?.repos.length ?? 0} tracked`}
            </span>
          </div>

          <div className="space-y-1.5">
            {mode === "public-profile" ? (
              publicReposLoading ? (
                <div className="rounded-lg border border-border/30 bg-surface-2/50 p-4 text-sm text-foreground-subtle italic">{t("loadingPublicRepositories")}</div>
              ) : publicReposError ? (
                <div className="rounded-lg border border-border/30 bg-surface-2/50 p-4 text-sm text-foreground-subtle italic">{t("couldNotResolveUser", { username: username ?? "" })}</div>
              ) : publicRepos.length > 0 ? (
                publicRepos.map((repo, index) => (
                  <div key={repo.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/30 bg-surface-2/40 px-4 py-3 hover:bg-surface-2/60 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{repo.fullName}</p>
                      <p className="text-micro text-foreground-subtle truncate">{repo.description || t("noDescription")}</p>
                    </div>
                    <span className={cn(
                      "text-micro font-medium px-2 py-0.5 rounded shrink-0",
                      index === 0 ? "bg-primary/10 text-primary" : "bg-surface-3 text-foreground-subtle"
                    )}>
                      {index === 0 ? t("latestPush") : t("publicLabel")}
                    </span>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-border/30 bg-surface-2/50 p-4 text-sm text-foreground-subtle italic">{t("noPublicRepositoriesForUser", { username: username ?? "" })}</div>
              )
            ) : (
              overview?.repos.map((entry) => (
                <div key={entry.repo.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/30 bg-surface-2/40 px-4 py-3 hover:bg-surface-2/60 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{entry.repo.fullName}</p>
                    <p className="text-micro text-foreground-subtle truncate">{entry.repo.description || t("noRepositoryDescriptionSnapshot")}</p>
                  </div>
                  <span className={cn(
                    "text-micro font-medium px-2 py-0.5 rounded shrink-0",
                    entry.repo.fullName === manifest.featuredRepo ? "bg-primary/10 text-primary" : "bg-surface-3 text-foreground-subtle"
                  )}>
                    {entry.repo.fullName === manifest.featuredRepo ? t("featured") : t("tracked")}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Security */}
        <section className="rounded-xl border border-border/60 bg-surface-1 shadow-sm p-5 space-y-4">
          <h2 className="text-title font-headline font-semibold text-foreground">{t("securityBoundaryTitle")}</h2>
          <div className="space-y-2 text-sm text-foreground-subtle leading-relaxed">
            <div className="rounded-lg border border-border/30 bg-surface-2/50 p-3">
              {t("publishedSiteNoToken")}
            </div>
            <div className="rounded-lg border border-border/30 bg-surface-2/50 p-3">
              {t("publicProfileModeSecurityBody")}
            </div>
            <div className="rounded-lg border border-border/30 bg-surface-2/50 p-3">
              {t("localhostRicherDataBody")}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatusLine({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-foreground-subtle">{label}</span>
      <span className={cn("text-sm font-semibold truncate", highlight ? "text-primary" : "text-foreground")}>{value}</span>
    </div>
  );
}

function PreferenceToggle({ label, current, options, onSelect }: {
  label: string; current: string; options: Array<{ value: string; label: string; icon?: React.ReactNode; swatch?: string }>; onSelect: (value: string) => void;
}) {
  return (
    <div>
      <p className="text-micro font-semibold text-foreground-subtle uppercase tracking-wider mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button key={opt.value} onClick={() => onSelect(opt.value)}
            className={cn(
              "relative flex min-h-10 items-center gap-1.5 overflow-hidden rounded-lg px-3.5 py-2 text-sm font-medium transition-all",
              current === opt.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "border border-border/60 bg-surface-2 text-foreground-subtle hover:border-foreground-subtle/30 hover:text-foreground"
            )}
          >
            {opt.icon}
            {opt.label}
            {opt.swatch && (
              <span
                aria-hidden="true"
                className="absolute inset-x-2 bottom-1 h-1 rounded-full opacity-90"
                style={{ background: opt.swatch }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
