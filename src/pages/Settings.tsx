import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Github, KeyRound, LoaderCircle, Search, ShieldCheck, ShieldOff, Star } from "lucide-react";
import { EmptyPanel, SectionHeading, StatusPill } from "@/components/site/TerminalPrimitives";
import { LOCAL_SYNC_DOC, isLocalSecureRuntime } from "@/config/site";
import { useApp } from "@/contexts/useApp";
import { useDashboardSnapshot, useRateLimit, useRepos, useSnapshotManifest } from "@/hooks/useGitHub";
import { formatDate, formatDateTime, languageLabels } from "@/i18n";
import { cn } from "@/lib/utils";
import { validateToken } from "@/services/github";

export default function SettingsPage() {
  const {
    settings,
    updateSettings,
    session,
    setSession,
    primaryRepo,
    setPrimaryRepo,
    selectedRepos,
    setSelectedRepos,
    t,
  } = useApp();
  const localSecureMode = isLocalSecureRuntime();
  const { data: manifest } = useSnapshotManifest();
  const { data: overview } = useDashboardSnapshot();
  const { data: repos = [], isLoading: reposLoading, error: reposError } = useRepos();
  const { data: rateLimit } = useRateLimit();
  const [tokenInput, setTokenInput] = useState("");
  const [connectError, setConnectError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [repoQuery, setRepoQuery] = useState("");
  const [repoFilter, setRepoFilter] = useState<"all" | "selected" | "unselected">("all");

  const accessibleRepoNames = useMemo(() => new Set(repos.map((repo) => repo.fullName)), [repos]);
  const selectedRepoCount = localSecureMode && session ? selectedRepos.length : (overview?.repos.length ?? 0);
  const featuredRepoLabel = localSecureMode ? (primaryRepo ?? "none") : (manifest?.featuredRepo ?? "none");
  const selectedCount = selectedRepos.length;
  const filteredRepos = useMemo(() => {
    const normalizedQuery = repoQuery.trim().toLowerCase();
    return repos
      .filter((repo) => {
        const matchesFilter =
          repoFilter === "all"
            ? true
            : repoFilter === "selected"
              ? selectedRepos.includes(repo.fullName)
              : !selectedRepos.includes(repo.fullName);

        if (!matchesFilter) return false;
        if (!normalizedQuery) return true;

        const haystack = `${repo.fullName} ${repo.description ?? ""} ${repo.language ?? ""}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      })
      .sort((left, right) => {
        const leftFeatured = left.fullName === primaryRepo ? 1 : 0;
        const rightFeatured = right.fullName === primaryRepo ? 1 : 0;
        if (leftFeatured !== rightFeatured) return rightFeatured - leftFeatured;

        const leftSelected = selectedRepos.includes(left.fullName) ? 1 : 0;
        const rightSelected = selectedRepos.includes(right.fullName) ? 1 : 0;
        if (leftSelected !== rightSelected) return rightSelected - leftSelected;

        return left.fullName.localeCompare(right.fullName);
      });
  }, [primaryRepo, repoFilter, repoQuery, repos, selectedRepos]);

  useEffect(() => {
    if (!localSecureMode || !session || repos.length === 0) return;

    const nextSelected = selectedRepos.filter((repo) => accessibleRepoNames.has(repo));
    if (nextSelected.length !== selectedRepos.length) {
      setSelectedRepos(nextSelected);
    }

    if (primaryRepo && !accessibleRepoNames.has(primaryRepo)) {
      setPrimaryRepo(nextSelected[0] ?? repos[0]?.fullName ?? null);
      return;
    }

    if (!primaryRepo && nextSelected.length > 0) {
      setPrimaryRepo(nextSelected[0]);
    }
  }, [
    accessibleRepoNames,
    localSecureMode,
    primaryRepo,
    repos,
    selectedRepos,
    session,
    setPrimaryRepo,
    setSelectedRepos,
  ]);

  if (!manifest) {
    return <EmptyPanel title={t("loadingSettings")} body={t("loadingSettingsBody")} />;
  }

  async function handleConnect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedToken = tokenInput.trim();
    if (!trimmedToken) {
      setConnectError(t("connectionError"));
      return;
    }

    setIsConnecting(true);
    setConnectError(null);

    const viewer = await validateToken(trimmedToken);
    setIsConnecting(false);

    if (!viewer) {
      setConnectError(t("invalidToken"));
      return;
    }

    setSession({
      token: trimmedToken,
      username: viewer.login,
      avatarUrl: viewer.avatarUrl,
      authenticatedAt: new Date().toISOString(),
    });
    setTokenInput("");
  }

  function handleDisconnect() {
    setSession(null);
    setSelectedRepos([]);
    setPrimaryRepo(null);
    setTokenInput("");
    setConnectError(null);
  }

  function toggleRepo(fullName: string) {
    const isSelected = selectedRepos.includes(fullName);
    const nextSelected = isSelected ? selectedRepos.filter((repo) => repo !== fullName) : [...selectedRepos, fullName];
    setSelectedRepos(nextSelected);

    if (!nextSelected.length) {
      setPrimaryRepo(null);
      return;
    }

    if (!primaryRepo || !nextSelected.includes(primaryRepo)) {
      setPrimaryRepo(nextSelected[0]);
    }
  }

  function selectRepos(mode: "all" | "none") {
    const nextSelected = mode === "all" ? repos.map((repo) => repo.fullName) : [];

    setSelectedRepos(nextSelected);
    setPrimaryRepo(nextSelected[0] ?? null);
  }

  function selectFilteredRepos(mode: "all" | "none") {
    const filteredNames = filteredRepos.map((repo) => repo.fullName);
    const nextSelected =
      mode === "all"
        ? Array.from(new Set([...selectedRepos, ...filteredNames]))
        : selectedRepos.filter((repo) => !filteredNames.includes(repo));

    setSelectedRepos(nextSelected);

    if (!nextSelected.length) {
      setPrimaryRepo(null);
      return;
    }

    if (!primaryRepo || !nextSelected.includes(primaryRepo)) {
      setPrimaryRepo(nextSelected[0]);
    }
  }

  return (
    <div className="space-y-10">
      <SectionHeading
        kicker={localSecureMode ? t("localSecureMode") : t("publicPagesRuntime")}
        title={t("repositoryControl")}
        body={
          localSecureMode
            ? t("connectLocalTokenBody")
            : t("snapshotOnlyBody")
        }
      />

      <div className="grid gap-3 xl:grid-cols-4">
        <ControlMetric label={t("visibleRepos")} value={selectedRepoCount} hint={t("currentDashboardSet")} tone={selectedRepoCount > 0 ? "success" : "neutral"} />
        <ControlMetric label={t("featuredRepo")} value={featuredRepoLabel === "none" ? t("none") : t("featured")} hint={featuredRepoLabel} tone={featuredRepoLabel !== "none" ? "success" : "neutral"} />
        <ControlMetric
          label={t("mode")}
          value={localSecureMode ? (session ? t("live") : t("local")) : t("snapshotLabel")}
          hint={localSecureMode ? (session ? t("authenticatedSession") : t("awaitingToken")) : t("publishedSnapshot")}
          tone={session ? "success" : "neutral"}
        />
        <ControlMetric label={t("rateLimit")} value={rateLimit ? `${rateLimit.remaining}` : "--"} hint={rateLimit ? `of ${rateLimit.limit}` : t("unavailable")} tone={session ? "success" : "neutral"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[1.9rem] ops-surface p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="terminal-label">{t("sessionControl")}</p>
              <h2 className="mt-3 font-headline text-2xl font-bold tracking-tight">{t("githubAccess")}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                {localSecureMode
                  ? t("tokenSessionOnlyBody")
                  : t("publishedRuntimeNoBrowserTokenBody")}
              </p>
            </div>
            <StatusPill tone={localSecureMode ? (session ? "success" : "warning") : "neutral"}>
              {localSecureMode ? (session ? t("localAuth") : t("awaitingTokenLabel")) : t("snapshotOnly")}
            </StatusPill>
          </div>

          {localSecureMode ? (
            <div className="mt-6 space-y-6">
              <div className="rounded-[1.4rem] ops-surface-deep p-4">
                <div className="flex items-center gap-3">
                  {session?.avatarUrl ? (
                    <img src={session.avatarUrl} alt={session.username} className="h-12 w-12 rounded-full object-cover ring-1 ring-white/10" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-primary">
                      <Github size={18} />
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">{t("currentIdentity")}</p>
                    <p className="text-lg font-semibold">{session ? `@${session.username}` : t("noActiveSession")}</p>
                  </div>
                </div>
              </div>

              <form className="space-y-4" onSubmit={handleConnect}>
                <label className="block">
                  <span className="terminal-label">{t("githubToken")}</span>
                  <div className="mt-3 flex flex-col gap-3 md:flex-row">
                    <div className="relative flex-1">
                      <KeyRound className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-foreground/35" size={15} />
                      <input
                        type="password"
                        autoComplete="off"
                        value={tokenInput}
                        onChange={(event) => setTokenInput(event.target.value)}
                        placeholder={session ? t("pasteNewToken") : t("pastePersonalToken")}
                        className="h-12 w-full rounded-2xl border border-white/6 bg-black/18 pl-11 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-foreground/30 focus:border-primary/35"
                      />
                    </div>
                    <button type="submit" disabled={isConnecting} className="button-primary-terminal px-5 py-3 text-sm disabled:opacity-60">
                      {isConnecting ? <LoaderCircle size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
                      {session ? t("updateToken") : t("connect")}
                    </button>
                  </div>
                </label>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.4rem] ops-surface-deep p-4">
                  <p className="text-sm text-foreground/75">{t("tokenMemoryOnlyBody")}</p>

                  {session ? (
                    <button type="button" onClick={handleDisconnect} className="button-secondary-terminal px-4 py-2 text-xs uppercase tracking-[0.22em]">
                      <ShieldOff size={14} />
                      {t("disconnect")}
                    </button>
                  ) : null}
                </div>

                {connectError ? <p className="text-sm text-destructive">{connectError}</p> : null}
              </form>
            </div>
          ) : (
            <div className="mt-6 rounded-[1.4rem] ops-surface-deep p-5 text-sm leading-6 text-muted-foreground">
              {t("publishedRuntimeNoBrowserTokenBody")}
            </div>
          )}
        </section>

        <section className="rounded-[1.9rem] ops-surface p-6">
          <p className="terminal-label">{t("runtimeStatusTitle")}</p>
          <h2 className="mt-3 font-headline text-2xl font-bold tracking-tight">{t("currentMode")}</h2>
          <div className="mt-6 grid gap-3">
            <StatusLine label={t("publishedSnapshotLabel")} value={formatDateTime(manifest.status.generatedAt, settings.lang)} />
            <StatusLine label={t("snapshotSource")} value={manifest.status.generatedBy} />
            <StatusLine
              label={t("currentMode")}
              value={localSecureMode ? (session ? "local-authenticated" : "localhost-public") : "github-pages"}
              highlighted={Boolean(session)}
            />
            <StatusLine label={t("visibleRepos")} value={String(selectedRepoCount)} highlighted={selectedRepoCount > 0} />
            {rateLimit ? <StatusLine label={t("rateLimit")} value={`${rateLimit.remaining}/${rateLimit.limit}`} highlighted={Boolean(session)} /> : null}
            <StatusLine label={t("featuredRepo")} value={featuredRepoLabel} highlighted={Boolean(primaryRepo)} />
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
        <section className="rounded-[1.9rem] ops-surface p-6">
          <p className="terminal-label">{t("preferences")}</p>
          <h2 className="mt-3 font-headline text-2xl font-bold tracking-tight">{t("interfaceSettings")}</h2>
          <div className="mt-6 space-y-5">
            <PreferenceToggle
              label={t("theme")}
              options={[
                { value: "dark", label: t("darkMode") },
                { value: "light", label: t("lightMode") },
              ]}
              current={settings.theme}
              onSelect={(value) => updateSettings({ theme: value as typeof settings.theme })}
            />

            <PreferenceToggle
              label={t("density")}
              options={[
                { value: "balanced", label: t("balanced") },
                { value: "dense", label: t("dense") },
              ]}
              current={settings.dashboardDensity}
              onSelect={(value) => updateSettings({ dashboardDensity: value as typeof settings.dashboardDensity })}
            />

            <PreferenceToggle
              label={t("language")}
              options={Object.entries(languageLabels).map(([value, label]) => ({ value, label }))}
              current={settings.lang}
              onSelect={(value) => updateSettings({ lang: value as typeof settings.lang })}
            />
          </div>

          <div className="mt-8 space-y-4">
            <h3 className="font-headline text-xl font-bold tracking-tight">{t("runbook")}</h3>
            {LOCAL_SYNC_DOC.map((step) => (
              <div key={step} className="rounded-[1.25rem] ops-surface-deep p-4 text-sm leading-6 text-foreground/80">
                {t(step)}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[1.9rem] ops-surface p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="terminal-label">{t("repositoryQueuePanelTitle")}</p>
              <h2 className="mt-3 font-headline text-2xl font-bold tracking-tight">
                {localSecureMode ? t("availableRepositories") : t("trackedRepositories")}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                {localSecureMode
                  ? t("chooseDashboardReposBody")
                  : t("publishedRuntimeShowsSnapshotBody")}
              </p>
            </div>

            {localSecureMode ? (
              session ? <StatusPill tone="success">{`${repos.length} ${t("reposFound")}`}</StatusPill> : <StatusPill tone="warning">{t("awaitingToken")}</StatusPill>
            ) : (
              <StatusPill tone="neutral">{`${overview?.repos.length ?? 0} ${t("tracked")}`}</StatusPill>
            )}
          </div>

          {localSecureMode ? (
            <div className="mt-6 space-y-5">
              {session ? (
                <>
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="relative min-w-[18rem] flex-1">
                      <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-foreground/30" size={15} />
                      <input
                        type="search"
                        value={repoQuery}
                        onChange={(event) => setRepoQuery(event.target.value)}
                        placeholder={t("searchByNameDescriptionStack")}
                        className="h-11 w-full rounded-2xl border border-white/6 bg-black/18 pl-11 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-foreground/30 focus:border-primary/35"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <FilterChip label={t("all")} active={repoFilter === "all"} onClick={() => setRepoFilter("all")} />
                      <FilterChip label={t("selected")} active={repoFilter === "selected"} onClick={() => setRepoFilter("selected")} />
                      <FilterChip label={t("available")} active={repoFilter === "unselected"} onClick={() => setRepoFilter("unselected")} />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => selectRepos("all")} className="button-secondary-terminal px-4 py-2 text-xs uppercase tracking-[0.22em]">
                      {t("selectAll")}
                    </button>
                    <button type="button" onClick={() => selectRepos("none")} className="button-secondary-terminal px-4 py-2 text-xs uppercase tracking-[0.22em]">
                      {t("clear")}
                    </button>
                    <button type="button" onClick={() => selectFilteredRepos("all")} className="button-secondary-terminal px-4 py-2 text-xs uppercase tracking-[0.22em]">
                      {t("selectFiltered")}
                    </button>
                    <button type="button" onClick={() => selectFilteredRepos("none")} className="button-secondary-terminal px-4 py-2 text-xs uppercase tracking-[0.22em]">
                      {t("clearFiltered")}
                    </button>
                  </div>

                  {reposLoading ? (
                    <div className="rounded-[1.3rem] ops-surface-deep p-4 text-sm text-muted-foreground">{t("resolvingAccessibleRepositories")}</div>
                  ) : reposError ? (
                    <div className="rounded-[1.3rem] ops-surface-deep p-4 text-sm text-destructive">{t("failedAccessibleRepositories")}</div>
                  ) : repos.length === 0 ? (
                    <div className="rounded-[1.3rem] ops-surface-deep p-4 text-sm text-muted-foreground">{t("noAccessiblePublicRepositories")}</div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid gap-3 md:grid-cols-3">
                        <RepoCounter label={t("filtered")} value={filteredRepos.length} />
                        <RepoCounter label={t("selected")} value={selectedCount} tone={selectedCount > 0 ? "success" : "neutral"} />
                        <RepoCounter label={t("featured")} value={primaryRepo ? 1 : 0} tone={primaryRepo ? "success" : "neutral"} />
                      </div>

                      <div className="flex items-center justify-between gap-4 rounded-[1.3rem] ops-surface-deep px-4 py-3 text-sm text-muted-foreground">
                        <span>{`${filteredRepos.length} ${t("results")}`}</span>
                        <span>{`${selectedRepos.length} ${t("selected")}`}</span>
                      </div>

                      <div className="max-h-[36rem] space-y-2.5 overflow-auto pr-1">
                        {filteredRepos.map((repo) => {
                        const isSelected = selectedRepos.includes(repo.fullName);
                        const isFeatured = primaryRepo === repo.fullName;

                        return (
                          <div
                            key={repo.id}
                            className={cn(
                              "rounded-[1.35rem] p-4",
                              isSelected
                                ? "bg-primary/[0.07] shadow-[inset_0_0_0_1px_rgba(0,255,65,0.14)]"
                                : "ops-surface-deep",
                            )}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <button type="button" onClick={() => toggleRepo(repo.fullName)} className="min-w-0 flex-1 text-left">
                                <div className="flex items-center gap-3">
                                  <span
                                    className={cn(
                                      "flex h-8 w-8 items-center justify-center rounded-full",
                                      isSelected
                                        ? "bg-primary/15 text-primary"
                                        : "bg-white/5 text-foreground/35",
                                    )}
                                  >
                                    {isSelected ? <ShieldCheck size={13} /> : <Github size={13} />}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="truncate font-semibold">{repo.fullName}</p>
                                    <p className="mt-1 truncate text-sm text-muted-foreground">
                                      {repo.description || t("noDescription")}
                                    </p>
                                  </div>
                                </div>
                              </button>

                              <div className="flex shrink-0 items-center gap-2">
                                <StatusPill tone="neutral">{t("publicLabel")}</StatusPill>
                                <button
                                  type="button"
                                  disabled={!isSelected}
                                  onClick={() => setPrimaryRepo(repo.fullName)}
                                  className={cn(
                                    "inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] disabled:opacity-40",
                                    isFeatured
                                      ? "bg-secondary/12 text-secondary"
                                      : "bg-white/5 text-foreground/45",
                                  )}
                                >
                                  <Star size={11} />
                                  {isFeatured ? t("featured") : t("setFeatured")}
                                </button>
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                              <span>{repo.language ?? t("unspecifiedStack")}</span>
                              <span>{`${repo.archived ? t("archived") : t("active")} | ${t("updated")} ${formatDate(repo.updatedAt, settings.lang)}`}</span>
                            </div>
                          </div>
                        );
                        })}

                        {filteredRepos.length === 0 ? (
                          <div className="rounded-[1.3rem] ops-surface-deep p-5 text-sm leading-6 text-muted-foreground">
                            {t("noPublicRepoMatchesFilter")}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-[1.3rem] ops-surface-deep p-5 text-sm leading-6 text-muted-foreground">
                  {t("connectTokenToListRepos")}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {overview?.repos.map((entry) => (
                <div key={entry.repo.id} className="flex items-center justify-between gap-4 rounded-[1.3rem] ops-surface-deep p-4">
                  <div>
                    <p className="font-semibold">{entry.repo.fullName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{entry.repo.description || t("noRepositoryDescriptionSnapshot")}</p>
                  </div>
                  <StatusPill tone={entry.repo.fullName === manifest.featuredRepo ? "success" : "neutral"}>
                    {entry.repo.fullName === manifest.featuredRepo ? t("featured") : t("tracked")}
                  </StatusPill>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ControlMetric({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  hint: string;
  tone?: "neutral" | "success";
}) {
  return (
    <div className={cn("rounded-[1.5rem] ops-surface-soft px-4 py-4", tone === "success" && "shadow-[inset_0_0_0_1px_rgba(0,255,65,0.12)]")}>
      <p className="terminal-label">{label}</p>
      <p className={cn("mt-3 text-3xl font-black tracking-tight text-foreground", tone === "success" && "text-primary")}>{value}</p>
      <p className="mt-2 truncate text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function RepoCounter({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  tone?: "neutral" | "success";
}) {
  return (
    <div className={cn("rounded-[1.2rem] ops-surface-deep px-4 py-3", tone === "success" && "shadow-[inset_0_0_0_1px_rgba(0,255,65,0.12)]")}>
      <p className="terminal-label">{label}</p>
      <p className={cn("mt-2 text-lg font-semibold text-foreground", tone === "success" && "text-primary")}>{value}</p>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active ? "rounded-full bg-primary/12 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-primary" : "rounded-full bg-black/18 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/45"}
    >
      {label}
    </button>
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
      <div className="mt-3 flex gap-3">
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
