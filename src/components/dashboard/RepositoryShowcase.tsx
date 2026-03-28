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
import { useApp } from "@/contexts/useApp";
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
  const { t } = useApp();
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
  const rankedItems = useMemo(() => items.slice(0, 6), [items]);
  const hiddenCount = Math.max(items.length - rankedItems.length, 0);

  if (!activeItem) {
    return <>{emptyState ?? null}</>;
  }

  function handleBlurCapture(event: FocusEvent<HTMLDivElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setIsInteracting(false);
  }

  return (
    <div
      className="space-y-4"
      onMouseEnter={() => setIsInteracting(true)}
      onMouseLeave={() => setIsInteracting(false)}
      onFocusCapture={() => setIsInteracting(true)}
      onBlurCapture={handleBlurCapture}
    >
      <article className="overflow-hidden rounded-[2.15rem] ops-surface">
        <div className="grid gap-6 p-6 lg:p-8 xl:grid-cols-[minmax(0,1.25fr)_21rem]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <StatusPill tone={activeItem.statusTone}>{activeItem.statusLabel}</StatusPill>
                <span className="rounded-full bg-white/[0.04] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/52">
                  {t("spotlightSlot", {
                    current: String((activeIndex === -1 ? 0 : activeIndex) + 1).padStart(2, "0"),
                    total: String(items.length).padStart(2, "0"),
                  })}
                </span>
                <span className="rounded-full bg-black/18 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/42">
                  {activeItem.lastActivityLabel}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setRotationPaused((value) => !value)}
                aria-pressed={rotationPaused}
                className="inline-flex items-center gap-2 rounded-full bg-black/22 px-3 py-2 text-[11px] font-semibold text-foreground/72 transition-colors hover:bg-white/[0.05] hover:text-primary"
              >
                {rotationPaused ? <Play size={13} /> : <Pause size={13} />}
                {rotationPaused ? t("resumeRotation") : t("pauseRotation")}
              </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)_11rem]">
              <ProjectImage
                owner={activeItem.owner}
                repo={activeItem.name}
                defaultBranch={activeItem.defaultBranch}
                language={activeItem.imageLanguage ?? activeItem.language}
                className="h-24 w-24 rounded-[1.8rem] bg-black/30 lg:h-28 lg:w-28"
              />

              <div className="min-w-0 space-y-4">
                <div className="space-y-2">
                  <p className="terminal-label">{activeItem.fullName}</p>
                  <h3 className="font-headline text-fluid-3xl font-black tracking-tight">{activeItem.name}</h3>
                </div>

                <div className="flex flex-wrap gap-2">
                  <MetaToken>{activeItem.defaultBranch}</MetaToken>
                  <MetaToken>{activeItem.language}</MetaToken>
                  <MetaToken>{activeItem.owner}</MetaToken>
                </div>

                <p className="max-w-3xl text-sm leading-6 text-foreground/68">{activeItem.description}</p>
              </div>

              <div className="rounded-[1.6rem] ops-surface-deep px-4 py-4 text-left lg:text-right">
                <p className="terminal-label">{activeItem.scoreLabel}</p>
                <p className="mt-2 text-4xl font-black tracking-tight text-primary">{activeItem.scoreValue}</p>
                <Link
                  to={activeItem.route}
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary/[0.1] px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/[0.16]"
                >
                  {t("openDetail")}
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {activeItem.spotlightMetrics.map((metric) => (
                <MetricSurface key={`${activeItem.id}-${metric.label}`} metric={metric} />
              ))}
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="rounded-[1.6rem] ops-surface-deep p-5">
                <p className="terminal-label">{t("repoQuickRead")}</p>
                <p className="mt-3 text-sm leading-6 text-foreground/74">{activeItem.summary}</p>
              </div>

              <div className="rounded-[1.6rem] ops-surface-soft p-5">
                <p className="terminal-label">{t("rotationState")}</p>
                <p className="mt-3 text-lg font-semibold text-foreground">
                  {rotationPaused ? t("pausedState") : isInteracting ? t("waitingState") : t("live")}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {rotationPaused ? t("rotationPausedBody") : t("rotationLiveBody")}
                </p>
              </div>
            </div>
          </div>

          <aside className="hidden rounded-[1.9rem] ops-surface-deep p-5 xl:block">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="terminal-label">{t("priorityList")}</p>
                <p className="mt-2 text-sm text-muted-foreground">{t("priorityListBody")}</p>
              </div>
              <RefreshCw size={16} className="text-primary/65" />
            </div>

            <div className="mt-4 space-y-2.5">
              {rankedItems.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveId(item.id)}
                  className={cn(
                    "w-full rounded-[1.35rem] px-4 py-3.5 text-left transition-all",
                    item.id === activeItem.id
                      ? "bg-primary/[0.09] shadow-[inset_0_0_0_1px_rgba(0,255,65,0.14)]"
                      : "bg-white/[0.025] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] hover:bg-white/[0.04]",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/32">
                          #{String(index + 1).padStart(2, "0")}
                        </span>
                        <StatusPill tone={item.statusTone}>{item.statusLabel}</StatusPill>
                      </div>
                      <p className="mt-2 truncate text-sm font-semibold text-foreground">{item.name}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{item.lastActivityLabel}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="terminal-label">{item.scoreLabel}</p>
                      <p className="mt-1 text-base font-black text-primary">{item.scoreValue}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {hiddenCount > 0 ? (
              <div className="mt-4 rounded-[1.2rem] bg-black/18 px-4 py-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
                <p className="text-xs text-muted-foreground">
                  {t("moreReposAvailable", { count: hiddenCount })}
                </p>
              </div>
            ) : null}
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

function MetricSurface({ metric }: { metric: ShowcaseMetric }) {
  const icon =
    metric.label.toLowerCase().includes("alert")
      ? ShieldAlert
      : metric.label.toLowerCase().includes("workflow") || metric.label.toLowerCase().includes("ci")
        ? ChartColumnIncreasing
        : metric.label.toLowerCase().includes("stale") || metric.label.toLowerCase().includes("updated") || metric.label.toLowerCase().includes("push")
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
    <div className={cn("rounded-[1.2rem] px-4 py-3.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]", toneClass)}>
      <div className="flex items-center gap-2">
        <Icon size={13} />
        <p className="terminal-label text-current/80">{metric.label}</p>
      </div>
      <p className="mt-2 text-lg font-black tracking-tight text-foreground">{metric.value}</p>
    </div>
  );
}

function MetaToken({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-white/[0.04] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/48">
      {children}
    </span>
  );
}
