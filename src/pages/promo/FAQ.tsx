import { Link } from "react-router-dom";
import { SectionHeading, StatusPill } from "@/components/site/TerminalPrimitives";
import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";

const entries = [
  {
    question: "What does the dashboard show?",
    answer:
      "Repository health, recent workflow runs, commits, language mix, contributors and alert status for the public repositories you choose to track.",
  },
  {
    question: "Which repositories can I track?",
    answer:
      "Only public repositories. Private repositories are not listed or published in the dashboard.",
  },
  {
    question: "Is the published dashboard real time?",
    answer:
      "No. The public site is snapshot-based. Data freshness depends on the latest sync and deployment.",
  },
  {
    question: "Can I use my GitHub token on the published site?",
    answer:
      "No. GitHub Pages never asks for a token. Token-based access exists only on localhost during development.",
  },
  {
    question: "Does the app store my token?",
    answer:
      "In local development, the token stays only in tab memory and is cleared on reload or disconnect. It is not published to Pages.",
  },
  {
    question: "What happens if some GitHub data is unavailable?",
    answer:
      "That section is marked as unavailable. The rest of the dashboard keeps working.",
  },
  {
    question: "What are the main limitations?",
    answer:
      "The public site is not real time, tracks only public repositories, and depends on the available GitHub endpoints in the latest snapshot.",
  },
];

export default function FAQPage() {
  return (
    <div className="space-y-24">
      <section className="grid gap-8 xl:grid-cols-[0.22fr_0.78fr_0.82fr] xl:items-start">
        <aside className="rounded-[2rem] surface-panel p-5">
          <p className="terminal-label">FAQ</p>
          <div className="mt-6 space-y-3">
            {["General", "Limits", "Security"].map((item, index) => (
              <div key={item} className={index === 0 ? "text-sm font-semibold text-primary" : "text-sm text-foreground/42"}>
                {item}
              </div>
            ))}
          </div>
        </aside>

        <SectionHeading
          kicker="FAQ"
          title={
            <>
              Dashboard answers.<br />
              <span className="text-primary">Short and direct.</span>
            </>
          }
          body="Capabilities, limitations and security for the public dashboard."
        />

        <div className="rounded-[2rem] surface-panel p-6">
          <p className="terminal-label">At a glance</p>
          <div className="mt-5 grid gap-3">
            {[
              ["public repos", "supported"],
              ["private repos", "blocked"],
              ["pages tokens", "forbidden"],
              ["partial data", "explicit"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-2xl bg-black/18 px-4 py-4">
                <span className="text-sm font-semibold text-foreground/75">{label}</span>
                <StatusPill tone={value === "forbidden" ? "critical" : value === "supported" ? "success" : "warning"}>
                  {value}
                </StatusPill>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[2.5rem] surface-panel-deep px-6 py-8 md:px-8">
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

      <section className="rounded-[2.5rem] surface-panel px-6 py-16 text-center md:px-10">
        <StatusPill tone="success">Next</StatusPill>
        <h2 className="mt-8 text-fluid-3xl font-black tracking-tighter">Open the dashboard.</h2>
        <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
          See the public view or inspect the source repository.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link to="/app" className="button-primary-terminal">Open dashboard</Link>
          <a href="https://github.com/mafhper/push_" className="button-secondary-terminal">Read repository</a>
        </div>
      </section>
    </div>
  );
}
