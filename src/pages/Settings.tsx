import { useRef, type ChangeEvent, type ReactNode } from "react";
import { useApp } from "@/contexts/AppContext";
import { useSnapshotManifest } from "@/hooks/useGitHub";

export default function SettingsPage() {
  const { settings, updateSettings } = useApp();
  const { data: manifest } = useSnapshotManifest();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const themes = [
    { value: "dark", label: "Semantic Dark" },
    { value: "golden", label: "Golden Audit" },
    { value: "emerald", label: "Emerald Console" },
  ] as const;

  const languages = [
    { value: "en", label: "English" },
    { value: "pt", label: "Portugues (BR)" },
    { value: "es", label: "Espanol" },
  ] as const;

  const exportManifest = () => {
    if (!manifest) return;
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "push-snapshot-manifest.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const importSettings = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    file.text().then((raw) => {
      const parsed = JSON.parse(raw);
      if (parsed.theme || parsed.lang || parsed.pollingInterval) {
        updateSettings(parsed);
      }
    }).catch(() => undefined);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-secondary">Preferences and local mode</p>
        <h1 className="mt-3 text-fluid-4xl font-headline font-bold">Settings</h1>
      </div>

      <section className="grid gap-6 lg:grid-cols-[1fr,1.1fr]">
        <div className="space-y-6">
          <Panel title="Theme">
            <div className="flex flex-wrap gap-3">
              {themes.map((theme) => (
                <button
                  key={theme.value}
                  onClick={() => updateSettings({ theme: theme.value })}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    settings.theme === theme.value ? "bg-primary text-primary-foreground" : "bg-surface-container-low text-muted-foreground"
                  }`}
                >
                  {theme.label}
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Language">
            <div className="flex flex-wrap gap-3">
              {languages.map((language) => (
                <button
                  key={language.value}
                  onClick={() => updateSettings({ lang: language.value })}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    settings.lang === language.value ? "bg-primary text-primary-foreground" : "bg-surface-container-low text-muted-foreground"
                  }`}
                >
                  {language.label}
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Snapshot export">
            <div className="flex flex-wrap gap-3">
              <button onClick={exportManifest} className="rounded-full bg-surface-container-low px-4 py-2 text-sm font-semibold text-foreground">
                Export manifest
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="rounded-full bg-surface-container-low px-4 py-2 text-sm font-semibold text-foreground">
                Import local preferences
              </button>
              <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={importSettings} />
            </div>
          </Panel>
        </div>

        <Panel title="Local secure sync">
          <ol className="space-y-4 text-sm leading-7 text-muted-foreground">
            <li>1. Create `main/.env.local` from `.env.example` and set `GH_STATS_TOKEN` or `GITHUB_TOKEN`.</li>
            <li>2. Run `npm run data:sync` to regenerate the snapshot JSON without exposing the token to the browser bundle.</li>
            <li>3. Run `npm run dev` or `npm run dev:snapshot` to inspect the new dataset locally.</li>
            <li>4. For public GitHub Pages, store the same token only as a repository secret used by the Actions workflow.</li>
          </ol>
          <div className="mt-6 rounded-2xl bg-surface-container-low p-5 text-sm">
            <p className="font-semibold text-foreground">Current snapshot</p>
            <p className="mt-2 text-muted-foreground">Generated: {manifest?.status.generatedAt ? new Date(manifest.status.generatedAt).toLocaleString() : "pending"}</p>
            <p className="text-muted-foreground">Mode: {manifest?.status.dataMode ?? "pending"}</p>
            <p className="text-muted-foreground">Origin: {manifest?.status.generatedBy ?? "pending"}</p>
          </div>
        </Panel>
      </section>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[1.75rem] bg-surface-container p-6">
      <p className="text-xs uppercase tracking-[0.26em] text-muted-foreground">{title}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}
