import { SectionHeading, StatusPill } from "@/components/site/TerminalPrimitives";
import { useApp } from "@/contexts/useApp";
import { Link } from "react-router-dom";

export default function TechnologyPage() {
  const { t } = useApp();
  const stack = [
    { title: "TypeScript", body: t("promoTechStackTypescript"), tone: "success" as const },
    { title: "React 18 + Vite", body: t("promoTechStackReact"), tone: "warning" as const },
    { title: t("promoTechStackShellTitle"), body: t("promoTechStackShellBody"), tone: "neutral" as const },
    { title: "Tailwind CSS", body: t("promoTechStackTailwind"), tone: "neutral" as const },
  ];

  return (
    <div className="space-y-24">
      <section className="space-y-6">
        <p className="section-kicker">{t("technology")}</p>
        <h1 className="max-w-4xl text-fluid-4xl font-black leading-[0.94]">
          {t("promoTechHeroLead")} <span className="text-primary">{t("promoTechHeroAccent")}</span>
        </h1>
        <p className="max-w-3xl text-xl leading-8 text-muted-foreground">
          {t("promoTechHeroBody")}
        </p>
      </section>

      <section className="space-y-8">
        <div className="flex items-end justify-between gap-6">
          <SectionHeading title={t("promoTechStackTitle")} body={t("promoTechStackBody")} />
          <p className="terminal-label">{t("promoCurrent")}</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {stack.map((item) => (
            <article key={item.title} className="rounded-[1.75rem] ops-surface p-6">
              <StatusPill tone={item.tone === "warning" ? "warning" : item.tone === "success" ? "success" : "neutral"}>
                {item.title}
              </StatusPill>
              <h3 className="mt-6 text-xl font-bold">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-10 xl:grid-cols-[0.92fr_1.08fr] xl:items-center">
        <div className="rounded-[2rem] ops-surface-deep p-6">
          <div className="rounded-[1.5rem] ops-surface-soft p-6">
            <div className="mb-6 flex gap-2">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span className="h-2 w-2 rounded-full bg-secondary" />
              <span className="h-2 w-2 rounded-full bg-white/30" />
            </div>
            <div className="grid gap-3">
              {[t("promoFlowStep1"), t("promoFlowStep2"), t("promoFlowStep3"), t("promoFlowStep4")].map((step, index) => (
                <div key={step} className="flex items-center justify-between rounded-2xl bg-black/18 px-4 py-4">
                  <span className="font-semibold">{step}</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">{index + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <SectionHeading
            title={<>{t("promoTechFlowTitle")}<br />{t("promoTechFlowTitleAccent")}</>}
            body={t("promoTechFlowBody")}
          />
          <div className="space-y-6">
            <article>
              <h3 className="text-lg font-bold text-primary">{t("promoTechLocalTokenTitle")}</h3>
              <p className="mt-2 text-base leading-7 text-muted-foreground">{t("promoTechLocalTokenBody")}</p>
            </article>
            <article>
              <h3 className="text-lg font-bold text-secondary">{t("promoTechSnapshotTitle")}</h3>
              <p className="mt-2 text-base leading-7 text-muted-foreground">{t("promoTechSnapshotBody")}</p>
            </article>
            <article>
              <h3 className="text-lg font-bold text-primary">{t("promoTechDeliveryTitle")}</h3>
              <p className="mt-2 text-base leading-7 text-muted-foreground">{t("promoTechDeliveryBody")}</p>
            </article>
          </div>
        </div>
      </section>

      <section className="rounded-[2.5rem] ops-surface-deep px-6 py-20 text-center md:px-10">
        <StatusPill tone="success">{t("promoOpen")}</StatusPill>
        <h2 className="mt-8 text-fluid-3xl font-black tracking-tighter">{t("promoTechClosingTitle")}</h2>
        <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
          {t("promoTechClosingBody")}
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <a href="https://github.com/mafhper/push_" className="button-secondary-terminal">{t("promoCloneRepository")}</a>
          <Link to="/app" className="button-primary-terminal">{t("promoExploreDashboard")}</Link>
        </div>
      </section>
    </div>
  );
}
