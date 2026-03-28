import { useEffect, useMemo, useState, type FocusEvent } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  ChartColumnIncreasing,
  Clock3,
  GitBranch,
  Pause,
  Play,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { ProjectImage } from "@/components/ProjectImage";
import { StatusPill } from "@/components/site/TerminalPrimitives";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { cn } from "@/lib/utils";

type ShowcaseTone = "success" | "warning" | "critical" | "neutral";

export interface ShowcaseMetric {
  label: string;
  value: string;
  tone?: ShowcaseTone;
}

export interface ShowcaseItem {
  id: string;
  route: string;
  owner: string;
  name: string;
  fullName: string;
  description: string;
  defaultBranch: string;
  language: string;
  imageLanguage?: string | null;
  lastActivityLabel: string;
  statusLabel: string;
  statusTone: ShowcaseTone;
  scoreLabel: string;
  scoreValue: string;
  summary: string;
  spotlightMetrics: ShowcaseMetric[];
}

export function RepositoryShowcase({
  items,
  storageKey,
  emptyState,
}: {
  items: ShowcaseItem[];
  storageKey: string;
  emptyState?: React.ReactNode;
}) {
  const [activeId, setActiveId] = useLocalStorage<string | null>(storageKey, items[0]?.id ?? null);
  const [rotationPaused, setRotationPaused] = useLocalStorage<boolean>(`${storageKey}_rotation_paused`, false);
  const [isInteracting, setIsInteracting] = useState(false);

  useEffect(() => {
    if (!items.length) return;
    if (!activeId || !items.some((item) => item.id === activeId)) {
      setActiveId(items[0].id);
    }
  }, [activeId, items, setActiveId]);

  useEffect(() => {
    if (items.length <= 1 || rotationPaused || isInteracting) return;

    const interval = window.setInterval(() => {
      setActiveId((current) => {
        const currentIndex = items.findIndex((item) => item.id === current);
        const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % items.length;
        return items[nextIndex]?.id ?? items[0].id;
      });
    }, 9000);

    return () => window.clearInterval(interval);
  }, [isInteracting, items, rotationPaused, setActiveId]);

  const activeIndex = useMemo(() => items.findIndex((item) => item.id === activeId), [activeId, items]);
  const activeItem = items[activeIndex === -1 ? 0 : activeIndex];

  if (!activeItem) {
    return <>{emptyState ?? null}</>;
  }

  function handleBlurCapture(event: FocusEvent<HTMLDivElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setIsInteracting(false);
  }

  return (
    <div
      className="space-y-6"
      onMouseEnter={() => setIsInteracting(true)}
      onMouseLeave={() => setIsInteracting(false)}
      onFocusCapture={() => setIsInteracting(true)}
      onBlurCapture={handleBlurCapture}
    >
      <article className="overflow-hidden rounded-[2rem] border border-white/8 bg-[linear-gradient(135deg,rgba(10,10,10,0.96),rgba(18,18,18,0.92))] shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <div className="grid gap-8 p-6 xl:grid-cols-[minmax(0,1.3fr)_22rem] lg:p-8">
          <div className="space-y-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="flex min-w-0 gap-4">
                <ProjectImage
                  owner={activeItem.owner}
                  repo={activeItem.name}
                  defaultBranch={activeItem.defaultBranch}
                  language={activeItem.imageLanguage ?? activeItem.language}
                  className="h-20 w-20 rounded-[1.6rem] border border-white/10 bg-black/25 md:h-24 md:w-24"
                />
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusPill tone={activeItem.statusTone}>{activeItem.statusLabel}</StatusPill>
                    <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/55">
                      Rotation {String((activeIndex === -1 ? 0 : activeIndex) + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-headline text-fluid-3xl font-black tracking-tight">{activeItem.name}</h3>
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/48">
                      {activeItem.defaultBranch} / {activeItem.language}
                    </p>
                  </div>
                  <p className="max-w-3xl text-sm leading-7 text-muted-foreground">{activeItem.description}</p>
                </div>
              </div>

              <div className="rounded-[1.6rem] border border-primary/14 bg-primary/[0.06] px-5 py-4 text-left md:min-w-[10rem] md:text-right">
                <p className="terminal-label">{activeItem.scoreLabel}</p>
                <p className="mt-3 text-4xl font-black tracking-tight text-primary">{activeItem.scoreValue}</p>
                <button
                  type="button"
                  onClick={() => setRotationPaused((value) => !value)}
                  aria-pressed={rotationPaused}
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/18 px-3 py-2 text-[11px] font-semibold text-foreground/78 transition-colors hover:border-white/20 hover:text-primary"
                >
                  {rotationPaused ? <Play size={13} /> : <Pause size={13} />}
                  {rotationPaused ? "Resume rotation" : "Pause rotation"}
                </button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {activeItem.spotlightMetrics.map((metric) => (
                <MetricSurface key={`${activeItem.id}-${metric.label}`} metric={metric} emphasis />
              ))}
            </div>

            <div className="rounded-[1.6rem] border border-white/6 bg-white/[0.025] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-2">
                  <p className="terminal-label">Continuous detail stream</p>
                  <p className="text-sm leading-7 text-foreground/72">{activeItem.summary}</p>
                </div>
                <Link
                  to={activeItem.route}
                  className="inline-flex items-center gap-2 rounded-full border border-primary/18 bg-primary/[0.08] px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/[0.12]"
                >
                  Open project
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </div>

          <aside className="hidden rounded-[1.8rem] border border-white/6 bg-white/[0.025] p-5 xl:block">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="terminal-label">Queue priority</p>
                <p className="mt-2 text-sm text-muted-foreground">Problemas primeiro, atividade recente em seguida.</p>
              </div>
              <RefreshCw size={16} className="text-primary/70" />
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 rounded-[1.2rem] border border-white/6 bg-black/18 px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/48">
                {rotationPaused ? "Rotation paused" : isInteracting ? "Rotation waiting" : "Rotation live"}
              </p>
              <p className="text-xs text-muted-foreground">
                {items.length} ranked repo{items.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="mt-5 max-h-[30rem] space-y-3 overflow-y-auto pr-1">
              {items.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveId(item.id)}
                  className={cn(
                    "w-full rounded-[1.35rem] border px-4 py-4 text-left transition-all",
                    item.id === activeItem.id
                      ? "border-primary/25 bg-primary/[0.08] shadow-[0_0_0_1px_rgba(0,255,65,0.12)]"
                      : "border-white/6 bg-black/16 hover:border-white/12 hover:bg-white/[0.03]",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/35">
                          #{String(index + 1).padStart(2, "0")}
                        </span>
                        <StatusPill tone={item.statusTone}>{item.statusLabel}</StatusPill>
                      </div>
                      <p className="mt-3 truncate text-sm font-semibold text-foreground">{item.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.lastActivityLabel}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="terminal-label">{item.scoreLabel}</p>
                      <p className="mt-2 text-lg font-black text-primary">{item.scoreValue}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </aside>
        </div>
      </article>
    </div>
  );
}

export function RepositoryShowcaseSkeleton() {
  return (
    <article className="overflow-hidden rounded-[2rem] border border-white/8 bg-[linear-gradient(135deg,rgba(10,10,10,0.96),rgba(18,18,18,0.92))] shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
      <div className="grid gap-8 p-6 xl:grid-cols-[minmax(0,1.3fr)_22rem] lg:p-8">
        <div className="space-y-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="flex min-w-0 gap-4">
              <div className="h-20 w-20 rounded-[1.6rem] border border-white/10 bg-white/[0.05] md:h-24 md:w-24" />
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="h-7 w-28 rounded-full bg-white/[0.06]" />
                  <div className="h-7 w-24 rounded-full bg-white/[0.04]" />
                </div>
                <div className="space-y-2">
                  <div className="h-10 w-56 rounded-2xl bg-white/[0.07]" />
                  <div className="h-3 w-32 rounded-full bg-white/[0.05]" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-full rounded-full bg-white/[0.04]" />
                  <div className="h-4 w-4/5 rounded-full bg-white/[0.04]" />
                </div>
              </div>
            </div>

            <div className="rounded-[1.6rem] border border-primary/14 bg-primary/[0.04] px-5 py-4 md:min-w-[10rem]">
              <div className="ml-auto h-3 w-20 rounded-full bg-white/[0.05]" />
              <div className="mt-4 ml-auto h-10 w-24 rounded-2xl bg-white/[0.07]" />
              <div className="mt-4 ml-auto h-8 w-32 rounded-full bg-white/[0.05]" />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-[1.25rem] border border-white/6 bg-white/[0.04] p-4">
                <div className="h-3 w-20 rounded-full bg-white/[0.06]" />
                <div className="mt-4 h-6 w-24 rounded-full bg-white/[0.08]" />
              </div>
            ))}
          </div>

          <div className="rounded-[1.6rem] border border-white/6 bg-white/[0.025] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-2">
                <div className="h-3 w-32 rounded-full bg-white/[0.05]" />
                <div className="h-4 w-[28rem] max-w-full rounded-full bg-white/[0.04]" />
              </div>
              <div className="h-10 w-32 rounded-full bg-white/[0.06]" />
            </div>
          </div>
        </div>

        <aside className="hidden rounded-[1.8rem] border border-white/6 bg-white/[0.025] p-5 xl:block">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-2">
              <div className="h-3 w-24 rounded-full bg-white/[0.05]" />
              <div className="h-4 w-40 rounded-full bg-white/[0.04]" />
            </div>
            <div className="h-4 w-4 rounded-full bg-white/[0.06]" />
          </div>

          <div className="mt-4 h-12 rounded-[1.2rem] border border-white/6 bg-black/18" />

          <div className="mt-5 space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="rounded-[1.35rem] border border-white/6 bg-black/16 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-3 w-24 rounded-full bg-white/[0.05]" />
                    <div className="h-4 w-32 rounded-full bg-white/[0.06]" />
                    <div className="h-3 w-24 rounded-full bg-white/[0.04]" />
                  </div>
                  <div className="space-y-2">
                    <div className="ml-auto h-3 w-12 rounded-full bg-white/[0.05]" />
                    <div className="ml-auto h-5 w-14 rounded-full bg-white/[0.07]" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </article>
  );
}

function MetricSurface({ metric, emphasis = false }: { metric: ShowcaseMetric; emphasis?: boolean }) {
  const icon =
    metric.label.toLowerCase().includes("alert")
      ? ShieldAlert
      : metric.label.toLowerCase().includes("workflow") || metric.label.toLowerCase().includes("ci")
        ? ChartColumnIncreasing
        : metric.label.toLowerCase().includes("stale") || metric.label.toLowerCase().includes("updated")
          ? Clock3
          : metric.label.toLowerCase().includes("branch")
            ? GitBranch
            : AlertTriangle;

  const Icon = icon;
  const toneClass =
    metric.tone === "critical"
      ? "border-destructive/20 bg-destructive/[0.07] text-destructive"
      : metric.tone === "warning"
        ? "border-secondary/20 bg-secondary/[0.07] text-secondary"
        : metric.tone === "success"
          ? "border-primary/20 bg-primary/[0.07] text-primary"
          : "border-white/6 bg-black/18 text-foreground";

  return (
    <div className={cn("rounded-[1.25rem] border p-4", toneClass, emphasis && "bg-white/[0.04]")}>
      <div className="flex items-center gap-2">
        <Icon size={14} />
        <p className="terminal-label text-current/80">{metric.label}</p>
      </div>
      <p className="mt-3 text-lg font-black tracking-tight text-foreground">{metric.value}</p>
    </div>
  );
}
