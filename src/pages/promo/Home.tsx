import { Link } from "react-router-dom";
import { SectionHeading, StatusPill } from "@/components/site/TerminalPrimitives";
import { useApp } from "@/contexts/useApp";
import { ArrowRight, Github } from "lucide-react";

export default function HomePage() {
  const { t } = useApp();
  const featureCards = [
    { title: t("promoHomeFeatureReposTitle"), body: t("promoHomeFeatureReposBody"), tone: "success" as const, tag: t("promoStateReady") },
    { title: t("promoHomeFeatureSnapshotTitle"), body: t("promoHomeFeatureSnapshotBody"), tone: "warning" as const, tag: t("warning") },
    { title: t("promoHomeFeatureAttentionTitle"), body: t("promoHomeFeatureAttentionBody"), tone: "neutral" as const, tag: t("promoStateBase") },
    { title: t("promoHomeFeatureShellTitle"), body: t("promoHomeFeatureShellBody"), tone: "success" as const, tag: t("promoStateReady") },
  ];

  return (
    <div className="space-y-24">
      <section className="hero-glow relative grid gap-12 pt-10 xl:grid-cols-[0.96fr_1.04fr] xl:items-center">
        <div className="space-y-10 xl:pb-10">
          <SectionHeading
            kicker={t("promoHomeKicker")}
            title={
              <>
                <span className="text-foreground">{t("promoHomeTitleLead")}</span>
                <br />
                {t("promoHomeTitleMiddle")} <span className="text-primary">{t("promoHomeTitleAccent")}</span>
              </>
            }
            body={t("promoHomeBody")}
          />

          <div className="flex flex-wrap gap-4">
            <Link to="/app" className="button-primary-terminal">
              {t("promoOpenDashboard")}
              <ArrowRight size={16} />
            </Link>
            <a href="https://github.com/mafhper/push_" className="button-secondary-terminal">
              {t("promoViewRepository")}
            </a>
          </div>
        </div>

        <div className="rounded-[2.4rem] ops-surface p-5 shadow-[0_0_32px_rgba(0,0,0,0.22)]">
          <div className="rounded-[1.8rem] ops-surface-deep p-4 md:p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="terminal-label">{t("promoPreviewQueue")}</p>
              <StatusPill tone="success">{t("promoSnapshotLive")}</StatusPill>
            </div>

            <div className="grid gap-4 md:grid-cols-[1.08fr_0.92fr]">
              <div className="rounded-[1.6rem] ops-surface-soft p-5 md:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="terminal-label">{t("promoFeaturedRepo")}</p>
                    <p className="mt-3 text-3xl font-black tracking-tight text-foreground">push_</p>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{t("promoFeaturedRepoBody")}</p>
                  </div>
                  <div className="rounded-[1.2rem] bg-primary/[0.08] px-4 py-3">
                    <p className="terminal-label text-primary">{t("health")}</p>
                    <p className="mt-2 text-2xl font-black text-primary">97%</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {[
                    [t("openAlertsLabel"), "0"],
                    [t("workflow"), t("passing")],
                    [t("staleDays"), "2"],
                    [t("lastPushLabel"), "4h"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-[1.15rem] bg-white/[0.03] px-4 py-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
                      <p className="terminal-label">{label}</p>
                      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.6rem] ops-surface-soft p-5 md:p-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="terminal-label">{t("promoWatchlist")}</p>
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">{t("promoWatchlistHint")}</span>
                </div>

                <div className="mt-4 space-y-2.5">
                  {[
                    ["#01", "push_", t("stable")],
                    ["#02", "imaginizim", t("watchClosely")],
                    ["#03", "spread", t("snapshotLabel")],
                    ["#04", "mafhper.github.io", t("noUrgentSignal")],
                  ].map(([rank, name, state]) => (
                    <div key={name} className="flex items-center justify-between gap-3 rounded-[1.15rem] bg-white/[0.03] px-4 py-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/34">{rank}</p>
                        <p className="mt-1 text-sm font-semibold text-foreground">{name}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{state}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {featureCards.map((card) => (
          <article key={card.title} className="rounded-[1.9rem] ops-surface p-6">
            <div className="mb-5 flex items-center justify-between">
              <StatusPill tone={card.tone === "warning" ? "warning" : card.tone === "success" ? "success" : "neutral"}>
                {card.tag}
              </StatusPill>
              <Github size={16} className="text-foreground/30" />
            </div>
            <h3 className="text-xl font-bold">{card.title}</h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{card.body}</p>
          </article>
        ))}
      </section>

      <section className="space-y-10 rounded-[2.7rem] surface-panel-deep px-6 py-20 md:px-10">
        <SectionHeading
          align="center"
          title={t("promoHomeSurfaceTitle")}
          body={t("promoHomeSurfaceBody")}
        />

        <div className="mx-auto max-w-5xl rounded-[2rem] surface-panel p-5 shadow-[0_0_32px_rgba(0,0,0,0.22)]">
          <div className="rounded-[1.5rem] bg-black/18 p-5">
            <div className="mb-5 flex items-center justify-between">
              <p className="terminal-label">{t("promoDiagnosticsLabel")}</p>
              <StatusPill tone="success">{t("promoPublicDataset")}</StatusPill>
            </div>
            <div className="overflow-hidden rounded-[1.25rem] surface-panel-deep">
              <table className="w-full text-left">
                <thead className="bg-white/[0.02] font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/55">
                  <tr>
                    <th className="px-4 py-4 font-medium">{t("repos")}</th>
                    <th className="px-4 py-4 font-medium">{t("status")}</th>
                    <th className="px-4 py-4 font-medium">{t("mode")}</th>
                    <th className="px-4 py-4 font-medium">{t("securitySurface")}</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {[
                    ["push_", t("healthy"), t("publicPagesRuntime"), t("clean")],
                    ["imaginizim", t("tracked"), t("promoLocalSync"), t("promoRichData")],
                    ["spread", t("snapshotLabel"), t("publicPagesRuntime"), t("promoSafeRead")],
                  ].map((row) => (
                    <tr key={row[0]} className="border-t border-white/[0.03]">
                      {row.map((cell) => <td key={cell} className="px-4 py-4 text-foreground/70">{cell}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-8 py-14 text-center">
        <SectionHeading
          align="center"
          title={t("promoOpenDashboardTitle")}
          body={t("promoOpenDashboardBody")}
        />
        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/app" className="button-primary-terminal">{t("openApp")}</Link>
          <a href="https://github.com/mafhper/push_" className="button-secondary-terminal">{t("viewOnGitHub")}</a>
        </div>
      </section>
    </div>
  );
}
