import React from 'react';
import { ScoredRepo } from '@/lib/attention';
import { SeverityDot } from './SeverityDot';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface GlobalDashboardProps {
  repos: ScoredRepo[];
}

export function GlobalDashboard({ repos }: GlobalDashboardProps) {
  const totalRepos = repos.length;
  const criticalRepos = repos.filter(r => r.attentionScore >= 100).length;
  const warningRepos = repos.filter(r => r.attentionScore >= 40 && r.attentionScore < 100).length;
  const healthyRepos = totalRepos - (criticalRepos + warningRepos);

  return (
    <div className="p-8 space-y-8">
      <header>
        <h1 className="text-display font-bold text-foreground">Fleet Overview</h1>
        <p className="text-body text-foreground-subtle mt-2">Operational health summary of all monitored repositories.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard label="Total Monitored" value={totalRepos} />
        <MetricCard label="Critical Issues" value={criticalRepos} severity="critical" />
        <MetricCard label="Pending Review" value={warningRepos} severity="warning" />
        <MetricCard label="Healthy" value={healthyRepos} severity="success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-surface-2 border-border">
          <CardHeader>
            <CardTitle className="text-title">Most Critical Repos</CardTitle>
          </CardHeader>
          <CardContent>
            {repos.filter(r => r.attentionScore >= 100).slice(0, 5).map(repo => (
              <div key={repo.repo.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <span className="text-body">{repo.repo.fullName}</span>
                <span className="text-micro font-mono text-critical">{repo.attentionScore}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ label, value, severity }: { label: string; value: number, severity?: 'critical' | 'warning' | 'success' }) {
  return (
    <Card className="bg-surface-2 border-border p-6">
      <div className="flex items-center gap-2 mb-4">
        {severity && <SeverityDot severity={severity} />}
        <span className="text-micro font-bold uppercase tracking-widest text-foreground-subtle">{label}</span>
      </div>
      <span className="text-display font-mono">{value}</span>
    </Card>
  );
}
