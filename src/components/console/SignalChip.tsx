import React from 'react';
import { cn } from '@/lib/utils';

export function SignalChip({ severity, label }: { severity: 'critical' | 'warning' | 'info' | 'success'; label: string }) {
  return (
    <span className={cn(
      "text-micro font-medium whitespace-nowrap",
      severity === 'critical' && "text-critical",
      severity === 'warning' && "text-warning",
      severity === 'info' && "text-foreground-subtle",
      severity === 'success' && "text-success"
    )}>
      {label}
    </span>
  );
}
