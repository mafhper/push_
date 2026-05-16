import React from 'react';
import { cn } from '@/lib/utils';

export function SeverityDot({ severity }: { severity: 'critical' | 'warning' | 'success' | 'info' }) {
  return (
    <div className={cn(
      "h-2 w-2 shrink-0 rounded-full",
      severity === 'critical' && "bg-critical",
      severity === 'warning' && "bg-warning",
      severity === 'success' && "bg-success",
      severity === 'info' && "bg-info"
    )} />
  );
}
