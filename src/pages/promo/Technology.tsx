import { SectionHeading, StatusPill } from "@/components/site/TerminalPrimitives";
import { Link } from "react-router-dom";

const stack = [
  { title: "TypeScript", body: "Typed routes, snapshot data and safer UI changes.", tone: "success" },
  { title: "React 18 + Vite", body: "Fast local iteration and static output for Pages.", tone: "warning" },
  { title: "Shared Shell", body: "Promo site and dashboard reuse the same visual system.", tone: "neutral" },
  { title: "Tailwind CSS", body: "Design tokens stay consistent across both surfaces.", tone: "neutral" },
];

export default function TechnologyPage() {
  return (
    <div className="space-y-24">
      <section className="space-y-6">
        <p className="section-kicker">Technology</p>
        <h1 className="max-w-4xl text-fluid-4xl font-black leading-[0.94]">
          Built for <span className="text-primary">GitHub Pages.</span>
        </h1>
        <p className="max-w-3xl text-xl leading-8 text-muted-foreground">
          A small stack for a fast promo site and a stable public dashboard.
        </p>
      </section>

      <section className="space-y-8">
        <div className="flex items-end justify-between gap-6">
          <SectionHeading title="The Stack" body="Simple choices. Clear separation between local sync and public runtime." />
          <p className="terminal-label">current</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {stack.map((item) => (
            <article key={item.title} className="rounded-[1.75rem] surface-panel p-6">
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
        <div className="rounded-[2rem] surface-panel-deep p-6">
          <div className="rounded-[1.5rem] border border-primary/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] p-6">
            <div className="mb-6 flex gap-2">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span className="h-2 w-2 rounded-full bg-secondary" />
              <span className="h-2 w-2 rounded-full bg-white/30" />
            </div>
            <div className="grid gap-3">
              {["local .env token", "node sync command", "static snapshots", "pages runtime"].map((step, index) => (
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
            title={<>Flow:<br />Local sync to public view</>}
            body="Local sync collects data. The published site reads static snapshots."
          />
          <div className="space-y-6">
            <article>
              <h3 className="text-lg font-bold text-primary">Local token</h3>
              <p className="mt-2 text-base leading-7 text-muted-foreground">Used only on localhost or during snapshot generation.</p>
            </article>
            <article>
              <h3 className="text-lg font-bold text-secondary">Static snapshot</h3>
              <p className="mt-2 text-base leading-7 text-muted-foreground">Pages serves JSON and UI only. No browser token flow.</p>
            </article>
            <article>
              <h3 className="text-lg font-bold text-primary">Public-first delivery</h3>
              <p className="mt-2 text-base leading-7 text-muted-foreground">Deep links work, and privileged data degrades cleanly when unavailable.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="rounded-[2.5rem] surface-panel-deep px-6 py-20 text-center md:px-10">
        <StatusPill tone="success">OPEN</StatusPill>
        <h2 className="mt-8 text-fluid-3xl font-black tracking-tighter">Open source stack</h2>
        <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">
          Everything runs from one repository: promo site at `/` and dashboard at `/app`.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <a href="https://github.com/mafhper/push_" className="button-secondary-terminal">Clone Repository</a>
          <Link to="/app" className="button-primary-terminal">Explore Dashboard</Link>
        </div>
      </section>
    </div>
  );
}
