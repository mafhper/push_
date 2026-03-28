import { Link } from "react-router-dom";
import { SectionHeading, StatusPill } from "@/components/site/TerminalPrimitives";
import { useApp } from "@/contexts/useApp";
import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";

export default function FAQPage() {
  const { t } = useApp();
  const entries = [
    { question: t("promoFaqQuestion1"), answer: t("promoFaqAnswer1") },
    { question: t("promoFaqQuestion2"), answer: t("promoFaqAnswer2") },
    { question: t("promoFaqQuestion3"), answer: t("promoFaqAnswer3") },
    { question: t("promoFaqQuestion4"), answer: t("promoFaqAnswer4") },
    { question: t("promoFaqQuestion5"), answer: t("promoFaqAnswer5") },
    { question: t("promoFaqQuestion6"), answer: t("promoFaqAnswer6") },
    { question: t("promoFaqQuestion7"), answer: t("promoFaqAnswer7") },
  ];

  return (
    <div className="space-y-24">
      <section className="grid gap-8 xl:grid-cols-[0.22fr_0.78fr_0.82fr] xl:items-start">
        <aside className="rounded-[2rem] ops-surface p-5">
          <p className="terminal-label">{t("faq")}</p>
          <div className="mt-6 space-y-3">
            {[t("promoFaqSectionGeneral"), t("promoFaqSectionLimits"), t("security")].map((item, index) => (
              <div key={item} className={index === 0 ? "text-sm font-semibold text-primary" : "text-sm text-foreground/42"}>
                {item}
              </div>
            ))}
          </div>
        </aside>

        <SectionHeading
          kicker={t("faq")}
          title={
            <>
              {t("promoFaqTitleLead")}<br />
              <span className="text-primary">{t("promoFaqTitleAccent")}</span>
            </>
          }
          body={t("promoFaqBody")}
        />

        <div className="rounded-[2rem] ops-surface p-6">
          <p className="terminal-label">{t("promoFaqAtGlance")}</p>
          <div className="mt-5 grid gap-3">
            {[
              [t("promoFaqGlancePublic"), t("promoFaqStateSupported")],
              [t("promoFaqGlancePrivate"), t("promoFaqStateBlocked")],
              [t("promoFaqGlancePagesToken"), t("promoFaqStateForbidden")],
              [t("promoFaqGlancePartial"), t("promoFaqStateExplicit")],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-2xl bg-black/18 px-4 py-4">
                <span className="text-sm font-semibold text-foreground/75">{label}</span>
                <StatusPill tone={value === t("promoFaqStateForbidden") ? "critical" : value === t("promoFaqStateSupported") ? "success" : "warning"}>
                  {value}
                </StatusPill>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[2.5rem] ops-surface-deep px-6 py-8 md:px-8">
        <Accordion.Root type="single" collapsible className="space-y-3">
          {entries.map((entry, index) => (
            <Accordion.Item
              key={entry.question}
              value={`item-${index}`}
              className="overflow-hidden rounded-[1.75rem] bg-black/16"
            >
              <Accordion.Header>
                <Accordion.Trigger className="group flex w-full items-center justify-between gap-4 px-5 py-5 text-left">
                  <span className="text-lg font-bold leading-7 text-foreground">{entry.question}</span>
                  <ChevronDown className="shrink-0 text-primary transition-transform duration-200 group-data-[state=open]:rotate-180" size={18} />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="px-5 pb-5 text-base leading-7 text-muted-foreground">
                {entry.answer}
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </section>

      <section className="rounded-[2.5rem] ops-surface px-6 py-16 text-center md:px-10">
        <StatusPill tone="success">{t("promoNext")}</StatusPill>
        <h2 className="mt-8 text-fluid-3xl font-black tracking-tighter">{t("promoOpenDashboardTitle")}</h2>
        <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
          {t("promoFaqClosingBody")}
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link to="/app" className="button-primary-terminal">{t("promoOpenDashboard")}</Link>
          <a href="https://github.com/mafhper/push_" className="button-secondary-terminal">{t("promoReadRepository")}</a>
        </div>
      </section>
    </div>
  );
}
