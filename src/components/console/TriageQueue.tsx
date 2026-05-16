import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ScoredRepo } from '@/lib/attention';
import { SeverityDot } from './SeverityDot';
import { SignalChip } from './SignalChip';

interface TriageQueueProps {
  repos: ScoredRepo[];
  selectedRepoId?: string;
}

export function TriageQueue({ repos, selectedRepoId }: TriageQueueProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = searchParams.get('filter') || 'all';

  const filteredRepos = repos.filter(repo => {
    if (filter === 'all') return true;
    if (filter === 'critical') return repo.attentionScore >= 100;
    if (filter === 'warning') return repo.attentionScore >= 40 && repo.attentionScore < 100;
    if (filter === 'healthy') return repo.attentionScore < 40;
    if (filter === 'archived') return repo.repo.archived;
    return true;
  });

  return (
    <div className="flex flex-col h-full border-r border-border bg-background w-[64%]">
      <div className="flex shrink-0 items-center gap-2 p-3 border-b border-border">
         <FilterButton label="All" value="all" active={filter === 'all'} onClick={() => setSearchParams({ filter: 'all' })} />
         <FilterButton label="Critical" value="critical" active={filter === 'critical'} onClick={() => setSearchParams({ filter: 'critical' })} />
         <FilterButton label="Warning" value="warning" active={filter === 'warning'} onClick={() => setSearchParams({ filter: 'warning' })} />
         <FilterButton label="Healthy" value="healthy" active={filter === 'healthy'} onClick={() => setSearchParams({ filter: 'healthy' })} />
         <FilterButton label="Archived" value="archived" active={filter === 'archived'} onClick={() => setSearchParams({ filter: 'archived' })} />
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {filteredRepos.length > 0 ? (
          <div className="grid">
            {filteredRepos.map(repo => (
              <TriageRow 
                key={repo.repo.id} 
                repo={repo} 
                selected={selectedRepoId === repo.repo.id.toString()} 
                onClick={() => setSearchParams({ repo: repo.repo.id.toString(), filter })}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-micro text-foreground-subtle uppercase tracking-widest italic">
             0 repositories needing attention · all clear
          </div>
        )}
      </div>
    </div>
  );
}

function FilterButton({ label, active, onClick }: { label: string; value: string; active: boolean; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "px-2 py-0.5 text-micro font-medium rounded transition-colors",
        active ? "bg-primary/10 text-primary" : "text-foreground-subtle hover:bg-surface-1 hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}

function TriageRow({ repo, selected, onClick }: { repo: ScoredRepo; selected: boolean; onClick: () => void }) {
  const mainSignals = repo.signals.slice(0, 3);
  const severity: 'critical' | 'warning' | 'success' = repo.attentionScore >= 100 ? 'critical' : repo.attentionScore >= 40 ? 'warning' : 'success';

  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex h-14 items-center gap-3 px-4 border-b border-border text-left transition-colors",
        selected ? "bg-surface-3 border-l-2 border-l-primary" : "hover:bg-surface-1 border-l-2 border-l-transparent"
      )}
    >
      <SeverityDot severity={severity} />
      
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center gap-2">
           <span className="text-body font-medium text-foreground truncate">{repo.repo.fullName}</span>
           <span className="text-micro font-mono text-foreground-subtle">{repo.attentionScore}</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-hidden">
           {mainSignals.map((sig, i) => (
             <React.Fragment key={sig.label}>
                <SignalChip severity={sig.severity} label={sig.label} />
                {i < mainSignals.length - 1 && <span className="text-micro text-foreground-subtle opacity-40">·</span>}
             </React.Fragment>
           ))}
        </div>
      </div>

      <div className="text-micro text-foreground-subtle font-medium uppercase tabular-nums">
        {repo.health.stalenessDays > 0 ? `${repo.health.stalenessDays}d` : 'fresh'}
      </div>
    </button>
  );
}
