import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Github, KeyRound, LoaderCircle, Search, ShieldCheck, ShieldOff, Star } from "lucide-react";
import { EmptyPanel, SectionHeading, StatusPill } from "@/components/site/TerminalPrimitives";
import { LOCAL_SYNC_DOC, isLocalSecureRuntime } from "@/config/site";
import { useApp } from "@/contexts/useApp";
import { useDashboardSnapshot, useRateLimit, useRepos, useSnapshotManifest } from "@/hooks/useGitHub";
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
    return <EmptyPanel title="Loading settings" body="Resolving runtime metadata and repository controls." />;
  }

  async function handleConnect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedToken = tokenInput.trim();
    if (!trimmedToken) {
      setConnectError("Informe um token GitHub valido para continuar.");
      return;
    }

    setIsConnecting(true);
    setConnectError(null);

    const viewer = await validateToken(trimmedToken);
    setIsConnecting(false);

    if (!viewer) {
      setConnectError("Nao foi possivel validar esse token. Verifique o escopo e tente novamente.");
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
        kicker={localSecureMode ? "Local Secure Mode" : "Public Pages Runtime"}
        title="Settings and repository control"
        body={
          localSecureMode
            ? "Conecte seu token GitHub apenas no localhost para descobrir os repositorios publicos acessiveis e definir quais entram no dashboard. O Pages publicado continua sem credenciais no browser."
            : "Esta versao publicada consome somente snapshots estaticos. O fluxo autenticado para descoberta e selecao de repositorios existe apenas no localhost."
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl surface-panel p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-headline text-2xl font-bold">GitHub access</h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
                {localSecureMode
                  ? "O token habilita apenas a sessao local. Nenhuma credencial vai para o bundle, para o Pages ou para o armazenamento remoto. A chave fica apenas em memoria e e descartada ao recarregar a aba ou desconectar."
                  : "No Pages o token nao e aceito no browser. Use localhost para autenticar e decidir quais repositorios deseja exibir."}
              </p>
            </div>
            <StatusPill tone={localSecureMode ? (session ? "success" : "warning") : "neutral"}>
              {localSecureMode ? (session ? "Local Auth" : "Awaiting Token") : "Snapshot Only"}
            </StatusPill>
          </div>

          {localSecureMode ? (
            <div className="mt-6 space-y-6">
              <div className="rounded-2xl bg-black/18 p-4">
                <div className="flex items-center gap-3">
                  {session?.avatarUrl ? (
                    <img src={session.avatarUrl} alt={session.username} className="h-12 w-12 rounded-full object-cover ring-1 ring-white/10" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-primary">
                      <Github size={18} />
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Current identity</p>
                    <p className="text-lg font-semibold">{session ? `@${session.username}` : "Nenhuma sessao ativa"}</p>
                  </div>
                </div>
              </div>

              <form className="space-y-4" onSubmit={handleConnect}>
                <label className="block">
                  <span className="terminal-label">GitHub token</span>
                  <div className="mt-3 flex gap-3">
                    <div className="relative flex-1">
                      <KeyRound className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-foreground/35" size={15} />
                      <input
                        type="password"
                        autoComplete="off"
                        value={tokenInput}
                        onChange={(event) => setTokenInput(event.target.value)}
                        placeholder={session ? "Cole um novo token para trocar a sessao atual" : "Cole um GitHub Personal Access Token"}
                        className="h-12 w-full rounded-2xl border border-white/6 bg-black/18 pl-11 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-foreground/30 focus:border-primary/35"
                      />
                    </div>
                    <button type="submit" disabled={isConnecting} className="button-primary-terminal px-5 py-3 text-sm disabled:opacity-60">
                      {isConnecting ? <LoaderCircle size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
                      {session ? "Atualizar token" : "Conectar"}
                    </button>
                  </div>
                </label>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-black/18 p-4">
                  <p className="text-sm text-foreground/75">Token is memory-only in this tab. Reloading the page clears the session.</p>

                  {session ? (
                    <button type="button" onClick={handleDisconnect} className="button-secondary-terminal px-4 py-2 text-xs uppercase tracking-[0.22em]">
                      <ShieldOff size={14} />
                      Disconnect
                    </button>
                  ) : null}
                </div>

                {connectError ? <p className="text-sm text-destructive">{connectError}</p> : null}
              </form>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl bg-black/18 p-5 text-sm leading-7 text-muted-foreground">
              O modo publicado permanece deliberadamente sem entrada de token. Se quiser descobrir seus repositorios e controlar a selecao em tempo real, rode a aplicacao no localhost.
            </div>
          )}
        </section>

        <section className="rounded-3xl surface-panel p-6">
          <h2 className="font-headline text-2xl font-bold">Runtime status</h2>
          <div className="mt-6 space-y-4">
            <StatusLine label="Snapshot generated" value={new Date(manifest.status.generatedAt).toLocaleString()} />
            <StatusLine label="Snapshot source" value={manifest.status.generatedBy} />
            <StatusLine
              label="Current mode"
              value={localSecureMode ? (session ? "local-authenticated" : "localhost-public") : "github-pages"}
              highlighted={Boolean(session)}
            />
            <StatusLine label="Visible repos" value={String(selectedRepoCount)} highlighted={selectedRepoCount > 0} />
            {rateLimit ? <StatusLine label="Rate limit" value={`${rateLimit.remaining}/${rateLimit.limit}`} highlighted={Boolean(session)} /> : null}
            <StatusLine label="Featured repo" value={featuredRepoLabel} highlighted={Boolean(primaryRepo)} />
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
        <section className="rounded-3xl surface-panel p-6">
          <h2 className="font-headline text-2xl font-bold">Interface preferences</h2>
          <div className="mt-6 space-y-5">
            <PreferenceToggle
              label="Theme"
              options={[
                { value: "terminal", label: "Terminal" },
                { value: "contrast", label: "Contrast" },
              ]}
              current={settings.theme}
              onSelect={(value) => updateSettings({ theme: value as typeof settings.theme })}
            />

            <PreferenceToggle
              label="Density"
              options={[
                { value: "balanced", label: "Balanced" },
                { value: "dense", label: "Dense" },
              ]}
              current={settings.dashboardDensity}
              onSelect={(value) => updateSettings({ dashboardDensity: value as typeof settings.dashboardDensity })}
            />
          </div>

          <div className="mt-8 space-y-4">
            <h3 className="font-headline text-xl font-bold">Runbook</h3>
            {LOCAL_SYNC_DOC.map((step) => (
              <div key={step} className="rounded-2xl bg-black/18 p-4 text-sm leading-7 text-foreground/80">
                {step}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl surface-panel p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-headline text-2xl font-bold">
                {localSecureMode ? "Available repositories" : "Tracked repositories"}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
                {localSecureMode
                  ? "Descubra apenas os repositorios publicos que o token enxerga e marque os que devem entrar no dashboard. O destaque principal tambem e definido aqui."
                  : "No Pages exibimos apenas o conjunto que entrou no snapshot publicado."}
              </p>
            </div>

            {localSecureMode ? (
              session ? <StatusPill tone="success">{repos.length} repos found</StatusPill> : <StatusPill tone="warning">Awaiting token</StatusPill>
            ) : (
              <StatusPill tone="neutral">{overview?.repos.length ?? 0} tracked</StatusPill>
            )}
          </div>

          {localSecureMode ? (
            <div className="mt-6 space-y-5">
              {session ? (
                <>
                  <div className="flex flex-wrap gap-3">
                    <div className="relative min-w-[18rem] flex-1">
                      <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-foreground/30" size={15} />
                      <input
                        type="search"
                        value={repoQuery}
                        onChange={(event) => setRepoQuery(event.target.value)}
                        placeholder="Search by name, description or stack"
                        className="h-11 w-full rounded-2xl border border-white/6 bg-black/18 pl-11 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-foreground/30 focus:border-primary/35"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={() => selectRepos("all")} className="button-secondary-terminal px-4 py-2 text-xs uppercase tracking-[0.22em]">
                      Select all
                    </button>
                    <button type="button" onClick={() => selectRepos("none")} className="button-secondary-terminal px-4 py-2 text-xs uppercase tracking-[0.22em]">
                      Clear
                    </button>
                    <button type="button" onClick={() => selectFilteredRepos("all")} className="button-secondary-terminal px-4 py-2 text-xs uppercase tracking-[0.22em]">
                      Select filtered
                    </button>
                    <button type="button" onClick={() => selectFilteredRepos("none")} className="button-secondary-terminal px-4 py-2 text-xs uppercase tracking-[0.22em]">
                      Clear filtered
                    </button>
                    <FilterChip label="All" active={repoFilter === "all"} onClick={() => setRepoFilter("all")} />
                    <FilterChip label="Selected" active={repoFilter === "selected"} onClick={() => setRepoFilter("selected")} />
                    <FilterChip label="Available" active={repoFilter === "unselected"} onClick={() => setRepoFilter("unselected")} />
                  </div>

                  {reposLoading ? (
                    <div className="rounded-2xl bg-black/18 p-4 text-sm text-muted-foreground">Resolving accessible repositories...</div>
                  ) : reposError ? (
                    <div className="rounded-2xl bg-black/18 p-4 text-sm text-destructive">Falha ao carregar os repositorios acessiveis para a sessao atual.</div>
                  ) : repos.length === 0 ? (
                    <div className="rounded-2xl bg-black/18 p-4 text-sm text-muted-foreground">Esse token foi validado, mas nao retornou nenhum repositorio publico acessivel.</div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-4 rounded-2xl bg-black/18 px-4 py-3 text-sm text-muted-foreground">
                        <span>{filteredRepos.length} results</span>
                        <span>{selectedRepos.length} selected</span>
                      </div>

                      <div className="max-h-[34rem] space-y-3 overflow-auto pr-1">
                        {filteredRepos.map((repo) => {
                        const isSelected = selectedRepos.includes(repo.fullName);
                        const isFeatured = primaryRepo === repo.fullName;

                        return (
                          <div
                            key={repo.id}
                            className={
                              isSelected
                                ? "rounded-2xl border border-primary/25 bg-primary/[0.07] p-4 shadow-[0_0_0_1px_rgba(0,255,65,0.12)]"
                                : "rounded-2xl border border-white/6 bg-black/18 p-4"
                            }
                          >
                            <div className="flex items-start justify-between gap-4">
                              <button type="button" onClick={() => toggleRepo(repo.fullName)} className="min-w-0 flex-1 text-left">
                                <div className="flex items-center gap-3">
                                  <span
                                    className={
                                      isSelected
                                        ? "flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary"
                                        : "flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-foreground/35"
                                    }
                                  >
                                    {isSelected ? <ShieldCheck size={13} /> : <Github size={13} />}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="truncate font-semibold">{repo.fullName}</p>
                                    <p className="mt-1 truncate text-sm text-muted-foreground">
                                      {repo.description || "No description provided on GitHub."}
                                    </p>
                                  </div>
                                </div>
                              </button>

                              <div className="flex shrink-0 items-center gap-2">
                                <StatusPill tone="neutral">Public</StatusPill>
                                <button
                                  type="button"
                                  disabled={!isSelected}
                                  onClick={() => setPrimaryRepo(repo.fullName)}
                                  className={
                                    isFeatured
                                      ? "inline-flex items-center gap-2 rounded-full bg-secondary/12 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-secondary"
                                      : "inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/45 disabled:opacity-40"
                                  }
                                >
                                  <Star size={11} />
                                  {isFeatured ? "Featured" : "Set featured"}
                                </button>
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                              <span>{repo.language ?? "Unspecified stack"}</span>
                              <span>{repo.archived ? "Archived" : "Active"} · Updated {new Date(repo.updatedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        );
                        })}

                        {filteredRepos.length === 0 ? (
                          <div className="rounded-2xl bg-black/18 p-5 text-sm leading-7 text-muted-foreground">
                            Nenhum repositorio publico corresponde ao filtro atual.
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-2xl bg-black/18 p-5 text-sm leading-7 text-muted-foreground">
                  Conecte um token GitHub acima para listar os repositorios acessiveis e escolher quais entram na visualizacao.
                </div>
              )}
            </div>
          ) : (
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
          )}
        </section>
      </div>
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
            className={current === option.value ? "rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" : "rounded-xl bg-black/18 px-4 py-2 text-sm font-semibold text-foreground/70"}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
