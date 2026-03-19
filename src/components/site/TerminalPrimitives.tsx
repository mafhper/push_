import { cn } from "@/lib/utils";
import { ArrowRight, CircleAlert, ShieldCheck, TriangleAlert } from "lucide-react";
import type { PropsWithChildren, ReactNode } from "react";

export function SectionHeading({
  kicker,
  title,
  body,
  align = "left",
}: {
  kicker?: string;
  title: ReactNode;
  body?: ReactNode;
  align?: "left" | "center";
}) {
  return (
    <div className={cn("space-y-4", align === "center" && "mx-auto max-w-3xl text-center")}>
      {kicker ? <p className="section-kicker">{kicker}</p> : null}
      <div className="space-y-3">
        <h2 className="text-balance text-fluid-3xl font-black leading-[0.94]">{title}</h2>
        {body ? <p className="max-w-2xl text-base leading-7 text-muted-foreground">{body}</p> : null}
      </div>
    </div>
  );
}

export function StatusPill({
  tone,
  children,
}: PropsWithChildren<{ tone: "success" | "warning" | "critical" | "neutral" }>) {
  const icon =
    tone === "success" ? <ShieldCheck size={12} /> : tone === "warning" ? <TriangleAlert size={12} /> : tone === "critical" ? <CircleAlert size={12} /> : null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.22em]",
        tone === "success" && "bg-primary/10 text-primary",
        tone === "warning" && "bg-secondary/12 text-secondary",
        tone === "critical" && "bg-destructive/15 text-destructive",
        tone === "neutral" && "bg-white/5 text-muted-foreground",
      )}
    >
      {icon}
      {children}
    </span>
  );
}

export function MetricTile({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "neutral" | "success" | "warning";
}) {
  return (
    <div className={cn("rounded-3xl p-5 surface-panel", tone === "success" && "shadow-[0_0_0_1px_rgba(0,255,65,0.15)]", tone === "warning" && "shadow-[0_0_0_1px_rgba(175,141,17,0.18)]")}>
      <p className="terminal-label">{label}</p>
      <p className={cn("mt-4 text-4xl font-black tracking-tighter", tone === "success" && "text-primary", tone === "warning" && "text-secondary")}>{value}</p>
      {hint ? <p className="mt-3 text-sm text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function TerminalLink({ href, children }: PropsWithChildren<{ href: string }>) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 text-sm font-semibold text-foreground/70 transition-all hover:text-primary"
    >
      {children}
      <ArrowRight size={14} />
    </a>
  );
}

export function EmptyPanel({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-3xl surface-panel-deep p-8">
      <p className="terminal-label">Unavailable</p>
      <h3 className="mt-3 text-xl font-bold">{title}</h3>
      <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{body}</p>
    </div>
  );
}
