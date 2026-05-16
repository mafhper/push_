import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
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
  const selectionBootstrapRef = useRef<string | null>(null);

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

    const sessionKey = `${session.username}:${session.authenticatedAt}`;
    const isFreshSession = selectionBootstrapRef.current !== sessionKey;
    let nextSelected = selectedRepos.filter((repo) => accessibleRepoNames.has(repo));

    if (isFreshSession && nextSelected.length === 0) {
      nextSelected = repos.map((repo) => repo.fullName);
    }

    if (nextSelected.length !== selectedRepos.length) {
      setSelectedRepos(nextSelected);
    }

    if (primaryRepo && !accessibleRepoNames.has(primaryRepo)) {
      setPrimaryRepo(nextSelected[0] ?? repos[0]?.fullName ?? null);
      selectionBootstrapRef.current = sessionKey;
      return;
    }

    if (!primaryRepo && nextSelected.length > 0) {
      setPrimaryRepo(nextSelected[0]);
    }

    selectionBootstrapRef.current = sessionKey;
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

  useEffect(() => {
    if (!session) {
      selectionBootstrapRef.current = null;
    }
  }, [session]);

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

    if (!viewer || !viewer.login) {
      const errorKey = viewer?.error === "invalid_format" ? "tokenFormatError"
        : viewer?.error === "rate_limited" ? "rateLimitError"
        : viewer?.error === "invalid_token" ? "invalidToken"
        : "connectionError";
      setConnectError(t(errorKey));
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
    <div className="h-full overflow-y-auto px-6 py-8 md:px-8">
      <div className="mx-auto max-w-7xl space-y-10">
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
