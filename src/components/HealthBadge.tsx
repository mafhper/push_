import { Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface HealthBadgeProps {
  status: 'healthy' | 'warning' | 'critical';
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export function HealthBadge({ status, score, size = 'md' }: HealthBadgeProps) {
  const config = {
    healthy: {
      icon: CheckCircle2,
      className: 'bg-success/10 text-success border-success/20',
    },
    warning: {
      icon: AlertTriangle,
      className: 'bg-warning/10 text-warning border-warning/20',
    },
    critical: {
      icon: Shield,
      className: 'bg-critical/10 text-critical border-critical/20 animate-pulse-critical',
    },
  };
  const labels = {
    healthy: 'Healthy',
    warning: 'Warning',
    critical: 'Critical',
  };

  const { icon: Icon, className } = config[status];
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-2.5 py-1 gap-1.5',
    lg: 'text-base px-3 py-1.5 gap-2',
  };
  const iconSizes = { sm: 12, md: 14, lg: 16 };

  return (
    <span
      aria-label={`${labels[status]} health score ${score}`}
      title={`${labels[status]} health score ${score}`}
      className={`inline-flex items-center rounded-full border font-medium transition-theme ${className} ${sizeClasses[size]}`}
    >
      <Icon size={iconSizes[size]} strokeWidth={1.5} />
      {size === 'lg' ? <span className="text-xs font-bold uppercase tracking-wider">{labels[status]}</span> : <span className="sr-only">{labels[status]}</span>}
      {score}
    </span>
  );
}
