import { Link } from "react-router-dom";
import { SectionHeading, StatusPill } from "@/components/site/TerminalPrimitives";

const principles = [
  {
    title: "Public-first",
    body: "Built to publish safely on GitHub Pages.",
  },
  {
    title: "Fast to scan",
    body: "Health, activity and alerts stay easy to read.",
  },
  {
    title: "Built to last",
    body: "Shared shells and typed data keep maintenance predictable.",
  },
];

export default function AboutPage() {
  return (
    <div className="space-y-24">
      <section className="grid gap-10 xl:grid-cols-[1.05fr_0.95fr] xl:items-center">
        <div className="space-y-8">
          <SectionHeading
            kicker="About"
            title={
              <>
                About <span className="text-primary">Push_.</span>
              </>
            }
            body="Push_ is a public dashboard for selected GitHub repositories."
          />
          <div className="flex flex-wrap gap-4">
            <Link to="/app" className="button-primary-terminal">Enter dashboard</Link>
            <a href="https://github.com/mafhper/push_" className="button-secondary-terminal">Visit GitHub</a>
          </div>
        </div>

        <div className="rounded-[2rem] surface-panel-deep p-6">
          <div className="rounded-[1.75rem] border border-white/[0.05] bg-black/20 p-6">
            <p className="terminal-label">Summary</p>
            <div className="mt-6 space-y-5">
              <p className="text-lg font-semibold leading-8 text-foreground/90">
                Promo site and dashboard share one repository and one visual system.
              </p>
              <p className="text-base leading-7 text-muted-foreground">
                The public app reads snapshots. Local development can use a token to choose which public repositories appear.
              </p>
              <StatusPill tone="warning">public dashboard</StatusPill>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        {principles.map((principle, index) => (
          <article key={principle.title} className="rounded-[1.75rem] surface-panel p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">0{index + 1}</p>
            <h2 className="mt-6 text-2xl font-bold">{principle.title}</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">{principle.body}</p>
          </article>
        ))}
      </section>

      <section className="rounded-[2.5rem] surface-panel px-6 py-20 md:px-10">
        <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr] xl:items-start">
          <SectionHeading
            title="What Push_ focuses on"
            body="Clarity, safety, performance and maintainable code."
          />
          <div className="grid gap-4 md:grid-cols-2">
            {[
              ["UI/UX", "Clear hierarchy, readable contrast and stable layouts."],
              ["Code Quality", "Typed contracts and explicit failure states."],
              ["Performance", "Static delivery and route-level splitting."],
              ["Maintainability", "Shared shells and browser-free snapshot generation."],
            ].map(([title, body]) => (
              <div key={title} className="rounded-3xl bg-black/18 p-5">
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
