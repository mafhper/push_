import React from 'react';
import { CircleCheck, Info, OctagonAlert, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

const severityConfig = {
  critical: {
    label: 'Critical',
    icon: OctagonAlert,
    className: 'border-critical/45 bg-critical/10 text-critical shadow-[0_0_8px_rgba(239,68,68,0.25)]',
  },
  warning: {
    label: 'Warning',
    icon: TriangleAlert,
    className: 'border-warning/45 bg-warning/10 text-warning',
  },
  success: {
    label: 'Healthy',
    icon: CircleCheck,
    className: 'border-success/40 bg-success/10 text-success',
  },
  info: {
    label: 'Info',
    icon: Info,
    className: 'border-info/40 bg-info/10 text-info',
  },
} as const;

export function SeverityDot({
  severity,
  label,
  showLabel = false,
}: {
  severity: 'critical' | 'warning' | 'success' | 'info';
  label?: string;
  showLabel?: boolean;
}) {
  const config = severityConfig[severity];
  const Icon = config.icon;
  const statusLabel = label ?? config.label;

  return (
    <span
      aria-label={statusLabel}
      title={statusLabel}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border font-semibold leading-none",
        showLabel ? "px-1.5 py-1 text-[10px]" : "h-5 w-5",
        config.className
      )}
    >
      <Icon size={12} strokeWidth={2} aria-hidden="true" />
      {showLabel ? <span>{statusLabel}</span> : <span className="sr-only">{statusLabel}</span>}
    </span>
  );
}
