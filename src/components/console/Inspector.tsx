import React from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { ExternalLink, ShieldAlert, PlayCircle, Package, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScoredRepo } from '@/lib/attention';
import { SeverityDot } from './SeverityDot';

interface InspectorProps {
  repo: ScoredRepo | null;
}

export function Inspector({ repo }: InspectorProps) {
  if (!repo) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-surface-2 p-8 text-center">
        <Activity size={32} className="text-foreground-subtle opacity-20" />
        <p className="mt-4 text-micro font-medium uppercase tracking-widest text-foreground-subtle">
           Select a repository to inspect
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-surface-2 overflow-hidden">
      <header className="flex flex-col gap-4 p-6 border-b border-border">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
             <div className="flex items-center gap-2">
                <SeverityDot severity={repo.attentionScore >= 100 ? 'critical' : repo.attentionScore >= 40 ? 'warning' : 'success'} />
                <h2 className="text-title font-semibold tracking-tight">{repo.repo.fullName}</h2>
             </div>
             <p className="text-body text-foreground-subtle line-clamp-2">{repo.repo.description || 'No description provided.'}</p>
          </div>
          <a 
            href={`https://github.com/${repo.repo.fullName}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-micro font-bold text-primary hover:text-primary/80 transition-colors uppercase tracking-wider"
          >
            Open on GitHub <ExternalLink size={12} />
          </a>
        </div>

        <div className="flex items-center gap-6">
           <div className="flex flex-col">
              <span className="text-micro font-bold uppercase tracking-widest text-foreground-subtle">Score</span>
              <span className="text-display font-mono leading-none mt-1">{repo.attentionScore}</span>
           </div>
           <div className="h-8 w-px bg-border" />
           <div className="flex flex-col">
              <span className="text-micro font-bold uppercase tracking-widest text-foreground-subtle">Stale</span>
              <span className="text-display font-mono leading-none mt-1">{repo.health.stalenessDays}d</span>
           </div>
        </div>
      </header>

      <Tabs.Root defaultValue="overview" className="flex flex-1 flex-col overflow-hidden">
        <Tabs.List className="flex shrink-0 border-b border-border px-6">
          <TabTrigger value="overview" label="Overview" />
          <TabTrigger value="alerts" label="Alerts" count={repo.health.dependabotOpenCount} />
          <TabTrigger value="workflows" label="Workflows" />
          <TabTrigger value="dependencies" label="Dependencies" />
        </Tabs.List>

        <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
          <Tabs.Content value="overview" className="space-y-8 outline-none">
             <section className="space-y-4">
                <h3 className="text-micro font-bold uppercase tracking-widest text-foreground-subtle">Recent Signals</h3>
                <div className="grid gap-3">
                   {repo.signals.map((sig) => (
                     <div key={sig.label} className="flex items-start gap-3 p-3 rounded border border-border bg-surface-1">
                        <div className="mt-1">
                           {sig.kind === 'security' && <ShieldAlert size={16} className={cn(sig.severity === 'critical' ? "text-critical" : "text-warning")} />}
                           {sig.kind === 'workflow' && <PlayCircle size={16} className="text-critical" />}
                           {sig.kind === 'stale' && <Clock size={16} className="text-foreground-subtle" />}
                           {sig.kind === 'pr' && <Package size={16} className="text-primary" />}
                        </div>
                        <div className="flex flex-col gap-0.5">
                           <span className="text-body font-semibold">{sig.label}</span>
                           <span className="text-micro text-foreground-subtle uppercase tracking-wider">Detected signal via {sig.kind} scanner</span>
                        </div>
                     </div>
                   ))}
                </div>
             </section>
          </Tabs.Content>
          <Tabs.Content value="alerts" className="outline-none">
             <p className="text-body text-foreground-subtle italic">Security alerts details would go here...</p>
          </Tabs.Content>
          <Tabs.Content value="workflows" className="outline-none">
             <p className="text-body text-foreground-subtle italic">Workflow history would go here...</p>
          </Tabs.Content>
          <Tabs.Content value="dependencies" className="outline-none">
             <p className="text-body text-foreground-subtle italic">Dependency activity would go here...</p>
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  );
}

function TabTrigger({ value, label, count }: { value: string; label: string; count?: number }) {
  return (
    <Tabs.Trigger
      value={value}
      className={cn(
        "relative flex h-10 items-center gap-2 px-3 text-micro font-bold uppercase tracking-widest transition-colors outline-none",
        "text-foreground-subtle hover:text-foreground",
        "data-[state=active]:text-primary data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:h-0.5 data-[state=active]:after:w-full data-[state=active]:after:bg-primary"
      )}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className="rounded-full bg-surface-3 px-1.5 py-0.5 text-[9px] leading-none text-foreground-subtle">
           {count}
        </span>
      )}
    </Tabs.Trigger>
  );
}

function Clock({ size, className }: { size: number; className?: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
