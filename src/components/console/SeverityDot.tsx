import React from 'react';
import { cn } from '@/lib/utils';

export function SeverityDot({ severity }: { severity: 'critical' | 'warning' | 'success' | 'info' }) {
  return (
    <div className={cn(
      "h-2.5 w-2.5 shrink-0 rounded-full border border-current",
      severity === 'critical' && "bg-critical shadow-[0_0_8px_rgba(239,68,68,0.4)]",
      severity === 'warning' && "bg-warning",
      severity === 'success' && "bg-success",
      severity === 'info' && "bg-info"
    )} />
  );
}
