import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Github, KeyRound, LoaderCircle, ShieldCheck, Star, LogOut, Moon, Sun } from "lucide-react";
import { isLocalSecureRuntime } from "@/config/site";
import { useApp } from "@/contexts/useApp";
import { useDashboardSnapshot, useRateLimit, useRepos, useSnapshotManifest } from "@/hooks/useGitHub";
import { formatDateTime } from "@/i18n";
import { isZeroMetricValue } from "@/lib/metric-state";
import { cn } from "@/lib/utils";
import { diagnoseToken, validateToken } from "@/services/github";
import type { DataDetailMode, Theme } from "@/types";

export default function SettingsPage() {
  const { settings, updateSettings, session, setSession, primaryRepo, setPrimaryRepo, selectedRepos, setSelectedRepos, t } = useApp();
  const localSecureMode = isLocalSecureRuntime();
  const { data: manifest } = useSnapshotManifest();
  const { data: overview } = useDashboardSnapshot();
  const { data: repos = [], isLoading: reposLoading } = useRepos();
  const { data: rateLimit } = useRateLimit();
  const [tokenInput, setTokenInput] = useState("");
  const [connectError, setConnectError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [repoQuery, setRepoQuery] = useState("");
  const [repoFilter, setRepoFilter] = useState<"all" | "selected" | "unselected">("all");

  useEffect(() => {
    if (!localSecureMode || !session?.token || session.diagnostics) return;
    let cancelled = false;
    diagnoseToken(session.token).then((diagnostics) => {
      if (!cancelled) {
        setSession({ ...session, diagnostics });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [localSecureMode, session, setSession]);

  const selectedRepoCount = localSecureMode && session ? selectedRepos.length : (overview?.repos.length ?? 0);
  const featuredRepoLabel = localSecureMode ? (primaryRepo ?? "none") : (manifest?.featuredRepo ?? "none");

  const filteredRepos = useMemo(() => {
    const q = repoQuery.trim().toLowerCase();
    return repos
      .filter(r => {
        if (repoFilter === "selected") return selectedRepos.includes(r.fullName);
        if (repoFilter === "unselected") return !selectedRepos.includes(r.fullName);
        return true;
      })
      .filter(r => !q || `${r.fullName} ${r.description ?? ""} ${r.language ?? ""}`.toLowerCase().includes(q))
      .sort((a, b) => {
        const aF = a.fullName === primaryRepo ? 1 : 0;
        const bF = b.fullName === primaryRepo ? 1 : 0;
        if (aF !== bF) return bF - aF;
        const aS = selectedRepos.includes(a.fullName) ? 1 : 0;
        const bS = selectedRepos.includes(b.fullName) ? 1 : 0;
        return aS !== bS ? bS - aS : a.fullName.localeCompare(b.fullName);
      });
  }, [primaryRepo, repoFilter, repoQuery, repos, selectedRepos]);

  if (!manifest) {
    return (
      <div className="flex h-full items-center justify-center gap-3 text-body text-foreground-subtle">
        <LoaderCircle size={16} className="animate-spin" />
        {t("loadingSettings")}
      </div>
    );
  }

  async function handleConnect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = tokenInput.trim();
    if (!trimmed) { setConnectError(t("connectionError")); return; }
    setIsConnecting(true);
    setConnectError(null);
    const viewer = await validateToken(trimmed);
    setIsConnecting(false);
    if (!viewer || !viewer.login) {
      const key = viewer?.error === "invalid_format" ? "tokenFormatError"
        : viewer?.error === "rate_limited" ? "rateLimitError"
        : viewer?.error === "invalid_token" ? "invalidToken"
        : "connectionError";
      setConnectError(t(key)); return;
    }
    const diagnostics = await diagnoseToken(trimmed);
    setSession({ token: trimmed, username: viewer.login, avatarUrl: viewer.avatarUrl, authenticatedAt: new Date().toISOString(), diagnostics });
    setTokenInput("");
  }

  function handleDisconnect() {
    setSession(null); setSelectedRepos([]); setPrimaryRepo(null); setTokenInput(""); setConnectError(null);
  }

  function toggleRepo(fullName: string) {
    const next = selectedRepos.includes(fullName) ? selectedRepos.filter(r => r !== fullName) : [...selectedRepos, fullName];
    setSelectedRepos(next);
    if (!next.length) setPrimaryRepo(null);
    else if (!primaryRepo || !next.includes(primaryRepo)) setPrimaryRepo(next[0]);
  }

  return (
    <div className="h-full min-h-0 w-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-5 py-6 md:px-8 md:py-8 space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-display font-headline font-bold tracking-tight text-foreground">{t("repositoryControl")}</h1>
          <p className="text-body text-foreground-subtle mt-1">
            {localSecureMode ? t("connectLocalTokenBody") : t("snapshotOnlyBody")}
          </p>
        </div>

        {/* Control Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            label={t("visibleRepos")}
            value={selectedRepoCount}
            hint={t("currentDashboardSet")}
            highlight={selectedRepoCount > 0}
          />
          <MetricCard
            label={t("featuredRepo")}
            value={featuredRepoLabel === "none" ? t("none") : t("featured")}
            hint={featuredRepoLabel}
            highlight={featuredRepoLabel !== "none"}
          />
          <MetricCard
            label={t("mode")}
            value={localSecureMode ? (session ? t("live") : t("local")) : t("snapshotLabel")}
            hint={localSecureMode ? (session ? t("authenticatedSession") : t("awaitingToken")) : t("publishedSnapshot")}
            highlight={!!session}
          />
          <MetricCard
            label={t("rateLimit")}
            value={rateLimit ? `${rateLimit.remaining}` : "--"}
            hint={rateLimit ? `of ${rateLimit.limit}` : t("unavailable")}
            highlight={!!session}
          />
        </div>

        {/* GitHub Access + Runtime Status */}
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">

          {/* GitHub Access */}
          <section className="rounded-xl border border-border/60 bg-surface-1 shadow-sm p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-title font-headline font-semibold text-foreground">{t("githubAccess")}</h2>
                <p className="text-sm text-foreground-subtle mt-0.5">
                  {localSecureMode ? t("tokenSessionOnlyBody") : t("publishedRuntimeNoBrowserTokenBody")}
                </p>
              </div>
              <span className={cn(
                "text-micro font-semibold px-2 py-1 rounded-md shrink-0",
                localSecureMode && session && "bg-success/10 text-success",
                localSecureMode && !session && "bg-warning/10 text-warning",
                !localSecureMode && "bg-surface-3 text-foreground-subtle"
              )}>
                {localSecureMode ? (session ? t("localAuth") : t("awaitingTokenLabel")) : t("snapshotOnly")}
              </span>
            </div>

            {localSecureMode ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-lg border border-border/30 bg-surface-2/50 p-3">
                  {session?.avatarUrl ? (
                    <img src={session.avatarUrl} alt="" className="h-10 w-10 rounded-full ring-1 ring-border" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-3 text-primary"><Github size={16} /></div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-micro text-foreground-subtle">{t("currentIdentity")}</p>
                    <p className="text-body font-semibold text-foreground truncate">{session ? `@${session.username}` : t("noActiveSession")}</p>
                  </div>
                  {session && (
                    <button onClick={handleDisconnect} className="flex items-center gap-1 text-micro font-medium text-foreground-subtle hover:text-critical transition-colors">
                      <LogOut size={12} /> {t("disconnect")}
                    </button>
                  )}
                </div>

                <form onSubmit={handleConnect} className="space-y-3">
                  <div>
                    <label className="text-micro font-semibold text-foreground-subtle uppercase tracking-wider">{t("githubToken")}</label>
                    <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
                      <div className="relative flex-1">
                        <KeyRound size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground-subtle/40" />
                        <input
                          type="password" autoComplete="off"
                          value={tokenInput}
                          onChange={e => setTokenInput(e.target.value)}
                          placeholder={session ? t("pasteNewToken") : t("pastePersonalToken")}
                          className="h-10 w-full rounded-lg border border-border/60 bg-surface-2 pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-foreground-subtle/40 focus:border-primary/50 transition-colors"
                        />
                      </div>
                      <button type="submit" disabled={isConnecting} className="flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50">
                        {isConnecting ? <LoaderCircle size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                        {session ? t("updateToken") : t("connect")}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-lg border border-border/30 bg-surface-2/50 p-3">
                    <p className="text-sm text-foreground-subtle">{t("tokenMemoryOnlyBody")}</p>
                  </div>

                  {connectError && <p className="text-sm text-critical">{connectError}</p>}
                </form>
              </div>
            ) : (
              <div className="rounded-lg border border-border/30 bg-surface-2/50 p-4 text-sm text-foreground-subtle leading-relaxed">
                {t("publishedRuntimeNoBrowserTokenBody")}
              </div>
            )}
          </section>

          {/* Runtime Status */}
          <section className="rounded-xl border border-border/60 bg-surface-1 shadow-sm p-5 space-y-4">
            <div>
              <h2 className="text-title font-headline font-semibold text-foreground">{t("currentMode")}</h2>
            </div>
            <div className="space-y-2.5">
              <StatusLine label={t("publishedSnapshotLabel")} value={formatDateTime(manifest.status.generatedAt, settings.lang)} />
              <StatusLine label={t("snapshotSource")} value={manifest.status.generatedBy} />
              <StatusLine label={t("currentMode")} value={localSecureMode ? (session ? "local-authenticated" : "localhost-public") : "github-pages"} highlight={!!session} />
              <StatusLine label={t("visibleRepos")} value={String(selectedRepoCount)} highlight={selectedRepoCount > 0} />
              {rateLimit && <StatusLine label={t("rateLimit")} value={`${rateLimit.remaining}/${rateLimit.limit}`} highlight={!!session} />}
              <StatusLine label={t("featuredRepo")} value={featuredRepoLabel} highlight={Boolean(primaryRepo)} />
            </div>
          </section>
        </div>

        {/* Preferences */}
        <section className="rounded-xl border border-border/60 bg-surface-1 shadow-sm p-5 space-y-4">
          <div>
            <h2 className="text-title font-headline font-semibold text-foreground">{t("preferences")}</h2>
            <p className="text-sm text-foreground-subtle mt-0.5">{t("interfaceSettings")}</p>
          </div>
            <div className="flex flex-wrap gap-4">
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

        {localSecureMode && session?.diagnostics && (
          <section className="rounded-xl border border-border/60 bg-surface-1 p-5 shadow-sm">
            <h2 className="text-title font-headline font-semibold text-foreground">{t("tokenDiagnostics")}</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <StatusCard label={t("githubToken")} value={session.diagnostics.token === "valid" ? t("tokenValid") : t("tokenInvalid")} good={session.diagnostics.token === "valid"} />
              <StatusCard label={t("rateLimit")} value={session.diagnostics.rateLimit ? `${session.diagnostics.rateLimit.remaining}/${session.diagnostics.rateLimit.limit}` : t("unavailable")} good={Boolean(session.diagnostics.rateLimit)} />
              <StatusCard label="Dependabot" value={dependabotProbeLabel(session.diagnostics.dependabotProbe?.status, t)} good={session.diagnostics.dependabotProbe?.status === "available"} />
            </div>
            {session.diagnostics.dependabotProbe?.message && (
              <p className="mt-3 text-sm text-foreground-subtle">{session.diagnostics.dependabotProbe.message}</p>
            )}
          </section>
        )}

        {/* Repository Selection (only in local mode) */}
        {localSecureMode && session && (
          <section className="rounded-xl border border-border/60 bg-surface-1 shadow-sm p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-title font-headline font-semibold text-foreground">{t("repositoryControl")}</h2>
                <p className="text-sm text-foreground-subtle mt-0.5">
                  {selectedRepos.length} of {repos.length} selected
                </p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setSelectedRepos(repos.map(r => r.fullName)); setPrimaryRepo(repos[0]?.fullName ?? null); }} className="text-micro font-medium text-primary hover:text-primary/80 transition-colors px-2 py-1 rounded-md hover:bg-primary/10">
                  Select all
                </button>
                <button onClick={() => { setSelectedRepos([]); setPrimaryRepo(null); }} className="text-micro font-medium text-foreground-subtle hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-surface-2">
                  Deselect all
                </button>
              </div>
            </div>

            {/* Search + Filters */}
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <input
                type="text" value={repoQuery} onChange={e => setRepoQuery(e.target.value)}
                placeholder="Search repositories..."
                className="flex-1 h-9 rounded-lg border border-border/60 bg-surface-2 px-3 text-sm text-foreground outline-none placeholder:text-foreground-subtle/40 focus:border-primary/50 transition-colors"
              />
              <div className="flex gap-1 overflow-x-auto">
                {(["all", "selected", "unselected"] as const).map(f => (
                  <button key={f} onClick={() => setRepoFilter(f)}
                    className={cn(
                      "shrink-0 text-micro font-medium px-2.5 py-1.5 rounded-lg transition-colors",
                      repoFilter === f ? "bg-primary/10 text-primary" : "text-foreground-subtle hover:bg-surface-2 hover:text-foreground"
                    )}>
                    {f === "all" ? "All" : f === "selected" ? "Selected" : "Unselected"}
                  </button>
                ))}
              </div>
            </div>

            {/* Repo List */}
            <div className="max-h-80 overflow-y-auto space-y-1 rounded-lg border border-border/30">
              {filteredRepos.length > 0 ? filteredRepos.map(repo => {
                const isSelected = selectedRepos.includes(repo.fullName);
                const isFeatured = repo.fullName === primaryRepo;
                return (
                  <button key={repo.fullName} onClick={() => toggleRepo(repo.fullName)}
                    className={cn(
                      "flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-surface-2/60",
                      isSelected && !isFeatured && "bg-surface-2/40",
                      isFeatured && "bg-primary/[0.04]"
                    )}
                  >
                    <div className={cn(
                      "h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                      isSelected ? "border-primary bg-primary" : "border-border"
                    )}>
                      {isSelected && <div className="h-2 w-2 rounded-sm bg-primary-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-body font-medium text-foreground truncate block">{repo.fullName}</span>
                      {repo.description && <span className="text-micro text-foreground-subtle truncate block">{repo.description}</span>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {repo.language && <span className="text-[10px] text-foreground-subtle">{repo.language}</span>}
                      {isFeatured && <Star size={12} className="text-primary fill-primary" />}
                    </div>
                  </button>
                );
              }) : (
                <div className="px-4 py-8 text-center text-sm text-foreground-subtle italic">No repositories match this filter</div>
              )}
            </div>
          </section>
        )}

        <div className="h-4" />
      </div>
    </div>
  );
}

function MetricCard({ label, value, hint, highlight }: { label: string; value: string | number; hint: string; highlight?: boolean }) {
  const isZero = isZeroMetricValue(value);
  return (
    <div className={cn(
      "rounded-xl border bg-surface-1 shadow-sm px-4 py-3",
      highlight ? "border-primary/30" : "border-border/60",
      isZero && "border-border/35 bg-surface-1/45 shadow-none"
    )}>
      <p className="text-micro font-semibold text-foreground-subtle uppercase tracking-wider">{label}</p>
      <p className={cn(
        "text-title font-headline font-bold mt-0.5 tracking-tight",
        highlight && "text-primary",
        isZero && "text-foreground-subtle/45"
      )}>{value}</p>
      <p className="text-[10px] text-foreground-subtle/70 mt-0.5 truncate">{hint}</p>
    </div>
  );
}

function StatusLine({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-foreground-subtle">{label}</span>
      <span className={cn(
        "text-sm font-semibold truncate",
        highlight ? "text-primary" : "text-foreground"
      )}>
        {value}
      </span>
    </div>
  );
}

function StatusCard({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className={cn("rounded-lg border bg-surface-2/70 p-3", good ? "border-success/30" : "border-border/60")}>
      <p className="text-micro font-semibold uppercase tracking-wider text-foreground-subtle">{label}</p>
      <p className={cn("mt-1 text-sm font-semibold", good ? "text-success" : "text-foreground")}>{value}</p>
    </div>
  );
}

function dependabotProbeLabel(status: string | undefined, t: ReturnType<typeof useApp>["t"]) {
  if (status === "available") return t("dependabotAvailable");
  if (status === "forbidden") return t("dependabotForbidden");
  if (status === "not_found") return t("dependabotNotFound");
  if (status === "skipped") return t("dependabotSkipped");
  return t("dependabotUnavailableRuntime");
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
