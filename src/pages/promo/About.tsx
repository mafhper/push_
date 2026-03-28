import { Link } from "react-router-dom";
import { SectionHeading, StatusPill } from "@/components/site/TerminalPrimitives";
import { useApp } from "@/contexts/useApp";

export default function AboutPage() {
  const { t } = useApp();
  const principles = [
    { title: t("promoAboutPrinciplePublicTitle"), body: t("promoAboutPrinciplePublicBody") },
    { title: t("promoAboutPrincipleScanTitle"), body: t("promoAboutPrincipleScanBody") },
    { title: t("promoAboutPrincipleLastTitle"), body: t("promoAboutPrincipleLastBody") },
  ];

  return (
    <div className="space-y-24">
      <section className="grid gap-10 xl:grid-cols-[1.05fr_0.95fr] xl:items-center">
        <div className="space-y-8">
          <SectionHeading
            kicker={t("about")}
            title={
              <>
                {t("promoAboutTitle")} <span className="text-primary">Push_.</span>
              </>
            }
            body={t("promoAboutBody")}
          />
          <div className="flex flex-wrap gap-4">
            <Link to="/app" className="button-primary-terminal">{t("promoEnterDashboard")}</Link>
            <a href="https://github.com/mafhper/push_" className="button-secondary-terminal">{t("promoVisitGitHub")}</a>
          </div>
        </div>

        <div className="rounded-[2rem] ops-surface-deep p-6">
          <div className="rounded-[1.75rem] ops-surface-soft p-6">
            <p className="terminal-label">{t("summary")}</p>
            <div className="mt-6 space-y-5">
              <p className="text-lg font-semibold leading-8 text-foreground/90">{t("promoAboutSummaryLead")}</p>
              <p className="text-base leading-7 text-muted-foreground">{t("promoAboutSummaryBody")}</p>
              <StatusPill tone="warning">{t("promoPublicDashboard")}</StatusPill>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        {principles.map((principle, index) => (
          <article key={principle.title} className="rounded-[1.75rem] ops-surface p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">0{index + 1}</p>
            <h2 className="mt-6 text-2xl font-bold">{principle.title}</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">{principle.body}</p>
          </article>
        ))}
      </section>

      <section className="rounded-[2.5rem] ops-surface px-6 py-20 md:px-10">
        <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr] xl:items-start">
          <SectionHeading
            title={t("promoAboutFocusTitle")}
            body={t("promoAboutFocusBody")}
          />
          <div className="grid gap-4 md:grid-cols-2">
            {[
              [t("promoAboutCardUiTitle"), t("promoAboutCardUiBody")],
              [t("promoAboutCardQualityTitle"), t("promoAboutCardQualityBody")],
              [t("promoAboutCardPerformanceTitle"), t("promoAboutCardPerformanceBody")],
              [t("promoAboutCardMaintainabilityTitle"), t("promoAboutCardMaintainabilityBody")],
            ].map(([title, body]) => (
              <div key={title} className="rounded-3xl ops-surface-deep p-5">
                <h3 className="text-lg font-bold">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
