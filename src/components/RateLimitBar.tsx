import { useApp } from '@/contexts/useApp';
import { useRateLimit } from '@/hooks/useGitHub';
import { Activity } from 'lucide-react';

export function RateLimitBar() {
  const { t } = useApp();
  const { data: rateLimit } = useRateLimit();

  if (!rateLimit) return null;

  const pct = (rateLimit.remaining / rateLimit.limit) * 100;
  let colorClass = 'bg-success';
  if (pct < 20) colorClass = 'bg-critical';
  else if (pct < 50) colorClass = 'bg-warning';

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Activity size={12} strokeWidth={1.5} />
      <div className="flex items-center gap-1.5">
        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-secondary">
          <div
            className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="tabular-nums font-medium">{rateLimit.remaining}/{rateLimit.limit}</span>
      </div>
    </div>
  );
}
