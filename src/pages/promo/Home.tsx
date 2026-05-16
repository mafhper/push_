import { Link } from "react-router-dom";
import { useApp } from "@/contexts/useApp";
import { ArrowRight, Github, ShieldAlert, Zap, Clock, Package } from "lucide-react";

export default function HomePage() {
  const { t } = useApp();

  return (
    <div className="max-w-4xl mx-auto py-20 px-6 space-y-24">
      {/* Hero Section */}
      <section className="text-center space-y-6">
        <h1 className="font-headline text-display font-bold tracking-tight text-foreground">
          {t("promoHomeTitleLead")} <span className="text-primary">{t("promoHomeTitleAccent")}</span>
        </h1>
        <p className="text-title text-foreground-muted max-w-2xl mx-auto leading-relaxed">
          {t("promoHomeBody")}
        </p>
        <div className="flex items-center justify-center gap-4 pt-6">
          <Link to="/app" className="flex items-center gap-2 rounded-lg bg-primary px-8 py-3 font-bold text-primary-foreground hover:bg-primary/90 transition-all">
            {t("promoOpenDashboard")} <ArrowRight size={18} />
          </Link>
          <a href="https://github.com/mafhper/push_" className="flex items-center gap-2 rounded-lg border border-border px-8 py-3 font-semibold hover:bg-surface-1 transition-all">
            <Github size={18} /> {t("promoViewRepository")}
          </a>
        </div>
      </section>

      {/* Features Overview */}
      <section className="grid md:grid-cols-3 gap-8">
        <FeatureCard 
          icon={<ShieldAlert size={24} className="text-critical" />}
          title={t("promoHomeFeatureReposTitle")}
          body={t("promoHomeFeatureReposBody")}
        />
        <FeatureCard 
          icon={<Zap size={24} className="text-warning" />}
          title={t("promoHomeFeatureAttentionTitle")}
          body={t("promoHomeFeatureAttentionBody")}
        />
        <FeatureCard 
          icon={<Package size={24} className="text-primary" />}
          title={t("promoHomeFeatureSnapshotTitle")}
          body={t("promoHomeFeatureSnapshotBody")}
        />
      </section>

      {/* Final CTA */}
      <section className="rounded-2xl border border-border bg-surface-1 p-12 text-center space-y-6">
        <h2 className="font-headline text-display font-bold">{t("promoOpenDashboardTitle")}</h2>
        <p className="text-body text-foreground-muted">{t("promoOpenDashboardBody")}</p>
        <Link to="/app" className="inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3 font-bold text-primary-foreground">
          {t("openApp")}
        </Link>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, body }: { icon: React.ReactNode, title: string, body: string }) {
  return (
    <div className="space-y-4">
      <div className="h-12 w-12 rounded-lg bg-surface-2 border border-border flex items-center justify-center">
        {icon}
      </div>
      <h3 className="font-headline text-title font-semibold">{title}</h3>
      <p className="text-body text-foreground-muted leading-relaxed">{body}</p>
    </div>
  );
}
